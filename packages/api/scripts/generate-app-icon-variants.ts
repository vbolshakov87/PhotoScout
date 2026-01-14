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
const MODEL = 'imagen-4.0-generate-001';

const VARIANTS = [
  {
    name: 'blue',
    prompt: `Minimalist app icon for PhotoScout travel planning app. Clean geometric design featuring a stylized camera lens combined with a location pin or compass element. Dark background (#0a0a0f) with subtle gradient accents in cool blue and cyan colors matching a modern tech aesthetic. Modern, professional, suitable for iOS App Store. Square format, no text, centered design with good padding.`,
  },
  {
    name: 'blue-gradient',
    prompt: `Minimalist app icon for PhotoScout travel planning app. Clean geometric design featuring a stylized camera lens combined with a location pin. Dark background (#0a0a0f) with a beautiful blue to purple gradient glow effect. Sleek, modern, professional tech app style suitable for iOS App Store. Square format, no text, centered design with good padding.`,
  },
];

async function generateIcon(prompt: string): Promise<Buffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not set');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
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

async function main() {
  console.log('🎨 Generating App Icon Variants\n');

  for (const variant of VARIANTS) {
    console.log(`\n📸 Generating: ${variant.name}`);
    console.log(`   Prompt: ${variant.prompt.substring(0, 80)}...`);

    try {
      const imageData = await generateIcon(variant.prompt);

      const localPath = join(__dirname, `../../../appicon-${variant.name}.png`);
      writeFileSync(localPath, imageData);
      console.log(`   ✅ Saved: ${localPath}`);

      // Wait between requests
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
      if (String(error).includes('429') || String(error).includes('quota')) {
        console.log('   Quota exceeded, stopping.');
        break;
      }
    }
  }

  console.log('\n🎉 Done! Compare the variants:');
  console.log('   - appicon.png (original warm/gold)');
  console.log('   - appicon-blue.png (cool blue)');
  console.log('   - appicon-blue-gradient.png (blue-purple gradient)');
}

main().catch(console.error);
