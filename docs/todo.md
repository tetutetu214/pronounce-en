# pronounce-en — TODO 管理

## 現在のフェーズ

**Phase -1 (計画フェーズ)** — plan.md 承認済み・理解度テスト完了。spec.md 起草中。

## 直近の TODO

- [x] plan.md をてつてつに確認してもらう (2026-05-28 承認)
- [x] 新規技術スタック導入の理解度テストを実施 (2026-05-28 全3問正解、knowledge.md 学習済み概念に追記)
- [ ] spec.md の章を埋める (Phase 0 のスコープを優先して詳細化、Phase 1〜3 は概略)
- [ ] spec.md がてつてつ承認されたら Phase 0 の実装着手 (下記タスクへ)

## Phase 0 タスク (基盤・認証・データ・語彙)

- [x] (2026-05-31) GitHub リポジトリ作成 (`tetutetu214/pronounce-en` パブリック、Secret Scanning + Push Protection 有効化)
- [x] (2026-05-31) ルートディレクトリ整備 (.gitignore, README.md) — `.env.example` は Phase 0 後半で追加
- [ ] `frontend/` で Next.js (App Router) + TypeScript プロジェクト初期化
- [ ] `infra/` で CDK プロジェクト初期化 (TypeScript)
- [ ] `backend/` で Python 3.12 Lambda の雛形を用意 (uv または rye で依存管理)
- [ ] DynamoDB Single Table を CDK で定義 (要件定義書 §12 のキー設計)
- [ ] LINE Developers Console で Channel 情報の取得 (Channel ID / Secret は `~/.secrets/pronounce-en.env`)
- [ ] LINE Login の Authorization Code + PKCE フローを Next.js で実装
- [ ] LINE ID token verify Lambda (POST `https://api.line.me/oauth2/v2.1/verify`)
- [ ] Cognito Identity Pool 作成 (CDK、Developer-Authenticated Identities)
- [ ] `cognito-identity:GetOpenIdTokenForDeveloperIdentity` 呼び出し Lambda
- [ ] フロントから OpenID token + IdentityId を受け取り、STS 認証情報を取得する処理
- [ ] NGSL-Spoken 721語の JSON 化スクリプト (`data/`)
- [ ] CEFR-J Wordlist でレベル付与 (`data/`)
- [ ] 語彙マスタを DynamoDB に投入する seed スクリプト
- [ ] 最小フロント: LINE ログイン → ホーム画面 → 単語1件表示
- [ ] Phase 0 PR 作成 → マージ
- [ ] Phase 0 完了時点で knowledge.md に「学習済み概念」追記

## Phase 1 タスク (発音コア + 習慣化)
plan.md 承認後に詳細化。

## Phase 2 タスク (AI評価 + 連結発音)
plan.md 承認後に詳細化。

## Phase 3 タスク (拡張)
plan.md 承認後に詳細化。

## 完了済み

- [x] (2026-05-28) プロジェクトディレクトリ `/home/tetutetu/projects/pronounce-en/` 作成
- [x] (2026-05-28) docs/ 配下に4ファイル + プロジェクト CLAUDE.md + .gitignore 作成
- [x] (2026-05-28) plan.md 初版作成
- [x] (2026-05-28) spec.md 初版作成 (Phase 0 詳細・Phase 1〜3 概略)
- [x] (2026-05-28) 理解度テスト全3問正解 (Azure 併用 / Cognito Identity Pool / Single Table)
- [x] (2026-05-31) README.md 作成
- [x] (2026-05-31) git init + 初回コミット (`e7ff9e9`)
- [x] (2026-05-31) GitHub リポジトリ `tetutetu214/pronounce-en` 作成 + push + Secret Scanning + Push Protection 有効化
