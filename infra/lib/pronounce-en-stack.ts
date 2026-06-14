import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

// pronounce-en の Phase 0 スタック。
// DynamoDB Single Table + GSI1、Cognito Identity Pool、Lambda、API Gateway を
// このスタックにまとめて定義する (spec.md §0-6)。
// リソース定義は後続タスク (B: DynamoDB, C: Cognito) で追加する。
export class PronounceEnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ここに Phase 0 のリソースを定義していく。
  }
}
