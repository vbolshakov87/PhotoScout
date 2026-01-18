import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.+)/);
const GOOGLE_API_KEY = apiKeyMatch?.[1]?.trim();

const s3Client = new S3Client({ region: 'eu-central-1' });
const BUCKET_NAME = 'photoscout-plans-707282829805';
const CLOUDFRONT_DOMAIN = 'aiscout.photo';

// Try different Imagen models
const MODELS = [
  'imagen-3.0-generate-001', // Imagen 3 (might have separate quota)
  'imagen-4.0-generate-001', // Imagen 4 standard
  'imagen-4.0-fast-generate-001', // Imagen 4 fast (current, quota exceeded)
];

const PROMPT = `Minimalist app icon for PhotoScout travel planning app. Clean geometric design featuring a stylized camera lens combined with a location pin or compass element. Dark background (#0a0a0f) with subtle gradient accents in warm orange and gold colors. Modern, professional, suitable for iOS App Store. Square format, no text, centered design with good padding.`;

async function generateIcon(model: string): Promise<Buffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not set');
  }

  console.log(`Trying model: ${model}`);
  console.log(`Prompt: ${PROMPT}\n`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt: PROMPT }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const imageData = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new Error('No image data in response');
  }

  return Buffer.from(imageData, 'base64');
}

async function uploadToS3(imageData: Buffer): Promise<string> {
  const key = 'city-images/appicon.png';

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

async function main() {
  console.log('🎨 Generating PhotoScout App Icon\n');

  for (const model of MODELS) {
    try {
      const imageData = await generateIcon(model);

      // Save locally first
      const localPath = join(__dirname, '../../../appicon.png');
      writeFileSync(localPath, imageData);
      console.log(`✅ Saved locally: ${localPath}`);

      // Upload to S3
      const url = await uploadToS3(imageData);
      console.log(`✅ Uploaded to S3: ${url}`);

      console.log('\n🎉 App icon generated successfully!');
      console.log('\nNext steps:');
      console.log('1. Review the icon at the local path or S3 URL');
      console.log('2. Use an icon generator tool to create iOS icon set from 1024x1024');
      console.log('   Recommended: https://appicon.co or Xcode Assets catalog');
      return;
    } catch (error) {
      console.error(`❌ Model ${model} failed:`, error);
      if (String(error).includes('429') || String(error).includes('quota')) {
        console.log('   Quota exceeded, trying next model...\n');
        continue;
      }
      // For other errors, still try next model
      console.log('   Trying next model...\n');
    }
  }

  console.log('\n⚠️  All models failed. Quota may be exceeded for all.');
  console.log('   Try again after 9:00 AM CET when quota resets.');
}

main().catch(console.error);
