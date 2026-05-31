# pronounce-en — 詳細仕様書 (spec.md)

## このドキュメントの位置づけ

plan.md で合意した方針を、画面・API・データモデル・フローのレベルに落とし込んだ仕様書です。本書は **Phase 0 のスコープを詳細化** し、Phase 1〜3 は概略のみ示します。各 Phase 着手時にこのファイルへ追補します。

---

## Phase 0 詳細仕様

### 0-1. Phase 0 完了条件 (Definition of Done)

「てつてつが iPhone / PC のブラウザから LINE ログインし、AWS 認証情報を得たフロントが API Gateway 経由で自分用の DynamoDB レコードを書き込み、サンプル語彙1件をホーム画面に表示できる」。

これだけ動けば、それ以降の Phase 1 機能 (録音・Azure 発音評価・LINE Push) を順次積めます。

### 0-2. 画面一覧と遷移

Phase 0 では3画面のみ。

| パス | 役割 | 主な要素 |
|---|---|---|
| `/login` | LINE ログイン入口 | 「LINE でログイン」ボタン1つ。クリックで LINE の認可エンドポイントへリダイレクト |
| `/auth/callback` | LINE Login コールバック | URL クエリの `code` と `state` を受け取り、Server Action で `/api/auth/line` を叩く。成功すれば `/home` へ |
| `/home` | 最小ホーム | LINE 表示名・サンプル語彙1件・ログアウトボタン |

遷移は `未ログイン → /login → LINE 認可画面 → /auth/callback → /home`。`/home` を直接開いたとき AWS 認証情報が無ければ `/login` にリダイレクト。

### 0-3. API エンドポイント (Phase 0)

API Gateway は REST API を採用。Phase 0 では3つのみ。

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| POST | `/auth/line` | 無し (LINE ID token を body で受け取り Lambda 内検証) | LINE ID token 検証 → Identity Pool `GetOpenIdTokenForDeveloperIdentity` 呼び出し → `IdentityId` と `OpenIdToken` を返す |
| GET | `/me` | AWS IAM (SigV4) | リクエスト元の `cognito:sub` から `USER#<uid>` を引いて `PROFILE` を返す。初回アクセス時はレコードを作成 |
| GET | `/word/{wordId}` | AWS IAM (SigV4) | `WORD#<wordId> / META` を返す |

リクエスト/レスポンスの JSON Schema は実装時に backend 側で `pydantic` で定義します。

### 0-4. 認証フロー詳細

要件定義書 §10 の案A を実装に落とし込んだフローは以下のとおり。

```
[ブラウザ /login]
   ↓ "LINE でログイン" クリック
   ↓ window.location = https://access.line.me/oauth2/v2.1/authorize?
       response_type=code
       &client_id=<LINE Channel ID>
       &redirect_uri=<https://app.example.com/auth/callback>
       &state=<csrf>
       &nonce=<nonce>
       &scope=openid profile
       &code_challenge=<sha256(verifier)>
       &code_challenge_method=S256
[LINE 認可画面]
   ↓ ユーザー承認
[ブラウザ /auth/callback?code=…&state=…]
   ↓ Server Action: POST /api/auth/line { code, state, code_verifier }
[Lambda: auth-line]
   1. state を検証 (Next.js Server Actions の httpOnly Cookie と照合)
   2. POST https://api.line.me/oauth2/v2.1/token (code + verifier) → access_token + id_token
   3. POST https://api.line.me/oauth2/v2.1/verify (id_token, Channel ID) → ID token 妥当性確認
   4. ID token claim の sub (LINE userId "U...") を取り出す
   5. cognito-identity:GetOpenIdTokenForDeveloperIdentity を呼ぶ
      Logins = { "login.pronounce-en.line": "<LINE sub>" }
   6. IdentityId と OpenIdToken をレスポンス
[ブラウザ /auth/callback]
   7. クライアント側で cognito-identity:GetCredentialsForIdentity を叩き、AWS STS 認証情報を取得
   8. STS 認証情報を sessionStorage (またはメモリ) に保持
   9. /home へ遷移
[ブラウザ /home]
   10. STS 認証情報で GET /me を SigV4 署名して呼ぶ
   11. 初回なら Lambda 側で DynamoDB に PROFILE レコードを作成
```

LINE Channel ID / Channel Secret / Developer Provider Name (`login.pronounce-en.line`) は `~/.secrets/pronounce-en.env` で管理し、Lambda には Parameter Store SecureString 経由で渡します。CDK では `StringParameter.fromSecureStringParameterAttributes` を使い、Lambda 環境変数には ARN だけ渡して実行時に取得します。

### 0-5. DynamoDB スキーマ (Phase 0 範囲)

Single Table。テーブル名は `pronounce-en-main` (CDK で stack 名を prefix)。

| PK | SK | 主属性 | Phase 0 で使うか |
|---|---|---|---|
| `USER#<uid>` | `PROFILE` | `lineUserId`, `displayName`, `pictureUrl`, `createdAt`, `lastLoginAt` | ◯ |
| `WORD#<wordId>` | `META` | `text`, `ipa`, `cefrjLevel`, `definition`, `examples` (Phase 0 では空でも可), `voices` (Phase 1 で追加) | ◯ |
| `USER#<uid>` | `PROGRESS#<wordId>` | `status`, `pronScore`, `lastStudied` | Phase 1 から |
| `USER#<uid>` | `SM2#<wordId>` | `EF`, `repetitions`, `interval`, `nextReviewAt` | Phase 1 から |
| `USER#<uid>` | `PHONEME#<ipa>` | `failCount`, `weight` | Phase 1 から |
| `USER#<uid>` | `GOAL#<goalId>` | `title`, `smartFields`, `start/endDate`, `progressPct` | Phase 1 から |
| `USER#<uid>` | `WEEKPLAN#<isoWeek>` | `tasksByDay`, `generatedBy`, `modelId` | Phase 1〜2 |
| `USER#<uid>` | `EXPLAIN#<wordId>#<ts>` | `inputType`, `transcript`, `llmScores`, `guardrailFlag` | Phase 2 から |
| `USER#<uid>` | `BADGE#<key>` | `earnedAt`, `criteria` | Phase 1 から |
| `USER#<uid>` | `REFLECT#<isoWeek>` | `selfEvalScore`, `attribution`, `nextWeekIntent` | Phase 3 から |

GSI は Phase 0 では作成しません。Phase 1 で SM-2 の due 抽出に必要になったタイミングで `GSI1` (PK: `nextReviewBucket`, SK: `nextReviewAt`) を追加します。`uid` は LINE userId そのものではなく、Cognito Identity Pool が払い出す `IdentityId` (例: `us-east-1:xxxx-xxxx-xxxx`) を使います。これによりユーザー削除や Identity Pool の再作成時に LINE 側に依存せず済みます。

### 0-6. CDK Stack 構成 (Phase 0)

Phase 0 では1スタックでまとめて作ります。

```
infra/lib/pronounce-en-stack.ts
├─ DynamoDB Table (Single Table, on-demand)
├─ Cognito Identity Pool
│  ├─ AuthenticatedRole (DynamoDB に自分の USER#<id> 配下だけアクセスできる IAM ポリシー)
│  └─ Developer Provider 設定 (login.pronounce-en.line)
├─ SSM Parameter (LINE Channel ID, Channel Secret は SecureString)
├─ Lambda Functions (Python 3.12, AWS PowerTools)
│  ├─ AuthLineHandler        (POST /auth/line)
│  ├─ MeHandler              (GET /me)
│  └─ WordHandler            (GET /word/{wordId})
└─ REST API Gateway
   ├─ POST /auth/line       → AuthLineHandler   (AuthorizationType.NONE)
   ├─ GET  /me              → MeHandler          (AuthorizationType.IAM)
   └─ GET  /word/{wordId}   → WordHandler        (AuthorizationType.IAM)
```

IAM ポリシーは「`USER#${cognito-identity.amazonaws.com:sub}` 配下のみ」を `dynamodb:LeadingKeys` 条件で絞ります。これでユーザーが他人の進捗を読めない設計を構造で保証します。

### 0-7. フロントエンド構成 (Next.js / Phase 0)

```
frontend/
├─ app/
│  ├─ login/page.tsx
│  ├─ auth/callback/page.tsx
│  ├─ home/page.tsx
│  └─ layout.tsx
├─ lib/
│  ├─ aws/credentials.ts   (Cognito Identity Pool で STS を取る)
│  ├─ aws/signRequest.ts   (SigV4 署名)
│  └─ line/pkce.ts         (PKCE verifier 生成)
├─ public/
├─ package.json
├─ tsconfig.json
└─ next.config.mjs
```

AWS SDK は `@aws-sdk/client-cognito-identity` のみブラウザに含め、DynamoDB クライアントはブラウザに入れません (Lambda 経由で全データを取る原則)。

### 0-8. 語彙データ加工 (Phase 0 完了の必須要素)

`data/` 配下に NGSL と CEFR-J を加工するスクリプトを置きます。

```
data/
├─ raw/                    (.gitignore 対象、ローカルのみ)
│  ├─ ngsl-spoken.csv      (newgeneralservicelist.org からダウンロード)
│  └─ cefrj-wordlist.csv   (cefr-j.org からダウンロード)
├─ scripts/
│  ├─ build_wordlist.py    (NGSL-Spoken 721 + NGSL 上位280 → 約1000語、CEFR-J でレベル付与)
│  └─ seed_dynamodb.py     (build_wordlist.py の出力を DynamoDB へ batch_write)
├─ output/
│  └─ words.json           (生成物。Git 管理する)
└─ README.md               (CC BY-SA 4.0 表示、CEFR-J 出典明記)
```

`words.json` の1要素は次の形を想定:

```json
{
  "wordId": "make",
  "text": "make",
  "ipa": "meɪk",
  "cefrjLevel": "A1",
  "source": ["NGSL-Spoken", "CEFR-J"],
  "definition": null,
  "examples": []
}
```

definition と examples は Phase 0 では null / 空でよく、Phase 2 着手時に充足します。

### 0-9. Phase 0 のテスト方針

- **backend**: pytest で Lambda ハンドラの単体テスト。LINE ID token 検証は本物の token (てつてつの手元で取得したもの) を fixtures に持ち込み、検証成功/失敗を確認します。Cognito Identity Pool API は moto でモック (本物だと毎テストで IdentityId が増えるため例外的にモック許容)。
- **frontend**: Vitest で `lib/aws/credentials.ts` と `lib/line/pkce.ts` の単体テスト。Playwright で `/login → /auth/callback → /home` の E2E は Phase 0 終了時に1本だけ書きます。
- **infra**: CDK の `Template.fromStack` でリソースカウントだけ確認するスナップショットテスト。

### 0-10. Phase 0 のコミット粒度

論理的な区切りで commit + push を1セット。想定する粒度:

1. プロジェクト初期化 (Next.js / CDK / backend / data の各ディレクトリ + README)
2. CDK で DynamoDB と Identity Pool だけ先に立てる
3. LINE verify Lambda + auth/line API
4. フロントの /login と /auth/callback (まずモック応答で接続確認)
5. /home と /me Lambda
6. 語彙データ加工 + seed
7. /word/{wordId} Lambda + /home に表示
8. Playwright E2E 1本
9. README / 環境変数ドキュメント整備

各コミットで feat / chore / docs などの type を使い分け、機能系 (feat) は feature ブランチ + PR、雑務系 (chore / docs) は main 直接コミット可。

---

## Phase 1 概略 (発音コア + 習慣化)

実装着手時に本書へ詳細化を追補します。現時点では下記レベル。

- 録音 UI (MediaRecorder API、iOS Safari 対応、16kHz mono WAV)
- S3 presigned PUT (TTL 24h)
- Lambda → Azure AI Speech Pronunciation Assessment 呼び出し
- 音素 IPA タイムラインの可視化 (赤/黄/緑)
- HVPT 聞き分けドリル (Polly で3話者の音声を事前生成)
- SMART 目標ウィザード
- 週次プラン生成 (ルールベース骨格のみ)
- SM-2 アルゴリズム実装
- EventBridge Scheduler (5分間隔の due 抽出バッチ)
- LINE Messaging API Push (Flex Message)
- ストリーク・バッジ
- プライバシーポリシー作成 (Azure 越境送信明記)

## Phase 2 概略 (AI評価 + 連結発音)

- Bedrock Converse API (Claude Haiku 4.5) で説明評価
- Bedrock Guardrails contextual grounding (辞書定義との整合)
- 週次プランの LLM 自然言語化 (骨格はルールで固定)
- connected speech カリキュラム (7カテゴリ)
- Polly careful 版 / reduced 版の音声ペア
- connected speech 聞き分け・産出採点

## Phase 3 概略 (拡張)

- 説明音声の文字起こし (Transcribe)
- 週次リフレクション
- 難易度キャリブレーション
- LIFF 設定画面
- (任意) 発音評価の AWS 内製化検討 (案 C)

---

> Phase 0 の詳細はここで一旦固めます。本書を承認いただいたら GitHub リポジトリ作成から実装に着手します。
