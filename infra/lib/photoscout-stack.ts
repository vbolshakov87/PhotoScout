import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';

export class PhotoScoutStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============ DynamoDB Tables ============

    // Messages Table
    const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
      tableName: 'photoscout-messages',
      partitionKey: { name: 'visitorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    messagesTable.addGlobalSecondaryIndex({
      indexName: 'conversationId-index',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // Conversations Table
    const conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
      tableName: 'photoscout-conversations',
      partitionKey: { name: 'visitorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Plans Table
    const plansTable = new dynamodb.Table(this, 'PlansTable', {
      tableName: 'photoscout-plans',
      partitionKey: { name: 'visitorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'planId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    plansTable.addGlobalSecondaryIndex({
      indexName: 'conversationId-index',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    // ============ SSM Parameter ============

    const apiKeyParameterName = '/photoscout/anthropic-api-key';

    // ============ Lambda Functions ============

    const lambdaEnvironment = {
      MESSAGES_TABLE: messagesTable.tableName,
      CONVERSATIONS_TABLE: conversationsTable.tableName,
      PLANS_TABLE: plansTable.tableName,
      ANTHROPIC_API_KEY_PARAMETER: apiKeyParameterName,
    };

    // Chat Function (streaming)
    const chatFunction = new lambda.Function(this, 'ChatFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'chat.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      environment: lambdaEnvironment,
    });

    // Conversations Function
    const conversationsFunction = new lambda.Function(this, 'ConversationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'conversations.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
    });

    // Plans Function
    const plansFunction = new lambda.Function(this, 'PlansFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'plans.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
    });

    // Grant permissions
    messagesTable.grantReadWriteData(chatFunction);
    conversationsTable.grantReadWriteData(chatFunction);
    plansTable.grantReadWriteData(chatFunction);

    messagesTable.grantReadData(conversationsFunction);
    conversationsTable.grantReadWriteData(conversationsFunction);

    plansTable.grantReadWriteData(plansFunction);

    // Grant SSM read permissions to chat function (needs API key)
    chatFunction.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter${apiKeyParameterName}`
      ],
    }));

    // Function URLs
    const chatFunctionUrl = chatFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type'],
      },
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const conversationsFunctionUrl = conversationsFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.DELETE],
        allowedHeaders: ['Content-Type'],
      },
    });

    const plansFunctionUrl = plansFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.DELETE],
        allowedHeaders: ['Content-Type'],
      },
    });

    // ============ S3 + CloudFront ============

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `photoscout-web-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        '/api/chat': {
          origin: new origins.FunctionUrlOrigin(chatFunctionUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/api/conversations*': {
          origin: new origins.FunctionUrlOrigin(conversationsFunctionUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/api/plans*': {
          origin: new origins.FunctionUrlOrigin(plansFunctionUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../packages/web/dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ============ Outputs ============

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront URL',
    });

    new cdk.CfnOutput(this, 'ChatApiUrl', {
      value: chatFunctionUrl.url,
      description: 'Chat Lambda Function URL',
    });

    new cdk.CfnOutput(this, 'ConversationsApiUrl', {
      value: conversationsFunctionUrl.url,
      description: 'Conversations Lambda Function URL',
    });

    new cdk.CfnOutput(this, 'PlansApiUrl', {
      value: plansFunctionUrl.url,
      description: 'Plans Lambda Function URL',
    });
  }
}
