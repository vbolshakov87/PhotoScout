#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PhotoScoutStack } from '../lib/photoscout-stack';

const app = new cdk.App();
new PhotoScoutStack(app, 'PhotoScoutStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
  },
});
