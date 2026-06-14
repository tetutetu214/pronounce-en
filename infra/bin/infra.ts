#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { PronounceEnStack } from '../lib/pronounce-en-stack';

const app = new cdk.App();

// リージョンは us-east-1 固定 (CLAUDE.md / spec.md)。
// アカウント ID はコードに書かず、デプロイ時の CLI 認証情報 (CDK_DEFAULT_ACCOUNT) から解決する。
new PronounceEnStack(app, 'PronounceEnStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});
