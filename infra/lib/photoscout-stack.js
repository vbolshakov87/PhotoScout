"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoScoutStack = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const path = require("path");
const dotenv = require("dotenv");
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
                },
            ],
        });
        // ============ Lambda Functions ============
        // Get API keys from environment variables
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required. Please set it in .env file');
        }
        // Optional: DeepSeek API key for development
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        const environment = process.env.ENVIRONMENT || 'production';
        // Will add CLOUDFRONT_DOMAIN after distribution is created
        const lambdaEnvironment = {
            MESSAGES_TABLE: messagesTable.tableName,
            CONVERSATIONS_TABLE: conversationsTable.tableName,
            PLANS_TABLE: plansTable.tableName,
            USERS_TABLE: usersTable.tableName,
            HTML_PLANS_BUCKET: htmlPlansBucket.bucketName,
            ANTHROPIC_API_KEY: anthropicApiKey,
            ENVIRONMENT: environment,
        };
        // Add DeepSeek key if available (for development)
        if (deepseekApiKey) {
            lambdaEnvironment.DEEPSEEK_API_KEY = deepseekApiKey;
        }
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
        usersTable.grantReadWriteData(chatFunction);
        htmlPlansBucket.grantReadWrite(chatFunction);
        messagesTable.grantReadData(conversationsFunction);
        conversationsTable.grantReadWriteData(conversationsFunction);
        usersTable.grantReadData(conversationsFunction);
        plansTable.grantReadWriteData(plansFunction);
        htmlPlansBucket.grantRead(plansFunction);
        usersTable.grantReadData(plansFunction);
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
                    responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'HtmlResponseHeadersPolicy', {
                        customHeadersBehavior: {
                            customHeaders: [
                                {
                                    header: 'Content-Type',
                                    value: 'text/html; charset=utf-8',
                                    override: true,
                                },
                            ],
                        },
                    }),
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
            description: 'CloudFront Distribution Domain (set as CLOUDFRONT_DOMAIN env var in Chat Lambda)',
        });
        // Note: CLOUDFRONT_DOMAIN must be set manually after deployment to avoid circular dependency
        // aws lambda update-function-configuration --function-name <name> --environment "Variables={...,CLOUDFRONT_DOMAIN=<domain>}"
    }
}
exports.PhotoScoutStack = PhotoScoutStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG9zY291dC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBob3Rvc2NvdXQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHFEQUFxRDtBQUNyRCxpREFBaUQ7QUFDakQseUNBQXlDO0FBQ3pDLDBEQUEwRDtBQUMxRCx5REFBeUQ7QUFDekQsOERBQThEO0FBRTlELDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFFakMsNENBQTRDO0FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRTVELE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDRDQUE0QztRQUU1QyxpQkFBaUI7UUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDOUQsU0FBUyxFQUFFLHFCQUFxQjtZQUNoQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN4RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELG1CQUFtQixFQUFFLFdBQVc7WUFDaEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsdUJBQXVCLENBQUM7WUFDcEMs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QzFDLEtBQUssRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzFDLFdBQVcsRUFBRSxrRkFBa0Y7U0FDaEcsQ0FBQyxDQUFDO1FBRUgsNkZBQTZGO1FBQzdGLDZIQUE2SDtJQUMvSCxDQUFDO0NBQ0Y7QUF4U0QsMENBd1NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XG5cbi8vIExvYWQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZyb20gLmVudiBmaWxlXG5kb3RlbnYuY29uZmlnKHsgcGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy5lbnYnKSB9KTtcblxuZXhwb3J0IGNsYXNzIFBob3RvU2NvdXRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vID09PT09PT09PT09PSBEeW5hbW9EQiBUYWJsZXMgPT09PT09PT09PT09XG5cbiAgICAvLyBNZXNzYWdlcyBUYWJsZVxuICAgIGNvbnN0IG1lc3NhZ2VzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ01lc3NhZ2VzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdwaG90b3Njb3V0LW1lc3NhZ2VzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndmlzaXRvcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgbWVzc2FnZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdjb252ZXJzYXRpb25JZC1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2NvbnZlcnNhdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDb252ZXJzYXRpb25zIFRhYmxlXG4gICAgY29uc3QgY29udmVyc2F0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdDb252ZXJzYXRpb25zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdwaG90b3Njb3V0LWNvbnZlcnNhdGlvbnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd2aXNpdG9ySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY29udmVyc2F0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIFBsYW5zIFRhYmxlXG4gICAgY29uc3QgcGxhbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUGxhbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3Bob3Rvc2NvdXQtcGxhbnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd2aXNpdG9ySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAncGxhbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAnZXhwaXJlc0F0JyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBwbGFuc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ2NvbnZlcnNhdGlvbklkLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udmVyc2F0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICB9KTtcblxuICAgIC8vIFVzZXJzIFRhYmxlXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3Bob3Rvc2NvdXQtdXNlcnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ2VtYWlsLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IFMzIEJ1Y2tldHMgPT09PT09PT09PT09XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIEhUTUwgUGxhbnNcbiAgICBjb25zdCBodG1sUGxhbnNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdIdG1sUGxhbnNCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgcGhvdG9zY291dC1wbGFucy0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VUXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PSBMYW1iZGEgRnVuY3Rpb25zID09PT09PT09PT09PVxuXG4gICAgLy8gR2V0IEFQSSBrZXlzIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgY29uc3QgYW50aHJvcGljQXBpS2V5ID0gcHJvY2Vzcy5lbnYuQU5USFJPUElDX0FQSV9LRVk7XG4gICAgaWYgKCFhbnRocm9waWNBcGlLZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQU5USFJPUElDX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQuIFBsZWFzZSBzZXQgaXQgaW4gLmVudiBmaWxlJyk7XG4gICAgfVxuXG4gICAgLy8gT3B0aW9uYWw6IERlZXBTZWVrIEFQSSBrZXkgZm9yIGRldmVsb3BtZW50XG4gICAgY29uc3QgZGVlcHNlZWtBcGlLZXkgPSBwcm9jZXNzLmVudi5ERUVQU0VFS19BUElfS0VZO1xuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Byb2R1Y3Rpb24nO1xuXG4gICAgLy8gV2lsbCBhZGQgQ0xPVURGUk9OVF9ET01BSU4gYWZ0ZXIgZGlzdHJpYnV0aW9uIGlzIGNyZWF0ZWRcbiAgICBjb25zdCBsYW1iZGFFbnZpcm9ubWVudDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHtcbiAgICAgIE1FU1NBR0VTX1RBQkxFOiBtZXNzYWdlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENPTlZFUlNBVElPTlNfVEFCTEU6IGNvbnZlcnNhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBQTEFOU19UQUJMRTogcGxhbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBIVE1MX1BMQU5TX0JVQ0tFVDogaHRtbFBsYW5zQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBBTlRIUk9QSUNfQVBJX0tFWTogYW50aHJvcGljQXBpS2V5LFxuICAgICAgRU5WSVJPTk1FTlQ6IGVudmlyb25tZW50LFxuICAgIH07XG5cbiAgICAvLyBBZGQgRGVlcFNlZWsga2V5IGlmIGF2YWlsYWJsZSAoZm9yIGRldmVsb3BtZW50KVxuICAgIGlmIChkZWVwc2Vla0FwaUtleSkge1xuICAgICAgbGFtYmRhRW52aXJvbm1lbnQuREVFUFNFRUtfQVBJX0tFWSA9IGRlZXBzZWVrQXBpS2V5O1xuICAgIH1cblxuICAgIC8vIENoYXQgRnVuY3Rpb24gKHN0cmVhbWluZylcbiAgICBjb25zdCBjaGF0RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGF0RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdjaGF0LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlcy9hcGkvZGlzdCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEyMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgfSk7XG5cbiAgICAvLyBDb252ZXJzYXRpb25zIEZ1bmN0aW9uXG4gICAgY29uc3QgY29udmVyc2F0aW9uc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ29udmVyc2F0aW9uc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnY29udmVyc2F0aW9ucy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvYXBpL2Rpc3QnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgfSk7XG5cbiAgICAvLyBQbGFucyBGdW5jdGlvblxuICAgIGNvbnN0IHBsYW5zRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQbGFuc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAncGxhbnMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL2FwaS9kaXN0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IGxhbWJkYUVudmlyb25tZW50LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBtZXNzYWdlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjaGF0RnVuY3Rpb24pO1xuICAgIGNvbnZlcnNhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY2hhdEZ1bmN0aW9uKTtcbiAgICBwbGFuc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjaGF0RnVuY3Rpb24pO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNoYXRGdW5jdGlvbik7XG4gICAgaHRtbFBsYW5zQnVja2V0LmdyYW50UmVhZFdyaXRlKGNoYXRGdW5jdGlvbik7XG5cbiAgICBtZXNzYWdlc1RhYmxlLmdyYW50UmVhZERhdGEoY29udmVyc2F0aW9uc0Z1bmN0aW9uKTtcbiAgICBjb252ZXJzYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNvbnZlcnNhdGlvbnNGdW5jdGlvbik7XG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWREYXRhKGNvbnZlcnNhdGlvbnNGdW5jdGlvbik7XG5cbiAgICBwbGFuc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwbGFuc0Z1bmN0aW9uKTtcbiAgICBodG1sUGxhbnNCdWNrZXQuZ3JhbnRSZWFkKHBsYW5zRnVuY3Rpb24pO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YShwbGFuc0Z1bmN0aW9uKTtcblxuICAgIC8vIEZ1bmN0aW9uIFVSTHNcbiAgICBjb25zdCBjaGF0RnVuY3Rpb25VcmwgPSBjaGF0RnVuY3Rpb24uYWRkRnVuY3Rpb25Vcmwoe1xuICAgICAgYXV0aFR5cGU6IGxhbWJkYS5GdW5jdGlvblVybEF1dGhUeXBlLk5PTkUsXG4gICAgICBjb3JzOiB7XG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtsYW1iZGEuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnQ29udGVudC1UeXBlJ10sXG4gICAgICB9LFxuICAgICAgaW52b2tlTW9kZTogbGFtYmRhLkludm9rZU1vZGUuUkVTUE9OU0VfU1RSRUFNLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uc0Z1bmN0aW9uVXJsID0gY29udmVyc2F0aW9uc0Z1bmN0aW9uLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FLFxuICAgICAgY29yczoge1xuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbbGFtYmRhLkh0dHBNZXRob2QuR0VULCBsYW1iZGEuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogWydDb250ZW50LVR5cGUnXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBwbGFuc0Z1bmN0aW9uVXJsID0gcGxhbnNGdW5jdGlvbi5hZGRGdW5jdGlvblVybCh7XG4gICAgICBhdXRoVHlwZTogbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuTk9ORSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW2xhbWJkYS5IdHRwTWV0aG9kLkdFVCwgbGFtYmRhLkh0dHBNZXRob2QuREVMRVRFXSxcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnQ29udGVudC1UeXBlJ10sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uID09PT09PT09PT09PVxuXG4gICAgLy8gUzMgQnVja2V0IGZvciBXZWJzaXRlXG4gICAgY29uc3Qgd2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgcGhvdG9zY291dC13ZWItJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgfSk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2wod2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgfSxcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9wbGFucy8qJzoge1xuICAgICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChodG1sUGxhbnNCdWNrZXQpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBuZXcgY2xvdWRmcm9udC5DYWNoZVBvbGljeSh0aGlzLCAnSHRtbFBsYW5zQ2FjaGVQb2xpY3knLCB7XG4gICAgICAgICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxuICAgICAgICAgICAgbWF4VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxuICAgICAgICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IG5ldyBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnSHRtbFJlc3BvbnNlSGVhZGVyc1BvbGljeScsIHtcbiAgICAgICAgICAgIGN1c3RvbUhlYWRlcnNCZWhhdmlvcjoge1xuICAgICAgICAgICAgICBjdXN0b21IZWFkZXJzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaGVhZGVyOiAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04JyxcbiAgICAgICAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9jaGF0Jzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuRnVuY3Rpb25VcmxPcmlnaW4oY2hhdEZ1bmN0aW9uVXJsKSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL2NvbnZlcnNhdGlvbnMqJzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuRnVuY3Rpb25VcmxPcmlnaW4oY29udmVyc2F0aW9uc0Z1bmN0aW9uVXJsKSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL3BsYW5zKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLkZ1bmN0aW9uVXJsT3JpZ2luKHBsYW5zRnVuY3Rpb25VcmwpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdEZXBsb3lXZWJzaXRlJywge1xuICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvd2ViL2Rpc3QnKSldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgICBkaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09IE91dHB1dHMgPT09PT09PT09PT09XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NoYXRBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogY2hhdEZ1bmN0aW9uVXJsLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2hhdCBMYW1iZGEgRnVuY3Rpb24gVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb252ZXJzYXRpb25zQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGNvbnZlcnNhdGlvbnNGdW5jdGlvblVybC51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvbnZlcnNhdGlvbnMgTGFtYmRhIEZ1bmN0aW9uIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGxhbnNBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogcGxhbnNGdW5jdGlvblVybC51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ1BsYW5zIExhbWJkYSBGdW5jdGlvbiBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0h0bWxQbGFuc0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogaHRtbFBsYW5zQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBmb3IgSFRNTCBQbGFucycsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSHRtbFBsYW5zQ2xvdWRGcm9udFVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfS9wbGFucy9gLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IFVSTCBmb3IgSFRNTCBQbGFucycsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERvbWFpbicsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gRG9tYWluIChzZXQgYXMgQ0xPVURGUk9OVF9ET01BSU4gZW52IHZhciBpbiBDaGF0IExhbWJkYSknLFxuICAgIH0pO1xuXG4gICAgLy8gTm90ZTogQ0xPVURGUk9OVF9ET01BSU4gbXVzdCBiZSBzZXQgbWFudWFsbHkgYWZ0ZXIgZGVwbG95bWVudCB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmN5XG4gICAgLy8gYXdzIGxhbWJkYSB1cGRhdGUtZnVuY3Rpb24tY29uZmlndXJhdGlvbiAtLWZ1bmN0aW9uLW5hbWUgPG5hbWU+IC0tZW52aXJvbm1lbnQgXCJWYXJpYWJsZXM9ey4uLixDTE9VREZST05UX0RPTUFJTj08ZG9tYWluPn1cIlxuICB9XG59XG4iXX0=