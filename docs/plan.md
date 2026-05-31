# pronounce-en — プロジェクト計画書 (plan.md)

## このドキュメントの位置づけ

統合要件定義書 v1.0 (英語学習アプリ・発音重視) を実装するための、上流の計画書です。要件定義書がアプリの「何を作るか・なぜ作るか」を一次ソース付きで述べているのに対し、この plan.md は「どう作るか・どの順で作るか」を決めます。これに合意したら次に `spec.md` で詳細仕様 (API・画面・データ) に降ろします。

## プロダクト概要

「知っている英語」を「使える英語」へ引き上げるための、日本人学習者向け個人開発アプリです。発音を起点に、複数話者での聞き分け (知覚) → 音読・発話 (産出) → 音素レベル FB → 説明アウトプット (教えて学ぶ) → 振り返り、という1つのループを毎日まわすことを中核体験とします。要件定義書の §1 で示された4本柱 (戦略・進め方・時間の使い方・モチベーション) をそのままアプリの主要モジュールにマップします。

ターゲットは中級まで (CEFR A2〜B1 想定) の日本人学習者。MVP は1ユーザー (てつてつ本人) で動かしてフィードバックループを回し、その後で公開を検討します。

## 確定した技術スタック

確定済みの選定は次のとおりです。代替案を比較した上で選んでいます (てつてつの学習用にも理由を残しておきます)。

**フロントエンド: Next.js (App Router) + TypeScript** を採用します。理由は、(1) iOS Safari の MediaRecorder API を素直に扱える、(2) Server Actions で API Gateway 越しの Lambda 呼び出しを書きやすく、認証コールバックを Next.js のルートで処理できる、(3) 将来 LIFF (LINE 内ブラウザ) を組み込むときの相性が良い、の3点です。SvelteKit や Vite + React と比較すると、Claude Code に書かせる実装事例の量と、Amplify Hosting / CloudFront との相性で勝ります。

**認証: LINE Login + Cognito Identity Pool (Developer-Authenticated Identities)** を採用します。要件定義書 §10 で示されたとおり、LINE Web Login の ID token は HS256 署名 (共有鍵) で `kid` も無く、Cognito User Pool の OIDC IdP の前提を満たしません。よって素直な OIDC 連携は不可能で、Identity Pool 側で LINE ID token を Lambda で verify し、Developer-Authenticated Identities として AWS 認証情報を発行する案A 構成にします。

**バックエンド: API Gateway + Lambda (Python 3.12)** を採用します。リージョンは us-east-1 (バージニア北部) で、Bedrock Claude Haiku 4.5 が提供されていることを前提にします。

**データ: DynamoDB Single Table 設計**。要件定義書 §12 のキー設計をそのまま採用します。ユーザー軸の高速アクセスと、語彙マスタを同居させる構成です。

**発音評価: Azure AI Speech Pronunciation Assessment**。これが本アプリの心臓部です。要件定義書 §4 で確認したとおり、AWS には発音評価のマネージドサービスが存在しません (Amazon Transcribe は「何を言ったか」しか返さず、音素レベルのスコアは無いことを公式ドキュメントで確認済み)。Azure は phoneme / syllable / word / full-text の4階層スコアと IPA 表記を返すため、要件 FR-4・FR-5 を最短で満たせます。en-US 限定 (Prosody が en-US のみ) という制約は MVP で許容します。

**模範音声: Amazon Polly (SSML `<phoneme>`)**。careful 版と reduced 版 (wanna・get up の flapping など) を SSML で IPA 指定して作り分けます。

**AI評価 (教えて学ぶ): Amazon Bedrock Converse API + Claude Haiku 4.5**。要件定義書 §8 のとおり、Claude 3.5 Haiku は 2026-06-19 EOL のため絶対に新規採用しません。Guardrails の contextual grounding で辞書定義との整合性チェックをかけ、不合格なら再生成または「AIが自信を持てません」表示にフォールバックします。

**通知: LINE Messaging API (Push / Flex Message)**。MVP は Communication Plan (月200通無料) で開始します。1ユーザー1日2通だと約3ユーザーで上限に達するため、本格運用前に Light Plan への切替を計画します。

**スケジューラ: Amazon EventBridge Scheduler**。月14M invocations が恒久無料枠なので、個人開発では実質ゼロ円です。MVP はバッチ案 (5〜15分間隔で due 抽出 → Push) で開始し、ユーザー個別時刻ニーズが出てから per-user スケジュールへ移行します。

**インフラ IaC: AWS CDK (TypeScript)**。Next.js と言語が揃って Claude Code に書かせやすく、Construct Library が充実しています。Terraform や SAM と比較すると、(1) TS の型補完で構成ミスを早期発見できる、(2) Cognito Identity Pool や EventBridge Scheduler の高水準 L2 が揃っている、(3) てつてつが過去プロジェクトで触ったことがある、の3点で選びます。

**フロント配信: Next.js は当初は Vercel ではなく、AWS Amplify Hosting または S3 + CloudFront で配信します。** Phase 0 着手時に最終決定しますが、Amplify Hosting のほうが Next.js App Router の SSR ルートをそのままホストできるので有力です。

**監視: CloudWatch Logs + X-Ray**。標準構成。

**リージョン: us-east-1 (バージニア北部)** 固定。

## 段階リリース計画

要件定義書 §15 のロードマップを踏襲し、各 Phase を1つの PR (または小 PR 群) にまとめて段階的にマージしていきます。

**Phase 0 — 基盤 (認証・データ・語彙の足回り)** では、GitHub リポジトリ作成、Next.js + CDK のプロジェクト初期化、DynamoDB スキーマ確定、Cognito Identity Pool と LINE verify Lambda、NGSL-Spoken 721語の JSON 化 (CC BY-SA 4.0 表記)、CEFR-J レベル付与、語彙マスタの seed 投入、そして最小フロント (ログイン → 単語1件表示) までを作ります。Phase 0 の完了基準は「LINE ログインして、自分の DynamoDB に書き込めて、語彙1件が画面に出る」。

**Phase 1 — 発音コア + 習慣化** では、Azure 発音評価のセットアップ案内・録音UI・S3 presigned PUT・Lambda → Azure API・音素 FB 可視化・HVPT 聞き分け・Polly 模範音声・SMART 目標ウィザード・週次プラン (ルールベースのみ)・SM-2 間隔反復・EventBridge Scheduler から LINE Push・ストリーク・バッジ、そしてプライバシーポリシー (Azure 越境送信明記) を整えます。完了基準は「毎日 LINE が来て、録音すると音素 FB が出る」。

**Phase 2 — AI評価 + 連結発音** では、Bedrock Converse API による説明評価 (テキスト入力先行)、Guardrails contextual grounding、週次プランの LLM 自然言語化 (骨格はルール固定で「LLM が復習を忘れる」事故を防ぐ)、connected speech カリキュラム、Polly careful/reduced 音声ペアまで。

**Phase 3 — 拡張** では、説明アウトプットの音声入力 (Transcribe)、週次リフレクション、難易度キャリブレーション、LIFF 設定画面、(任意) 発音評価の AWS 内製化検討。

各 Phase 終了時に、要件定義書 §15 末尾のベンチマーク (Azure 月額 $50超でAWS内製化検討、Bedrock $50超で Nova Lite 検討、LINE MAU100超で Light Plan、Guardrail フラグ率 >10% で改善) を見ながら次の調整を判断します。

## ディレクトリ構造 (暫定)

```
pronounce-en/
├── docs/                # plan.md, spec.md, todo.md, knowledge.md
├── frontend/            # Next.js (App Router) + TypeScript
├── backend/             # Lambda ハンドラ (Python 3.12)
│   ├── functions/       # 機能ごとのハンドラ
│   ├── shared/          # 共通ユーティリティ (DynamoDB, LINE verify など)
│   └── tests/
├── infra/               # AWS CDK (TypeScript)
│   ├── bin/
│   ├── lib/
│   └── test/
├── data/                # NGSL/CEFR-J 加工スクリプト・出力JSON
├── CLAUDE.md            # プロジェクト固有のルール
├── .gitignore
├── .env.example
└── README.md
```

monorepo の各ディレクトリは独立して `package.json` / `pyproject.toml` を持ちます。ルートに workspace 化はせず、各ディレクトリでローカルに依存を持つシンプルな構成にします (npm workspaces などは過剰判断)。

## プライバシー・制約・禁止事項

音声データは S3 へ presigned PUT で短期間 (TTL 削除) のみ保存します。Azure 越境送信は MVP の前提なのでプライバシーポリシーに明記します。NGSL は CC BY-SA 4.0 (表示・継承必須)、CEFR-J は出典明記必須、Oxford 3000/5000 は商用再配布禁止のため絶対に組み込みません。Azure Prosody は en-US 限定なので MVP は en-US に固定。Claude 3.5 Haiku は EOL のため新規採用禁止 (代わりに Claude Haiku 4.5)。AWS アカウント ID や IAM ユーザー名はパブリックリポジトリに書かず、`~/.secrets/pronounce-en.env` に置きます。

## コスト試算 (要件定義書 §14 の数字を踏襲)

月100アクティブユーザ規模で AWS 分が約 $15〜25、Azure 分が約 $10〜 (利用量次第)。個人開発フェーズ (てつてつ単独利用) ではほぼ無料枠内に収まる見込みです。実装中の試行回数を増やしても、EventBridge Scheduler / Lambda / DynamoDB / S3 はすべて無料枠で吸収できる規模です。Bedrock と Azure だけは従量で本物の料金が発生するので、開発時はテスト用ダミー応答モードを各 Lambda に用意して呼び出し回数を抑える設計にします。

## このプランで合意したい論点

1. 全体方針 (4本柱・中核ループ・段階リリース計画 Phase 0〜3) でよいか。
2. 技術スタックの確定 (特に IaC = CDK TypeScript、認証 = Identity Pool Developer-Authenticated、発音評価 = Azure、リージョン = us-east-1)。
3. monorepo の暫定ディレクトリ構造 (frontend / backend / infra / data) でよいか。
4. Phase 0 の最初のタスクとして「GitHub リポジトリ作成 → Next.js + CDK 初期化 → DynamoDB スキーマ → 語彙データ加工」の順で着手してよいか。
5. Azure サブスクリプションの取得タイミングは Phase 1 直前 (Phase 0 完了後) で良いか。

## 次のステップ

この plan.md に てつてつが OK を出したら、(1) 新規技術スタック導入の理解度テスト (CLAUDE.md ルール) を AskUserQuestion で実施し、(2) その後 spec.md に画面・API・データの詳細仕様を起こします。spec.md OK後にようやく実装着手 (Phase 0 第1タスクの GitHub リポジトリ作成) です。
