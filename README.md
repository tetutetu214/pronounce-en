# pronounce-en

発音重視の英語学習アプリ。日本人学習者の「知っている英語」を「使える英語」に引き上げることを目指す、AWS サーバーレス + LINE + Azure 発音評価ベースの個人開発プロジェクトです。

## 現状

**Phase 0 (基盤構築) 着手中。** 統合要件定義書 v1.0 を踏まえた計画・詳細仕様は `docs/` 配下にあります。

| ドキュメント | 内容 |
|---|---|
| [docs/plan.md](docs/plan.md) | 上流の計画書 (4本柱・技術スタック・段階リリース) |
| [docs/spec.md](docs/spec.md) | Phase 0 詳細仕様 (画面・API・データ・CDK Stack 構成) |
| [docs/todo.md](docs/todo.md) | フェーズ別タスク管理 |
| [docs/knowledge.md](docs/knowledge.md) | 開発中の決定事項・学習済み概念・一次ソース索引 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 向けのプロジェクト固有ルール |

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) + TypeScript |
| バックエンド | API Gateway + Lambda (Python 3.12) |
| データ | Amazon DynamoDB (Single Table) |
| 認証 | LINE Login + Amazon Cognito Identity Pool (Developer-Authenticated Identities) |
| 発音評価 | Azure AI Speech Pronunciation Assessment |
| 模範音声 | Amazon Polly (SSML phoneme) |
| AI 評価 | Amazon Bedrock Converse API (Claude Haiku 4.5) + Guardrails |
| 音声→テキスト | Amazon Transcribe |
| 通知 | LINE Messaging API (Push / Flex Message) |
| スケジューラ | Amazon EventBridge Scheduler |
| IaC | AWS CDK (TypeScript) |
| 監視 | Amazon CloudWatch Logs + AWS X-Ray |

リージョンは `us-east-1` (バージニア北部) 固定。

## ディレクトリ構造 (予定)

```
pronounce-en/
├── docs/        計画・仕様・タスク・知見
├── frontend/    Next.js (App Router) + TypeScript     [Phase 0 で追加]
├── backend/     Lambda (Python 3.12)                  [Phase 0 で追加]
├── infra/       AWS CDK (TypeScript)                  [Phase 0 で追加]
├── data/        NGSL / CEFR-J 加工スクリプト           [Phase 0 で追加]
├── CLAUDE.md
├── .gitignore
└── README.md
```

## ライセンス

本リポジトリのコードは MIT を予定 (Phase 0 終了時に LICENSE ファイルを追加)。本アプリが組み込む第三者データのライセンスは以下のとおり。

- **NGSL / NGSL-Spoken** ([newgeneralservicelist.org](https://newgeneralservicelist.org/)) — CC BY-SA 4.0。表示および継承条項に従って利用します。
- **CEFR-J Wordlist** ([cefr-j.org](https://cefr-j.org/download_eng)) — 出典明記の条件で研究・商用利用可。

Oxford 3000 / 5000 / Phrase List は再配布条件を満たせないため組み込みません。

## 開発の進め方

- 計画 → 仕様 → 実装の順で `docs/` を更新しながら段階リリース (Phase 0 → 3)。
- ブランチ運用は Conventional Commits に準拠。機能系 (feat / fix / refactor) は feature ブランチ + PR、雑務系 (chore / docs / test) は main 直接コミット可。
- 詳細は `CLAUDE.md` 参照。
