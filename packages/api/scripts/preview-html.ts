/**
 * Preview HTML locally without deploying
 *
 * Usage:
 *   npx tsx scripts/preview-html.ts                    # Use sample data
 *   npx tsx scripts/preview-html.ts --plan-id=abc123   # Use specific plan from DynamoDB
 *   npx tsx scripts/preview-html.ts --list             # List available plans
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { generateHTML, TripPlan } from '../src/lib/html-template';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { join } from 'path';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }));
const PLANS_TABLE = process.env.PLANS_TABLE || 'photoscout-plans';

// Sample data for quick testing without DynamoDB
const SAMPLE_PLAN: TripPlan = {
  city: 'Tokyo',
  title: 'Tokyo Photography Adventure',
  subtitle: '3-Day Urban & Cultural Circuit',
  dates: 'March 15-17, 2026',
  mapCenter: { lat: 35.6762, lng: 139.6503 },
  mapZoom: 12,
  sunriseSunset: {
    sunrise: '05:54',
    sunset: '17:53',
    note: 'March times - spring equinox approaching'
  },
  shootingStrategy: [
    'Golden hour begins around 5:00 AM and 5:00 PM',
    'Blue hour is spectacular with city lights',
    'Cherry blossoms may be starting - check forecasts'
  ],
  spots: [
    {
      number: 1,
      name: 'Senso-ji Temple',
      lat: 35.7148,
      lng: 139.7967,
      priority: 3,
      description: 'Tokyo\'s oldest temple with iconic Thunder Gate (Kaminarimon). Best photographed at dawn before crowds arrive. Use wide angle for the gate, telephoto for lantern details.',
      bestTime: 'Sunrise',
      tags: ['Architecture', 'Cultural', 'Wide Angle'],
      distanceFromPrevious: '0 km (starting point)',
      parkingInfo: 'No parking - use Asakusa Station',
      crowdLevel: 'Very low at sunrise, packed by 10am',
      accessibility: 'Fully accessible, flat ground',
      day: 1
    },
    {
      number: 2,
      name: 'Tokyo Skytree',
      lat: 35.7101,
      lng: 139.8107,
      priority: 2,
      description: 'World\'s tallest tower offers stunning city views. Photograph from below for dramatic perspective or visit observation deck for aerial shots.',
      bestTime: 'Blue Hour',
      tags: ['Architecture', 'Night', 'Cityscape'],
      distanceFromPrevious: '1.5 km walk',
      parkingInfo: 'Parking available at Skytree Town',
      crowdLevel: 'Moderate',
      accessibility: 'Fully accessible with elevators',
      day: 1
    },
    {
      number: 3,
      name: 'Shibuya Crossing',
      lat: 35.6595,
      lng: 139.7004,
      priority: 3,
      description: 'World\'s busiest pedestrian crossing. Shoot from Starbucks 2F or Shibuya Sky rooftop for bird\'s eye view. Long exposures create stunning light trails.',
      bestTime: 'Night',
      tags: ['Street', 'Night', 'Long Exposure'],
      distanceFromPrevious: '8 km by metro',
      parkingInfo: 'Use Shibuya Station',
      crowdLevel: 'Always busy - that\'s the point!',
      accessibility: 'Street level, accessible',
      day: 2
    },
    {
      number: 4,
      name: 'Meiji Shrine',
      lat: 35.6764,
      lng: 139.6993,
      priority: 2,
      description: 'Peaceful Shinto shrine surrounded by forest. The torii gates and forested paths offer serene compositions. Morning light filters beautifully through trees.',
      bestTime: 'Morning',
      tags: ['Cultural', 'Nature', 'Peaceful'],
      distanceFromPrevious: '2 km walk',
      parkingInfo: 'Limited parking, use Harajuku Station',
      crowdLevel: 'Moderate, quieter in early morning',
      accessibility: 'Gravel paths, mostly flat',
      day: 2
    },
    {
      number: 5,
      name: 'Shinjuku Gyoen',
      lat: 35.6852,
      lng: 139.7100,
      priority: 1,
      description: 'Beautiful garden with diverse landscapes. Cherry blossoms in spring, autumn colors in fall. Great for portrait photography with Tokyo skyline backdrop.',
      bestTime: 'Golden Hour',
      tags: ['Nature', 'Garden', 'Portrait'],
      distanceFromPrevious: '3 km by metro',
      parkingInfo: 'Small parking lot available',
      crowdLevel: 'Moderate, busy during hanami season',
      accessibility: 'Paved paths, wheelchair accessible',
      day: 3
    }
  ],
  route: [
    { lat: 35.7148, lng: 139.7967 },
    { lat: 35.7101, lng: 139.8107 },
    { lat: 35.6595, lng: 139.7004 },
    { lat: 35.6764, lng: 139.6993 },
    { lat: 35.6852, lng: 139.7100 }
  ],
  practicalInfo: {
    totalDistance: '15 km walking + metro',
    estimatedTime: '3 days',
    accommodation: 'Stay in Shinjuku or Asakusa for easy access',
    transportation: 'Get a 72-hour Tokyo Metro pass',
    weatherBackup: 'Tokyo Station underground, department store rooftops'
  }
};

interface Plan {
  visitorId: string;
  planId: string;
  city: string;
  title: string;
  jsonContent?: string;
}

async function getPlansFromDynamoDB(): Promise<Plan[]> {
  const command = new ScanCommand({
    TableName: PLANS_TABLE,
    Limit: 20,
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).filter(p => p.jsonContent) as Plan[];
}

async function main() {
  const args = process.argv.slice(2);
  const listPlans = args.includes('--list');
  const planIdArg = args.find(a => a.startsWith('--plan-id='));
  const specificPlanId = planIdArg?.split('=')[1];

  const outputPath = join(process.cwd(), 'preview.html');

  // List available plans
  if (listPlans) {
    console.log('📋 Available plans in DynamoDB:\n');
    const plans = await getPlansFromDynamoDB();
    if (plans.length === 0) {
      console.log('  No plans found with JSON content.');
    } else {
      plans.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.planId}`);
        console.log(`     ${p.title || p.city}`);
        console.log('');
      });
    }
    return;
  }

  let tripPlan: TripPlan;

  // Use specific plan from DynamoDB
  if (specificPlanId) {
    console.log(`🔍 Loading plan ${specificPlanId} from DynamoDB...`);
    const plans = await getPlansFromDynamoDB();
    const plan = plans.find(p => p.planId === specificPlanId);

    if (!plan || !plan.jsonContent) {
      console.log(`❌ Plan not found or has no JSON content: ${specificPlanId}`);
      console.log('\nUse --list to see available plans.');
      return;
    }

    tripPlan = JSON.parse(plan.jsonContent);
    console.log(`✅ Loaded: ${tripPlan.title}\n`);
  } else {
    // Use sample data
    console.log('📝 Using sample Tokyo data (use --plan-id=xxx for specific plan)\n');
    tripPlan = SAMPLE_PLAN;
  }

  // Generate HTML
  console.log('🔨 Generating HTML...');
  const html = generateHTML(tripPlan);

  // Write to file
  writeFileSync(outputPath, html);
  console.log(`📄 Saved to: ${outputPath}`);

  // Open in browser
  console.log('🌐 Opening in browser...\n');

  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' :
                  platform === 'win32' ? 'start' : 'xdg-open';

  exec(`${command} ${outputPath}`, (error) => {
    if (error) {
      console.log(`Could not open browser automatically. Open manually: ${outputPath}`);
    }
  });

  console.log('💡 Tip: Edit html-template.ts, then run this command again to see changes instantly!');
}

main().catch(console.error);
