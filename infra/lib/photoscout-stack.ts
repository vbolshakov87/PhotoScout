import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

    // Users Table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'photoscout-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // Cache Table - for caching generated trip plans
    const cacheTable = new dynamodb.Table(this, 'CacheTable', {
      tableName: 'photoscout-cache',
      partitionKey: { name: 'cacheKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Destinations Table - for destination images from Unsplash
    const destinationsTable = new dynamodb.Table(this, 'DestinationsTable', {
      tableName: 'photoscout-destinations',
      partitionKey: { name: 'destinationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============ S3 Buckets ============

    // S3 Bucket for HTML Plans
    const htmlPlansBucket = new s3.Bucket(this, 'HtmlPlansBucket', {
      bucketName: `photoscout-plans-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['Content-Type', 'Content-Length', 'ETag'],
        },
      ],
    });

    // S3 Bucket for Destination Images (from Unsplash)
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `photoscout-images-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ============ Lambda Functions ============

    // Get API keys from environment variables
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required. Please set it in .env file'
      );
    }

    // Optional: DeepSeek API key for development
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    // Google OAuth Client ID (for token validation)
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    // Admin API key (for protected admin endpoints)
    const adminApiKey = process.env.ADMIN_API_KEY;
    // Unsplash API key for destination images
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    const environment = process.env.ENVIRONMENT || 'production';

    // Custom domain for CloudFront distribution
    const cloudfrontDomain = 'aiscout.photo';

    // ============ Separate Lambda Environments (Principle of Least Privilege) ============

    // Chat Lambda: needs LLM API keys, all tables for conversation flow
    const chatEnvironment: { [key: string]: string } = {
      MESSAGES_TABLE: messagesTable.tableName,
      CONVERSATIONS_TABLE: conversationsTable.tableName,
      PLANS_TABLE: plansTable.tableName,
      USERS_TABLE: usersTable.tableName,
      CACHE_TABLE: cacheTable.tableName,
      HTML_PLANS_BUCKET: htmlPlansBucket.bucketName,
      ANTHROPIC_API_KEY: anthropicApiKey,
      CLOUDFRONT_DOMAIN: cloudfrontDomain,
      ENVIRONMENT: environment,
    };
    if (deepseekApiKey) chatEnvironment.DEEPSEEK_API_KEY = deepseekApiKey;
    if (googleClientId) chatEnvironment.GOOGLE_CLIENT_ID = googleClientId;
    if (adminApiKey) chatEnvironment.ADMIN_API_KEY = adminApiKey;

    // Conversations Lambda: only needs conversation-related tables
    const conversationsEnvironment: { [key: string]: string } = {
      MESSAGES_TABLE: messagesTable.tableName,
      CONVERSATIONS_TABLE: conversationsTable.tableName,
      USERS_TABLE: usersTable.tableName,
      ENVIRONMENT: environment,
    };
    if (googleClientId) conversationsEnvironment.GOOGLE_CLIENT_ID = googleClientId;

    // Plans Lambda: only needs plans table and HTML bucket
    const plansEnvironment: { [key: string]: string } = {
      PLANS_TABLE: plansTable.tableName,
      HTML_PLANS_BUCKET: htmlPlansBucket.bucketName,
      USERS_TABLE: usersTable.tableName,
      CLOUDFRONT_DOMAIN: cloudfrontDomain,
      ENVIRONMENT: environment,
    };
    if (googleClientId) plansEnvironment.GOOGLE_CLIENT_ID = googleClientId;

    // Destinations Lambda: only needs image provider keys and destinations table
    const destinationsEnvironment: { [key: string]: string } = {
      DESTINATIONS_TABLE: destinationsTable.tableName,
      IMAGES_BUCKET: imagesBucket.bucketName,
      CLOUDFRONT_DOMAIN: cloudfrontDomain,
      ENVIRONMENT: environment,
    };
    if (unsplashAccessKey) destinationsEnvironment.UNSPLASH_ACCESS_KEY = unsplashAccessKey;

    // Chat Function (streaming) - needs LLM API keys
    const chatFunction = new lambda.Function(this, 'ChatFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'chat.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      environment: chatEnvironment,
    });

    // Conversations Function - read-only, no API keys needed
    const conversationsFunction = new lambda.Function(this, 'ConversationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'conversations.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: conversationsEnvironment,
    });

    // Plans Function - read-only, no API keys needed
    const plansFunction = new lambda.Function(this, 'PlansFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'plans.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: plansEnvironment,
    });

    // Destinations Function - only needs image provider keys
    const destinationsFunction = new lambda.Function(this, 'DestinationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'destinations.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: destinationsEnvironment,
    });

    // Grant permissions
    messagesTable.grantReadWriteData(chatFunction);
    conversationsTable.grantReadWriteData(chatFunction);
    plansTable.grantReadWriteData(chatFunction);
    usersTable.grantReadWriteData(chatFunction);
    cacheTable.grantReadWriteData(chatFunction);
    htmlPlansBucket.grantReadWrite(chatFunction);

    messagesTable.grantReadData(conversationsFunction);
    conversationsTable.grantReadWriteData(conversationsFunction);
    usersTable.grantReadData(conversationsFunction);

    plansTable.grantReadWriteData(plansFunction);
    htmlPlansBucket.grantRead(plansFunction);
    usersTable.grantReadData(plansFunction);

    destinationsTable.grantReadWriteData(destinationsFunction);
    imagesBucket.grantReadWrite(destinationsFunction);

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

    const destinationsFunctionUrl = destinationsFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ['Content-Type'],
      },
    });

    // ============ CloudFront Distribution ============

    // S3 Bucket for Website
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `photoscout-web-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Import existing ACM certificate for aiscout.photo
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'AiScoutCertificate',
      'arn:aws:acm:us-east-1:707282829805:certificate/40873ec5-420f-4f89-a62a-076c08869c12'
    );

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: ['aiscout.photo'],
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        '/plans/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(htmlPlansBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'HtmlPlansCachePolicy', {
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
          }),
          responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(
            this,
            'HtmlResponseHeadersPolicy',
            {
              corsBehavior: {
                accessControlAllowOrigins: ['*'],
                accessControlAllowHeaders: ['*'],
                accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
                accessControlAllowCredentials: false,
                originOverride: true,
              },
              customHeadersBehavior: {
                customHeaders: [
                  {
                    header: 'Content-Type',
                    value: 'text/html; charset=utf-8',
                    override: true,
                  },
                ],
              },
            }
          ),
        },
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
        '/api/destinations*': {
          origin: new origins.FunctionUrlOrigin(destinationsFunctionUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/destinations/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(imagesBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'DestinationImagesCachePolicy', {
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
          }),
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
        },
        {
          httpStatus: 403,
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

    new cdk.CfnOutput(this, 'DestinationsApiUrl', {
      value: destinationsFunctionUrl.url,
      description: 'Destinations Lambda Function URL',
    });

    new cdk.CfnOutput(this, 'HtmlPlansBucketName', {
      value: htmlPlansBucket.bucketName,
      description: 'S3 Bucket for HTML Plans',
    });

    new cdk.CfnOutput(this, 'HtmlPlansCloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}/plans/`,
      description: 'CloudFront URL for HTML Plans',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
      description:
        'CloudFront Distribution Domain (set as CLOUDFRONT_DOMAIN env var in Chat Lambda)',
    });

    // Note: CLOUDFRONT_DOMAIN must be set manually after deployment to avoid circular dependency
    // aws lambda update-function-configuration --function-name <name> --environment "Variables={...,CLOUDFRONT_DOMAIN=<domain>}"
  }
}
