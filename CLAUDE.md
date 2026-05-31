# pronounce-en — プロジェクト固有 CLAUDE 指示

このプロジェクト固有のルールです。グローバル `~/.claude/CLAUDE.md` の指示は引き続き有効で、本書はその上に積まれます。

## プロジェクト概要

発音重視の英語学習アプリ。要件定義書 v1.0 (統合版) を起点に、Phase 0 → 3 の段階リリースで構築します。詳細は `docs/plan.md` を参照。

## 使用スタック (確定済み)

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) + TypeScript |
| バックエンド | API Gateway + Lambda (Python 3.12) |
| データ | DynamoDB Single Table |
| 認証 | LINE Login + Cognito Identity Pool (Developer-Authenticated Identities) |
| 発音評価 | Azure AI Speech Pronunciation Assessment (外部API) |
| 模範音声 | Amazon Polly (SSML phoneme) |
| AI評価 | Amazon Bedrock Converse API (Claude Haiku 4.5) + Guardrails |
| 音声→テキスト | Amazon Transcribe |
| 通知 | LINE Messaging API (Push / Flex Message) |
| スケジューラ | Amazon EventBridge Scheduler |
| IaC | AWS CDK (TypeScript) |
| 監視 | CloudWatch Logs + X-Ray |

**リージョン: us-east-1 (バージニア北部) 固定。**

## ディレクトリ構造

```
pronounce-en/
├── docs/                # plan.md, spec.md, todo.md, knowledge.md
├── frontend/            # Next.js
├── backend/             # Lambda (Python 3.12)
├── infra/               # AWS CDK (TypeScript)
├── data/                # NGSL / CEFR-J 加工スクリプト
├── CLAUDE.md
├── .gitignore
├── .env.example
└── README.md
```

## 絶対に守るルール

### 1. 発音評価は Azure を使う (AWS では作らない)
AWS には発音評価のマネージドサービスが存在しないため、MVP は Azure AI Speech Pronunciation Assessment を採用しています。「AWS にあるはず」と推測して Transcribe で発音評価しようとしないこと (公式に出来ないことが確認済み)。

### 2. Claude 3.5 Haiku は新規採用禁止
2026-06-19 EOL のため。Bedrock のモデルは **Claude Haiku 4.5** を使用してください。コスト最優先時のフォールバックは Amazon Nova Lite。

### 3. Oxford 3000 / 5000 / Phrase List は組み込み禁止
商用再配布禁止のため。語彙データは **NGSL-Spoken (CC BY-SA 4.0、表示・継承必須)** と **CEFR-J Wordlist (出典明記必須)** のみ。

### 4. AWS アカウント ID / IAM ユーザー名はリポジトリに書かない
`~/.secrets/pronounce-en.env` に保存し、ドキュメント・コードからは参照のみ。グローバルメモリの `feedback_aws_identifiers_not_in_docs` ルール準拠。

### 5. 音声データは S3 TTL 自動削除
ユーザー音声は短期間のみ保存。Azure 越境送信はプライバシーポリシーに明記。

### 6. Azure サブスクリプションは未取得 (Phase 1 直前にセットアップ)
Phase 0 完了後、Phase 1 着手直前にてつてつへセットアップ手順を案内します。Phase 0 では Azure に触れません。

### 7. en-US 固定
Azure Pronunciation Assessment の Prosody は en-US のみ対応のため。MVP では方言・他英語圏は対応しません。

## 開発フロー (グローバルルール準拠)

各 Phase 完了時に PR を1本作って main にマージ。雑務系 (`docs` / `chore` / `test`) は main 直接コミット可、機能系 (`feat` / `fix` / `refactor`) は feature ブランチ + PR 必須。

コミットは「論理的な区切りごと」 (機能追加、CDK Stack 追加、認証フロー実装、語彙データ投入、など) で commit + push を1セット。まとめてコミットは禁止。

## 着手前に確認すること

実装着手 (`Phase 0 の第1タスク`) の前に、以下を確認:

1. `docs/plan.md` がてつてつ承認済みか
2. `docs/spec.md` が埋まっているか (現状は空のスケルトン)
3. AWS 認証状態 (`aws sts get-caller-identity` で確認、未認証なら `aws login` をてつてつに依頼)
4. LINE Developers Console の Channel 情報 (Channel ID / Channel Secret) が `~/.secrets/pronounce-en.env` にあるか

## テスト方針 (グローバルルールの再掲)

- DB / 外部 API は本物が使える環境ならモックしない
- Azure / Bedrock 等の従量課金 API は開発時はダミー応答モードを Lambda 内に用意
- test name は「振る舞い」で書く (実装手順を書かない)
- 1 it = 1 目的
- LLM 委譲時は実装前にエッジケースを列挙させてから書かせる

## 進捗の保存先

- 設計判断・決定事項 → `docs/knowledge.md`
- タスク進捗 → `docs/todo.md`
- 上位計画 → `docs/plan.md`
- 詳細仕様 → `docs/spec.md`
- 本書 (使用スタック・絶対ルール) → `CLAUDE.md`
