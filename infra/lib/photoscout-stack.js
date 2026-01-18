'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PhotoScoutStack = void 0;
const cdk = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const s3 = require('aws-cdk-lib/aws-s3');
const s3deploy = require('aws-cdk-lib/aws-s3-deployment');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const path = require('path');
const dotenv = require('dotenv');
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });
class PhotoScoutStack extends cdk.Stack {
  constructor(scope, id, props) {
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
    // Optional: Google API key for image generation
    const googleApiKey = process.env.GOOGLE_API_KEY;
    // Google OAuth Client ID (for token validation)
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    // Admin API key (for protected endpoints like image generation)
    const adminApiKey = process.env.ADMIN_API_KEY;
    const environment = process.env.ENVIRONMENT || 'production';
    // Will add CLOUDFRONT_DOMAIN after distribution is created
    const lambdaEnvironment = {
      MESSAGES_TABLE: messagesTable.tableName,
      CONVERSATIONS_TABLE: conversationsTable.tableName,
      PLANS_TABLE: plansTable.tableName,
      USERS_TABLE: usersTable.tableName,
      CACHE_TABLE: cacheTable.tableName,
      HTML_PLANS_BUCKET: htmlPlansBucket.bucketName,
      ANTHROPIC_API_KEY: anthropicApiKey,
      ENVIRONMENT: environment,
    };
    // Add DeepSeek key if available (for development)
    if (deepseekApiKey) {
      lambdaEnvironment.DEEPSEEK_API_KEY = deepseekApiKey;
    }
    // Add Google API key if available (for image generation)
    if (googleApiKey) {
      lambdaEnvironment.GOOGLE_API_KEY = googleApiKey;
    }
    // Add Google Client ID if available (for OAuth token validation)
    if (googleClientId) {
      lambdaEnvironment.GOOGLE_CLIENT_ID = googleClientId;
    }
    // Add Admin API key if available (for protected admin endpoints)
    if (adminApiKey) {
      lambdaEnvironment.ADMIN_API_KEY = adminApiKey;
    }
    // Hardcode CloudFront domain to avoid circular dependency
    // This is the domain for photoscout-plans bucket distribution
    lambdaEnvironment.CLOUDFRONT_DOMAIN = 'd2mpt2trz11kx7.cloudfront.net';
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
    // Images Function (for city image generation)
    const imagesFunction = new lambda.Function(this, 'ImagesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'images.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      timeout: cdk.Duration.seconds(120), // Image generation can take time
      memorySize: 512,
      environment: lambdaEnvironment,
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
    htmlPlansBucket.grantReadWrite(imagesFunction);
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
    const imagesFunctionUrl = imagesFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
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
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
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
        '/api/images*': {
          origin: new origins.FunctionUrlOrigin(imagesFunctionUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/city-images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(htmlPlansBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'CityImagesCachePolicy', {
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(30),
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
exports.PhotoScoutStack = PhotoScoutStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG9zY291dC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBob3Rvc2NvdXQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHFEQUFxRDtBQUNyRCxpREFBaUQ7QUFDakQseUNBQXlDO0FBQ3pDLDBEQUEwRDtBQUMxRCx5REFBeUQ7QUFDekQsOERBQThEO0FBRTlELDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFFakMsNENBQTRDO0FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRTVELE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDRDQUE0QztRQUU1QyxpQkFBaUI7UUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDOUQsU0FBUyxFQUFFLHFCQUFxQjtZQUNoQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN4RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELG1CQUFtQixFQUFFLFdBQVc7WUFDaEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsdUJBQXVCLENBQUM7WUFDcEMs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bSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcblxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZnJvbSAuZW52IGZpbGVcbmRvdGVudi5jb25maWcoeyBwYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLmVudicpIH0pO1xuXG5leHBvcnQgY2xhc3MgUGhvdG9TY291dFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gPT09PT09PT09PT09IER5bmFtb0RCIFRhYmxlcyA9PT09PT09PT09PT1cblxuICAgIC8vIE1lc3NhZ2VzIFRhYmxlXG4gICAgY29uc3QgbWVzc2FnZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnTWVzc2FnZXNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3Bob3Rvc2NvdXQtbWVzc2FnZXMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd2aXNpdG9ySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAnZXhwaXJlc0F0JyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBtZXNzYWdlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ2NvbnZlcnNhdGlvbklkLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udmVyc2F0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICB9KTtcblxuICAgIC8vIENvbnZlcnNhdGlvbnMgVGFibGVcbiAgICBjb25zdCBjb252ZXJzYXRpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NvbnZlcnNhdGlvbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3Bob3Rvc2NvdXQtY29udmVyc2F0aW9ucycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Zpc2l0b3JJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjb252ZXJzYXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gUGxhbnMgVGFibGVcbiAgICBjb25zdCBwbGFuc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdQbGFuc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAncGhvdG9zY291dC1wbGFucycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Zpc2l0b3JJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwbGFuSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIHBsYW5zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnY29udmVyc2F0aW9uSWQtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb252ZXJzYXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgIH0pO1xuXG4gICAgLy8gVXNlcnMgVGFibGVcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAncGhvdG9zY291dC11c2VycycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIHVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDYWNoZSBUYWJsZSAtIGZvciBjYWNoaW5nIGdlbmVyYXRlZCB0cmlwIHBsYW5zXG4gICAgY29uc3QgY2FjaGVUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQ2FjaGVUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3Bob3Rvc2NvdXQtY2FjaGUnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjYWNoZUtleScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IFMzIEJ1Y2tldHMgPT09PT09PT09PT09XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIEhUTUwgUGxhbnNcbiAgICBjb25zdCBodG1sUGxhbnNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdIdG1sUGxhbnNCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgcGhvdG9zY291dC1wbGFucy0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VUXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdDb250ZW50LUxlbmd0aCcsICdFVGFnJ10sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IExhbWJkYSBGdW5jdGlvbnMgPT09PT09PT09PT09XG5cbiAgICAvLyBHZXQgQVBJIGtleXMgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBhbnRocm9waWNBcGlLZXkgPSBwcm9jZXNzLmVudi5BTlRIUk9QSUNfQVBJX0tFWTtcbiAgICBpZiAoIWFudGhyb3BpY0FwaUtleSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBTlRIUk9QSUNfQVBJX0tFWSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyByZXF1aXJlZC4gUGxlYXNlIHNldCBpdCBpbiAuZW52IGZpbGUnKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25hbDogRGVlcFNlZWsgQVBJIGtleSBmb3IgZGV2ZWxvcG1lbnRcbiAgICBjb25zdCBkZWVwc2Vla0FwaUtleSA9IHByb2Nlc3MuZW52LkRFRVBTRUVLX0FQSV9LRVk7XG4gICAgLy8gT3B0aW9uYWw6IEdvb2dsZSBBUEkga2V5IGZvciBpbWFnZSBnZW5lcmF0aW9uXG4gICAgY29uc3QgZ29vZ2xlQXBpS2V5ID0gcHJvY2Vzcy5lbnYuR09PR0xFX0FQSV9LRVk7XG4gICAgLy8gR29vZ2xlIE9BdXRoIENsaWVudCBJRCAoZm9yIHRva2VuIHZhbGlkYXRpb24pXG4gICAgY29uc3QgZ29vZ2xlQ2xpZW50SWQgPSBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX0lEO1xuICAgIC8vIEFkbWluIEFQSSBrZXkgKGZvciBwcm90ZWN0ZWQgZW5kcG9pbnRzIGxpa2UgaW1hZ2UgZ2VuZXJhdGlvbilcbiAgICBjb25zdCBhZG1pbkFwaUtleSA9IHByb2Nlc3MuZW52LkFETUlOX0FQSV9LRVk7XG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAncHJvZHVjdGlvbic7XG5cbiAgICAvLyBXaWxsIGFkZCBDTE9VREZST05UX0RPTUFJTiBhZnRlciBkaXN0cmlidXRpb24gaXMgY3JlYXRlZFxuICAgIGNvbnN0IGxhbWJkYUVudmlyb25tZW50OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge1xuICAgICAgTUVTU0FHRVNfVEFCTEU6IG1lc3NhZ2VzVGFibGUudGFibGVOYW1lLFxuICAgICAgQ09OVkVSU0FUSU9OU19UQUJMRTogY29udmVyc2F0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFBMQU5TX1RBQkxFOiBwbGFuc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENBQ0hFX1RBQkxFOiBjYWNoZVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEhUTUxfUExBTlNfQlVDS0VUOiBodG1sUGxhbnNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIEFOVEhST1BJQ19BUElfS0VZOiBhbnRocm9waWNBcGlLZXksXG4gICAgICBFTlZJUk9OTUVOVDogZW52aXJvbm1lbnQsXG4gICAgfTtcblxuICAgIC8vIEFkZCBEZWVwU2VlayBrZXkgaWYgYXZhaWxhYmxlIChmb3IgZGV2ZWxvcG1lbnQpXG4gICAgaWYgKGRlZXBzZWVrQXBpS2V5KSB7XG4gICAgICBsYW1iZGFFbnZpcm9ubWVudC5ERUVQU0VFS19BUElfS0VZID0gZGVlcHNlZWtBcGlLZXk7XG4gICAgfVxuXG4gICAgLy8gQWRkIEdvb2dsZSBBUEkga2V5IGlmIGF2YWlsYWJsZSAoZm9yIGltYWdlIGdlbmVyYXRpb24pXG4gICAgaWYgKGdvb2dsZUFwaUtleSkge1xuICAgICAgbGFtYmRhRW52aXJvbm1lbnQuR09PR0xFX0FQSV9LRVkgPSBnb29nbGVBcGlLZXk7XG4gICAgfVxuXG4gICAgLy8gQWRkIEdvb2dsZSBDbGllbnQgSUQgaWYgYXZhaWxhYmxlIChmb3IgT0F1dGggdG9rZW4gdmFsaWRhdGlvbilcbiAgICBpZiAoZ29vZ2xlQ2xpZW50SWQpIHtcbiAgICAgIGxhbWJkYUVudmlyb25tZW50LkdPT0dMRV9DTElFTlRfSUQgPSBnb29nbGVDbGllbnRJZDtcbiAgICB9XG5cbiAgICAvLyBBZGQgQWRtaW4gQVBJIGtleSBpZiBhdmFpbGFibGUgKGZvciBwcm90ZWN0ZWQgYWRtaW4gZW5kcG9pbnRzKVxuICAgIGlmIChhZG1pbkFwaUtleSkge1xuICAgICAgbGFtYmRhRW52aXJvbm1lbnQuQURNSU5fQVBJX0tFWSA9IGFkbWluQXBpS2V5O1xuICAgIH1cblxuICAgIC8vIEhhcmRjb2RlIENsb3VkRnJvbnQgZG9tYWluIHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY3lcbiAgICAvLyBUaGlzIGlzIHRoZSBkb21haW4gZm9yIHBob3Rvc2NvdXQtcGxhbnMgYnVja2V0IGRpc3RyaWJ1dGlvblxuICAgIGxhbWJkYUVudmlyb25tZW50LkNMT1VERlJPTlRfRE9NQUlOID0gJ2QybXB0MnRyejExa3g3LmNsb3VkZnJvbnQubmV0JztcblxuICAgIC8vIENoYXQgRnVuY3Rpb24gKHN0cmVhbWluZylcbiAgICBjb25zdCBjaGF0RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGF0RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdjaGF0LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlcy9hcGkvZGlzdCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEyMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgfSk7XG5cbiAgICAvLyBDb252ZXJzYXRpb25zIEZ1bmN0aW9uXG4gICAgY29uc3QgY29udmVyc2F0aW9uc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ29udmVyc2F0aW9uc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnY29udmVyc2F0aW9ucy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvYXBpL2Rpc3QnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgfSk7XG5cbiAgICAvLyBQbGFucyBGdW5jdGlvblxuICAgIGNvbnN0IHBsYW5zRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQbGFuc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAncGxhbnMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL2FwaS9kaXN0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IGxhbWJkYUVudmlyb25tZW50LFxuICAgIH0pO1xuXG4gICAgLy8gSW1hZ2VzIEZ1bmN0aW9uIChmb3IgY2l0eSBpbWFnZSBnZW5lcmF0aW9uKVxuICAgIGNvbnN0IGltYWdlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW1hZ2VzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdpbWFnZXMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL2FwaS9kaXN0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTIwKSwgLy8gSW1hZ2UgZ2VuZXJhdGlvbiBjYW4gdGFrZSB0aW1lXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xuICAgIG1lc3NhZ2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNoYXRGdW5jdGlvbik7XG4gICAgY29udmVyc2F0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjaGF0RnVuY3Rpb24pO1xuICAgIHBsYW5zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNoYXRGdW5jdGlvbik7XG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY2hhdEZ1bmN0aW9uKTtcbiAgICBjYWNoZVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjaGF0RnVuY3Rpb24pO1xuICAgIGh0bWxQbGFuc0J1Y2tldC5ncmFudFJlYWRXcml0ZShjaGF0RnVuY3Rpb24pO1xuXG4gICAgbWVzc2FnZXNUYWJsZS5ncmFudFJlYWREYXRhKGNvbnZlcnNhdGlvbnNGdW5jdGlvbik7XG4gICAgY29udmVyc2F0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjb252ZXJzYXRpb25zRnVuY3Rpb24pO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YShjb252ZXJzYXRpb25zRnVuY3Rpb24pO1xuXG4gICAgcGxhbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocGxhbnNGdW5jdGlvbik7XG4gICAgaHRtbFBsYW5zQnVja2V0LmdyYW50UmVhZChwbGFuc0Z1bmN0aW9uKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEocGxhbnNGdW5jdGlvbik7XG5cbiAgICBodG1sUGxhbnNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoaW1hZ2VzRnVuY3Rpb24pO1xuXG4gICAgLy8gRnVuY3Rpb24gVVJMc1xuICAgIGNvbnN0IGNoYXRGdW5jdGlvblVybCA9IGNoYXRGdW5jdGlvbi5hZGRGdW5jdGlvblVybCh7XG4gICAgICBhdXRoVHlwZTogbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuTk9ORSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW2xhbWJkYS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogWydDb250ZW50LVR5cGUnXSxcbiAgICAgIH0sXG4gICAgICBpbnZva2VNb2RlOiBsYW1iZGEuSW52b2tlTW9kZS5SRVNQT05TRV9TVFJFQU0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb252ZXJzYXRpb25zRnVuY3Rpb25VcmwgPSBjb252ZXJzYXRpb25zRnVuY3Rpb24uYWRkRnVuY3Rpb25Vcmwoe1xuICAgICAgYXV0aFR5cGU6IGxhbWJkYS5GdW5jdGlvblVybEF1dGhUeXBlLk5PTkUsXG4gICAgICBjb3JzOiB7XG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtsYW1iZGEuSHR0cE1ldGhvZC5HRVQsIGxhbWJkYS5IdHRwTWV0aG9kLkRFTEVURV0sXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZSddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHBsYW5zRnVuY3Rpb25VcmwgPSBwbGFuc0Z1bmN0aW9uLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FLFxuICAgICAgY29yczoge1xuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbbGFtYmRhLkh0dHBNZXRob2QuR0VULCBsYW1iZGEuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogWydDb250ZW50LVR5cGUnXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBpbWFnZXNGdW5jdGlvblVybCA9IGltYWdlc0Z1bmN0aW9uLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FLFxuICAgICAgY29yczoge1xuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbbGFtYmRhLkh0dHBNZXRob2QuR0VULCBsYW1iZGEuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnQ29udGVudC1UeXBlJ10sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uID09PT09PT09PT09PVxuXG4gICAgLy8gUzMgQnVja2V0IGZvciBXZWJzaXRlXG4gICAgY29uc3Qgd2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgcGhvdG9zY291dC13ZWItJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgfSk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2wod2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgfSxcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9wbGFucy8qJzoge1xuICAgICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChodG1sUGxhbnNCdWNrZXQpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBuZXcgY2xvdWRmcm9udC5DYWNoZVBvbGljeSh0aGlzLCAnSHRtbFBsYW5zQ2FjaGVQb2xpY3knLCB7XG4gICAgICAgICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxuICAgICAgICAgICAgbWF4VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxuICAgICAgICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IG5ldyBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnSHRtbFJlc3BvbnNlSGVhZGVyc1BvbGljeScsIHtcbiAgICAgICAgICAgIGNvcnNCZWhhdmlvcjoge1xuICAgICAgICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgICAgICAgYWNjZXNzQ29udHJvbEFsbG93SGVhZGVyczogWycqJ10sXG4gICAgICAgICAgICAgIGFjY2Vzc0NvbnRyb2xBbGxvd01ldGhvZHM6IFsnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUyddLFxuICAgICAgICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dDcmVkZW50aWFsczogZmFsc2UsXG4gICAgICAgICAgICAgIG9yaWdpbk92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGN1c3RvbUhlYWRlcnNCZWhhdmlvcjoge1xuICAgICAgICAgICAgICBjdXN0b21IZWFkZXJzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaGVhZGVyOiAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04JyxcbiAgICAgICAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9jaGF0Jzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuRnVuY3Rpb25VcmxPcmlnaW4oY2hhdEZ1bmN0aW9uVXJsKSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL2NvbnZlcnNhdGlvbnMqJzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuRnVuY3Rpb25VcmxPcmlnaW4oY29udmVyc2F0aW9uc0Z1bmN0aW9uVXJsKSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL3BsYW5zKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLkZ1bmN0aW9uVXJsT3JpZ2luKHBsYW5zRnVuY3Rpb25VcmwpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvaW1hZ2VzKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLkZ1bmN0aW9uVXJsT3JpZ2luKGltYWdlc0Z1bmN0aW9uVXJsKSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgICcvY2l0eS1pbWFnZXMvKic6IHtcbiAgICAgICAgICBvcmlnaW46IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2woaHRtbFBsYW5zQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ0NpdHlJbWFnZXNDYWNoZVBvbGljeScsIHtcbiAgICAgICAgICAgIGRlZmF1bHRUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICAgICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICAgICAgICBtaW5UdGw6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlcy93ZWIvZGlzdCcpKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbixcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT0gT3V0cHV0cyA9PT09PT09PT09PT1cblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25VcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2hhdEFwaVVybCcsIHtcbiAgICAgIHZhbHVlOiBjaGF0RnVuY3Rpb25VcmwudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdDaGF0IExhbWJkYSBGdW5jdGlvbiBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvbnZlcnNhdGlvbnNBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogY29udmVyc2F0aW9uc0Z1bmN0aW9uVXJsLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29udmVyc2F0aW9ucyBMYW1iZGEgRnVuY3Rpb24gVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQbGFuc0FwaVVybCcsIHtcbiAgICAgIHZhbHVlOiBwbGFuc0Z1bmN0aW9uVXJsLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGxhbnMgTGFtYmRhIEZ1bmN0aW9uIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSHRtbFBsYW5zQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBodG1sUGxhbnNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IGZvciBIVE1MIFBsYW5zJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdIdG1sUGxhbnNDbG91ZEZyb250VXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9L3BsYW5zL2AsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgVVJMIGZvciBIVE1MIFBsYW5zJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RG9tYWluJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBEb21haW4gKHNldCBhcyBDTE9VREZST05UX0RPTUFJTiBlbnYgdmFyIGluIENoYXQgTGFtYmRhKScsXG4gICAgfSk7XG5cbiAgICAvLyBOb3RlOiBDTE9VREZST05UX0RPTUFJTiBtdXN0IGJlIHNldCBtYW51YWxseSBhZnRlciBkZXBsb3ltZW50IHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY3lcbiAgICAvLyBhd3MgbGFtYmRhIHVwZGF0ZS1mdW5jdGlvbi1jb25maWd1cmF0aW9uIC0tZnVuY3Rpb24tbmFtZSA8bmFtZT4gLS1lbnZpcm9ubWVudCBcIlZhcmlhYmxlcz17Li4uLENMT1VERlJPTlRfRE9NQUlOPTxkb21haW4+fVwiXG4gIH1cbn1cbiJdfQ==
