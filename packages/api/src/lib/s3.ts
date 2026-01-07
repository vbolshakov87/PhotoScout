import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });

/**
 * Upload HTML content to S3
 * @param visitorId - User/visitor ID
 * @param planId - Plan ID
 * @param htmlContent - HTML content to upload
 * @returns CloudFront URL for the uploaded HTML
 */
export async function uploadHtmlToS3(
  visitorId: string,
  planId: string,
  htmlContent: string
): Promise<string> {
  const bucketName = process.env.HTML_PLANS_BUCKET;
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!bucketName) {
    throw new Error('HTML_PLANS_BUCKET environment variable is not set');
  }

  if (!cloudfrontDomain) {
    throw new Error('CLOUDFRONT_DOMAIN environment variable is not set');
  }

  // S3 key: {visitorId}/{planId}.html
  const key = `${visitorId}/${planId}.html`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: htmlContent,
    ContentType: 'text/html; charset=utf-8',
    CacheControl: 'public, max-age=31536000', // 1 year
  });

  await s3Client.send(command);

  // Return CloudFront URL
  return `https://${cloudfrontDomain}/plans/${key}`;
}
