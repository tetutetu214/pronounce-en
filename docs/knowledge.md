# pronounce-en — 開発中に得た知見・決定事項

## このドキュメントの位置づけ

開発中の判断・決定・ハマったポイント・試行錯誤の過程を時系列で残します。CLAUDE.md ルールに従い、セッションが変わっても状況を引き継げるようにします。

## 重要な決定事項 (Decisions)

### 2026-05-28: 発音評価は Azure 併用 (AWS 単独不可)
要件定義書 §4 で確認した事実: AWS には発音評価のマネージドサービスが存在しない (Transcribe は単語単位の confidence のみで、音素レベルスコアは無い)。心臓部の FR-4 / FR-5 を満たすため Azure AI Speech Pronunciation Assessment を MVP で採用。将来は wav2vec2 系の OSS 自前ホスト (案 B/C) への移行を残す。Azure へ日本人ユーザーの音声を送る点はプライバシーポリシーに明記する。

### 2026-05-28: 認証は Cognito Identity Pool + Developer-Authenticated Identities (案A)
LINE Web Login の ID token は HS256 署名・kid 欠落・userInfo が email を返さない、の3点で Cognito User Pool の OIDC IdP の前提を満たさない。よって素直な OIDC 連携は不可能で、Lambda で LINE ID token を verify → `GetOpenIdTokenForDeveloperIdentity` で AWS 認証情報を発行する案A 構成にする。API Gateway は Cognito Authorizer ではなく IAM 認証 + STS 構成になる。

### 2026-05-28: Bedrock のモデルは Claude Haiku 4.5
Claude 3.5 Haiku は 2026-06-19 EOL のため新規採用禁止 (要件定義書 §8)。Claude Haiku 4.5 を採用。コスト最優先時のフォールバックは Amazon Nova Lite。

### 2026-05-28: 語彙データは NGSL-Spoken + CEFR-J
NGSL-Spoken (CC BY-SA 4.0、表示・継承必須) で 721語、NGSL 上位語で約1,000語まで補完。CEFR-J Wordlist (出典明記で研究・商用可) でレベル付与。Oxford 3000/5000 は商用再配布禁止のため絶対に組み込まない。CC BY-SA の継承条項はデータベース部分に効くため、コード本体への波及範囲は実装前に専門家確認したい論点として残す。

### 2026-05-28: IaC は AWS CDK (TypeScript)
Next.js と言語が揃って Claude Code に書かせやすく、Cognito Identity Pool や EventBridge Scheduler の高水準 L2 Construct が揃っているため。Terraform や SAM ではなく CDK を選んだ。

### 2026-05-28: リージョンは us-east-1 (バージニア北部)
Bedrock Claude Haiku 4.5 の提供リージョン、てつてつが慣れている、グローバル機能の即時提供が早い、の3点で選定。

### 2026-05-28: フロントは Next.js (App Router) + TypeScript
LIFF 統合、iOS Safari MediaRecorder の取り回し、Server Actions による Lambda 呼び出しの書きやすさで選定。SvelteKit や Vite + React と比較した上で。

### 2026-05-28: monorepo 構造 (frontend / backend / infra / data)
ルートに workspace 化はせず、各ディレクトリでローカルに依存を持つシンプルな構成にする。npm workspaces などは過剰判断。

## ハマったポイント (Pitfalls)

(現時点で実装前のため、まだなし)

## 学習済み概念

CLAUDE.md の理解度テストハーネスで全問正解した概念をここに記録します (次回以降のテストスキップ判定に使用)。

- **2026-05-28 / 発音評価が Azure 併用な理由**: AWS には音素レベル発音評価を返すマネージドサービスが存在しない。Amazon Transcribe は単語単位の confidence しか返さず、要件 FR-4 / FR-5 を満たせない。よって Azure AI Speech Pronunciation Assessment を併用する。
- **2026-05-28 / LINE Login × Cognito Identity Pool (Developer-Authenticated Identities) 採用理由**: LINE Web Login の ID token は HS256 共有鍵署名で kid も無く、Cognito User Pool の OIDC IdP が要求する JWKS 検証の前提を満たさない。よって Lambda で verify → `GetOpenIdTokenForDeveloperIdentity` で AWS 認証情報を発行する案A 構成にする。
- **2026-05-28 / DynamoDB Single Table 設計のトレードオフ**: 1回の Query で関連データをまとめて取れるという効率の代償として、アクセスパターンを最初に洗い出してキー設計を固める必要がある。想定外クエリが後から出ると GSI 追加・データ移行のコストが高くなる。DynamoDB は SQL の JOIN を提供しておらず、Single Table 設計は「JOIN を実現する魔法」ではなく「JOIN が無い世界で N+1 を避けるキー設計テクニック」である。

## 一次ソースの集約

要件定義書 §17 の URL を実装で再確認するときの索引。

- AWS Transcribe feature matrix: <https://docs.aws.amazon.com/transcribe/latest/dg/feature-matrix.html>
- Polly SSML phoneme: <https://docs.aws.amazon.com/polly/latest/dg/ssml-phoneme.html>
- Bedrock Converse API: <https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html>
- Bedrock Guardrails contextual grounding: <https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html>
- Claude 3.5 Haiku EOL: <https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-5-haiku.html>
- Cognito OIDC IdP: <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html>
- EventBridge Scheduler: <https://aws.amazon.com/eventbridge/scheduler/>
- Azure Pronunciation Assessment: <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment>
- LINE Messaging API pricing: <https://developers.line.biz/en/docs/messaging-api/pricing/>
- LINE verify ID token: <https://developers.line.biz/en/docs/line-login/verify-id-token/>
- NGSL / NGSL-Spoken: <https://newgeneralservicelist.org/new-general-service-list-project-18>
- CEFR-J Wordlist: <https://cefr-j.org/download_eng>
