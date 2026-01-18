/**
 * Script to regenerate HTML pages from stored JSON in DynamoDB
 *
 * Usage:
 *   npx tsx scripts/regenerate-html.ts                    # Regenerate all plans
 *   npx tsx scripts/regenerate-html.ts --plan-id=abc123   # Regenerate specific plan
 *   npx tsx scripts/regenerate-html.ts --test             # Generate test HTML (first plan found)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateHTML, TripPlan } from '../src/lib/html-template';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }));
const s3Client = new S3Client({ region: 'eu-central-1' });

const PLANS_TABLE = process.env.PLANS_TABLE || 'photoscout-plans';
const BUCKET_NAME = process.env.HTML_PLANS_BUCKET || 'photoscout-plans-707282829805';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'aiscout.photo';

interface Plan {
  visitorId: string;
  planId: string;
  city: string;
  title: string;
  dates: string;
  jsonContent?: string;
  htmlUrl?: string;
}

async function getAllPlans(): Promise<Plan[]> {
  const plans: Plan[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: PLANS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await dynamoClient.send(command);

    if (response.Items) {
      for (const item of response.Items) {
        const plan = item as Plan;
        if (plan.jsonContent) {
          plans.push(plan);
        }
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return plans;
}

async function uploadHtmlToS3(visitorId: string, planId: string, html: string): Promise<string> {
  const key = `plans/${visitorId}/${planId}.html`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: html,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=31536000',
    })
  );

  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

async function regeneratePlan(
  plan: Plan
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!plan.jsonContent) {
      return { success: false, error: 'No JSON content stored' };
    }

    const tripPlan: TripPlan = JSON.parse(plan.jsonContent);
    const html = generateHTML(tripPlan);
    const url = await uploadHtmlToS3(plan.visitorId, plan.planId, html);

    return { success: true, url };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const planIdArg = args.find((a) => a.startsWith('--plan-id='));
  const specificPlanId = planIdArg?.split('=')[1];

  console.log('🔄 HTML Regeneration Script\n');
  console.log(`Table: ${PLANS_TABLE}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log('');

  const plans = await getAllPlans();
  console.log(`📊 Found ${plans.length} plans with JSON content\n`);

  if (plans.length === 0) {
    console.log('No plans found with stored JSON content.');
    return;
  }

  // Test mode: just regenerate the first plan
  if (isTest) {
    const plan = plans[0];
    console.log(`🧪 TEST MODE: Regenerating first plan\n`);
    console.log(`  Plan ID: ${plan.planId}`);
    console.log(`  City: ${plan.city}`);
    console.log(`  Title: ${plan.title}`);

    const result = await regeneratePlan(plan);

    if (result.success) {
      console.log(`\n✅ Success!`);
      console.log(`📄 URL: ${result.url}`);
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }
    return;
  }

  // Specific plan mode
  if (specificPlanId) {
    const plan = plans.find((p) => p.planId === specificPlanId);
    if (!plan) {
      console.log(`❌ Plan not found: ${specificPlanId}`);
      console.log('\nAvailable plans:');
      plans.slice(0, 10).forEach((p) => {
        console.log(`  - ${p.planId}: ${p.title}`);
      });
      return;
    }

    console.log(`🔄 Regenerating plan: ${plan.title}\n`);
    const result = await regeneratePlan(plan);

    if (result.success) {
      console.log(`✅ Success!`);
      console.log(`📄 URL: ${result.url}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    return;
  }

  // Full regeneration mode
  console.log(`🔄 Regenerating ALL ${plans.length} plans...\n`);

  let success = 0;
  let failed = 0;

  for (const plan of plans) {
    process.stdout.write(
      `  [${success + failed + 1}/${plans.length}] ${plan.city || plan.title}... `
    );

    const result = await regeneratePlan(plan);

    if (result.success) {
      console.log('✅');
      success++;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
