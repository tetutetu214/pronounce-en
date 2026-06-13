# pronounce-en — 統合要件定義書 v2.0

> **このドキュメントの位置づけ**
> 本書は「**何を・なぜ作るか**」を一次ソース付きで定義する最上流ドキュメントです。「どう作るか・どの順で作るか」は [`plan.md`](./plan.md)、「画面・API・データの詳細仕様」は [`spec.md`](./spec.md) が担います。読む順序は **requirements (本書) → plan → spec** です。
>
> v1.0 は対話ベースで作成されファイルが残っていなかったため、plan.md / spec.md / knowledge.md に残った参照と、2026-06-13 時点の一次ソース再検証をもとに v2.0 として再構成しました。再検証の結果は §17 と各章の脚注に反映済みです。

---

## 0. ドキュメント規約

- **要件 ID**: 機能要件は `FR-x.y`、非機能要件は `NFR-x`、制約は `C-x` で表記します。
- **各機能要件は「受け入れ基準 (AC: Acceptance Criteria)」を必ず持ちます。** 「達成したか」を測定可能な形で書き、後の受け入れテストにそのまま対応させます。
- **優先度**: `P0` (MVP 必須 / Phase 0–1) / `P1` (重要 / Phase 1–2) / `P2` (拡張 / Phase 2–3)。
- **未確定の事項は §16.4「未決事項」に集約**し、本文では `(→ Q-x)` で参照します。推測で断定しません。

---

## 1. プロダクトビジョンと4本柱

### 1.1 ビジョン

「**知っている英語**」を「**使える英語**」へ引き上げる、日本人学習者向けの個人開発アプリ。発音を起点に、知覚 → 産出 → フィードバック → 説明アウトプット → 振り返り、という1つの学習ループを**毎日まわす**ことを中核体験とする。

### 1.2 4本柱

要件定義書 v1.0 §1 の4本柱を、そのままアプリの主要モジュールにマップする。

| 柱 | 意味 | 対応モジュール |
|---|---|---|
| **戦略** | 何を・どの順で学ぶか | 語彙マスタ (NGSL/CEFR-J)、SMART 目標、週次プラン |
| **進め方** | どう学ぶか (科学的手法) | HVPT 聞き分け、音読、音素 FB、SM-2 間隔反復 |
| **時間の使い方** | いつ・どれだけ学ぶか | EventBridge 通知、1日2通の習慣リマインド |
| **モチベーション** | 続ける仕組み | ストリーク、バッジ、振り返り、教えて学ぶ |

### 1.3 成功の定義 (MVP)

MVP は **1ユーザー (てつてつ本人)** で動かしてフィードバックループを回す。公開はその後に検討する。MVP の成功 = 「**毎日 LINE 通知が来て、録音すると音素レベルのフィードバックが出て、学習が記録される**」状態が、本人の実利用で2週間継続できること。

---

## 2. ターゲットユーザー

### 2.1 対象

- **レベル**: CEFR **A2〜B1** (中級まで) の日本人英語学習者。
- **MVP 利用者**: てつてつ本人 1名。スマホ (iOS Safari) からの利用を主想定。
- **公開後の想定**: 同レベルの社会人学習者。LINE を日常的に使う層。

### 2.2 利用文脈

通勤・スキマ時間にスマホで1日5〜15分。録音には iOS Safari の MediaRecorder を使うため、**iOS Safari での動作が必須要件** (→ NFR-2)。

---

## 3. 中核体験 (コアループ) と用語定義

### 3.1 1日のコアループ

```
LINE通知が届く → アプリを開く → 今日の単語/文が出る
  → ① 聞き分け (知覚: 複数話者で正解音を選ぶ)
  → ② 音読 (産出: 録音する)
  → ③ 音素フィードバック (Azure スコア + IPA 表示)
  → ④ 説明アウトプット (任意: 学んだことを書く → AI評価)
  → ⑤ 記録される (ストリーク更新 / 次回復習日を SM-2 で算出)
```

Phase 0 では①〜⑤の「器」(認証・データ・語彙・画面遷移) を作り、発音評価の中身 (②③) は Phase 1、AI評価 (④) は Phase 2 で実装する。

### 3.2 用語定義

- **音素 (phoneme)**: 意味を区別する音の最小単位。Azure は IPA で音素ごとのスコアを返す。
- **HVPT (High Variability Phonetic Training)**: 複数話者の音声で同じ音を聞かせ、音の知覚カテゴリを鍛える訓練法。
- **SM-2**: 間隔反復アルゴリズム。正答の質に応じて次回復習日を算出する。
- **連結発音 (connected speech)**: wanna / gonna / flapping など、実際の発話で起きる音変化。Phase 2 の対象。
- **Single Table 設計**: DynamoDB で複数エンティティを1テーブルに同居させ、JOIN の無い世界で N+1 を避けるキー設計手法。

---

## 4. 機能要件: 発音評価 (本アプリの心臓部 / P0–P1)

> **重要な前提**: AWS には音素レベルの発音評価を返すマネージドサービスが**存在しない** (Amazon Transcribe は「何を言ったか」の単語 confidence しか返さない。2026-06-13 再確認、§17)。よって発音評価は **Azure AI Speech Pronunciation Assessment** を採用する。これは plan.md / knowledge.md の確定事項。

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-4.1** | ブラウザの MediaRecorder で単語/文を録音できる | P1 | iOS Safari で録音開始→停止→再生ができ、音声 Blob を取得できる |
| **FR-4.2** | 録音音声を Lambda 経由で Azure 発音評価へ送り、スコアを取得する | P1 | granularity=`Phoneme` で full-text/word/syllable/phoneme の4階層スコアと IPA が返る |
| **FR-4.3** | 音素ごとのスコアを IPA 付きで可視化する | P1 | 低スコア音素が色で識別でき、IPA 記号が表示される |
| **FR-5.1** | Prosody (抑揚・速度・リズム) スコアを表示する | P1 | en-US で prosody スコアが返り表示される (Prosody は en-US のみ対応, §17) |
| **FR-5.2** | 評価結果を DynamoDB に保存し履歴を残す | P1 | 1回の評価が1レコードとして保存され、後で時系列に取得できる |
| **FR-4.4** | 従量課金 API を開発時に抑えるダミー応答モードを持つ | P0 | 環境変数で Azure 呼び出しをスタブ化でき、固定 JSON を返せる |

**制約**: en-US 固定 (C-1)。録音音声は S3 へ短期保存し TTL 削除 (NFR-4)。Azure への越境送信はプライバシーポリシーに明記 (NFR-4)。

## 5. 機能要件: 知覚トレーニング (聞き分け / P1)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-6.1** | HVPT 方式で複数話者の音声から正解音を選ぶ問題を出す | P1 | 1問につき複数話者の音源が用意され、正誤判定できる |
| **FR-6.2** | 聞き分けの正答率を記録する | P1 | 問題ごとの正誤が保存され、単語別の知覚正答率が集計できる |

**未決**: 複数話者音声の調達方法 (Polly 複数ボイス vs 既存コーパス) は未確定 (→ Q-1)。

## 6. 機能要件: 産出 (音読・発話 / P0–P1)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-7.1** | 模範音声を再生できる (Amazon Polly SSML `<phoneme>`) | P1 | careful 版が再生でき、IPA 指定が反映される |
| **FR-7.2** | (Phase 2) reduced 版模範音声を careful 版とペアで提示する | P2 | flapping/連結を含む reduced 版が careful 版と並べて再生できる |

## 7. 機能要件: 説明アウトプット (教えて学ぶ / P2)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-8.1** | 学んだ単語の説明をテキスト入力し AI が評価する | P2 | Bedrock Converse で評価コメントが返る (テキスト入力先行) |
| **FR-8.2** | AI 評価に Guardrails の contextual grounding をかける | P2 | 辞書定義と矛盾する出力を検出し、再生成または「自信なし」表示にフォールバックする |
| **FR-8.3** | (Phase 3) 説明を音声入力できる (Amazon Transcribe) | P2 | 音声→テキスト変換後に FR-8.1 の評価に流せる |

> **モデル制約 (C-2)**: Bedrock は **Claude Haiku 4.5** を使用。Claude 3.5 Haiku は 2026-06-19 EOL のため新規採用禁止。コスト最優先時のフォールバックは Amazon Nova Lite。(Haiku 4.5 の EOL は 2026-10-01 以降 = MVP 期間中は安全, §17)

## 8. 機能要件: AI評価基盤 (Bedrock / P2)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-9.1** | Bedrock Converse API で評価を生成する | P2 | Converse API 経由で Claude Haiku 4.5 を呼べる |
| **FR-9.2** | 従量課金を抑えるダミー応答モードを持つ | P0 | 環境変数で Bedrock 呼び出しをスタブ化できる |
| **FR-9.3** | Guardrails でコスト/安全性を制御する | P2 | Guardrail フラグ率を計測でき、>10% で改善判断できる |

## 9. 機能要件: 習慣化 (目標・反復・通知 / P1)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-10.1** | SMART 目標ウィザードで学習目標を設定する | P1 | 目標が構造化データとして保存される |
| **FR-10.2** | 週次プランをルールベースで生成する | P1 | 骨格はルール固定で「LLM が復習を忘れる」事故を防ぐ。Phase 2 で自然言語化 |
| **FR-10.3** | SM-2 間隔反復で次回復習日を算出する | P1 | 正答の質に応じて次回 due 日が更新される |
| **FR-10.4** | EventBridge Scheduler から due を抽出し LINE Push する | P1 | due の単語があるユーザーへ Push が届く (MVP はバッチ案: 5〜15分間隔で抽出) |
| **FR-10.5** | ストリーク・バッジを表示する | P1 | 連続学習日数が正しく増減し、達成でバッジが付与される |

> **通知プラン制約 (C-3)**: MVP は LINE **Communication Plan (月200通無料)** で開始。1ユーザー1日2通だと約3ユーザーで上限に達するため、MAU 増加時に Light Plan へ切替 (§15 ベンチマーク)。なお 2026-10-01 に LINE 追加メッセージ課金が2段階に簡素化される (§17)。

---

## 10. 認証要件 (LINE Login × Cognito Identity Pool / P0)

### 10.1 採用構成 (案A)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-11.1** | LINE Login (Authorization Code + PKCE) でログインできる | P0 | Next.js で認可コード取得→トークン交換が完了する |
| **FR-11.2** | Lambda で LINE ID token を verify する | P0 | `https://api.line.me/oauth2/v2.1/verify` で検証が成功し、改ざんトークンを拒否する |
| **FR-11.3** | 検証成功後 `GetOpenIdTokenForDeveloperIdentity` で OpenID token を発行する | P0 | LINE userId に紐づく Cognito IdentityId と OpenID token が返る |
| **FR-11.4** | フロントが OpenID token + IdentityId から STS 認証情報を取得する | P0 | 一時 AWS 認証情報が取得でき、IAM 認証の API Gateway を呼べる |

### 10.2 なぜこの構成か (設計根拠)

LINE Web Login の ID token は **HS256 (共有鍵署名)・`kid` 欠落・userInfo が email を返さない** の3点で、Cognito User Pool の OIDC IdP が要求する JWKS 検証の前提を満たさない。よって素直な OIDC 連携は不可能で、Lambda で verify → Developer-Authenticated Identities として AWS 認証情報を発行する **案A** を採る。API Gateway は Cognito Authorizer ではなく **IAM 認証 + STS** 構成になる。(2026-06-13 再確認: `GetOpenIdTokenForDeveloperIdentity` API は健在, §17)

## 11. 機能要件: 振り返り (リフレクション / P2–P3)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-12.1** | (Phase 3) 週次リフレクションを表示する | P2 | 週次の学習量・正答率・弱点音素がまとまって見える |
| **FR-12.2** | (Phase 3) 難易度キャリブレーションを行う | P2 | 正答率に応じて出題難易度が調整される |

---

## 12. データ要件 (DynamoDB Single Table / P0)

> **注意**: v1.0 §12 の具体的キー設計は失われていたため、本章は**アクセスパターンから再設計した提案**である。実装着手前に てつてつのレビューと承認が必要 (→ Q-2)。

### 12.1 アクセスパターン (キー設計の出発点)

DynamoDB は「クエリを先に決め、それに合わせてキーを設計する」。Phase 0–1 で必要なアクセスパターンを洗い出す:

| # | アクセスパターン | 用途 |
|---|---|---|
| AP-1 | ユーザー1件をプロフィール取得 | ログイン後のホーム |
| AP-2 | ユーザーの学習記録を新しい順に取得 | 履歴・振り返り |
| AP-3 | 特定単語の発音評価履歴をユーザー内で取得 | 単語別の伸び |
| AP-4 | due (復習期限到来) の学習項目をユーザー内で抽出 | 通知・今日の出題 |
| AP-5 | 語彙マスタを語 ID で取得 | 出題時の語データ |
| AP-6 | 語彙マスタを CEFR レベルで絞り込み | レベル別出題 |

### 12.2 テーブル設計 (提案)

**テーブル名**: `pronounce-en` / **課金**: On-Demand / **PK**: `PK` / **SK**: `SK`

| エンティティ | PK | SK | 主な属性 |
|---|---|---|---|
| ユーザー | `USER#<identityId>` | `PROFILE` | lineUserId, displayName, createdAt, streak |
| 学習記録 | `USER#<identityId>` | `RECORD#<ISO8601>#<recordId>` | wordId, scores(json), type |
| 発音評価 | `USER#<identityId>` | `ASSESS#<wordId>#<ISO8601>` | phonemeScores, prosody, audioS3Key |
| 復習スケジュール | `USER#<identityId>` | `SRS#<dueDate>#<wordId>` | interval, ef, repetition (SM-2) |
| 語彙マスタ | `WORD#<wordId>` | `META` | headword, ipa, cefr, ngslRank, exampleSentence |

### 12.3 GSI (グローバルセカンダリインデックス)

| GSI | PK | SK | 解決するアクセスパターン |
|---|---|---|---|
| GSI1 (CEFR別語彙) | `CEFR#<level>` | `WORD#<wordId>` | AP-6 (レベル別出題) |
| GSI2 (全ユーザー横断 due 抽出) | `DUE#<dueDate>` | `USER#<identityId>#<wordId>` | AP-4' (通知バッチが全ユーザーの当日 due を抽出) |

> **GSI2 の注意 (自己レビューで判明)**: FR-10.4 の通知バッチは「**全ユーザー横断で**当日 due を抽出」する必要があり、ユーザー内 Query (AP-4) だけでは解けない。そのため復習スケジュール項目に GSI2 用の属性 (`GSI2PK=DUE#<dueDate>`) を持たせ、バッチは `GSI2PK=DUE#<today>` を Query する。`DUE#<日付>` を PK にすると同一日に書き込みが集中しホットパーティション化するが、MVP 規模 (1ユーザー〜) では問題ない。公開時に日付+シャード (`DUE#<date>#<shard>`) へ分割する (→ Q-6)。

- **AP-1**: `PK=USER#id, SK=PROFILE` の GetItem。
- **AP-2**: `PK=USER#id, SK begins_with RECORD#` を降順 Query。
- **AP-3**: `PK=USER#id, SK begins_with ASSESS#<wordId>#` を Query。
- **AP-4**: `PK=USER#id, SK begins_with SRS#` で `SRS#<今日以前>` を範囲 Query → due 抽出。
- **AP-5**: `PK=WORD#id, SK=META` の GetItem。
- **AP-6**: GSI1 を `PK=CEFR#A2` で Query。

### 12.4 データ要件

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-13.1** | 上記スキーマを CDK で1テーブル + GSI1 として定義する | P0 | `cdk deploy` でテーブルと GSI1 が作成される |
| **FR-13.2** | ユーザーは自分の `USER#<identityId>` 配下のみ読み書きできる | P0 | IAM ポリシーで `dynamodb:LeadingKeys` を `USER#${cognito-identity.amazonaws.com:sub}` に制限 |
| **FR-13.3** | 音声 S3 オブジェクトは TTL で自動削除する | P0 | S3 ライフサイクルで短期間後に削除される |

> **設計上の留意 (knowledge.md より)**: Single Table は「JOIN を実現する魔法」ではなく「JOIN が無い世界で N+1 を避けるキー設計」。想定外クエリが後から出ると GSI 追加・データ移行コストが高いので、AP の洗い出しが命。新しい AP が判明したら本章を更新する。

## 13. 語彙データ要件 (NGSL-Spoken + CEFR-J / P0)

| ID | 要件 | 優先 | 受け入れ基準 (AC) |
|---|---|---|---|
| **FR-14.1** | NGSL-Spoken 721語を JSON 化する | P0 | `data/` のスクリプトで 721語の JSON が生成される |
| **FR-14.2** | CEFR-J Wordlist で各語に CEFR レベルを付与する | P0 | 各語に A1〜B2 等のレベルが付く |
| **FR-14.3** | 語彙マスタを DynamoDB に seed 投入する | P0 | seed スクリプトで `WORD#` レコードが投入され AP-5/AP-6 が動く |
| **FR-14.4** | ライセンス表記を保持する | P0 | NGSL: CC BY-SA 4.0 の表示、CEFR-J: 出典明記が UI/データに残る |

> **ライセンス制約 (C-4)**: NGSL / NGSL-Spoken は **CC BY-SA 4.0 (表示・継承必須)**。CEFR-J は出典明記必須。**Oxford 3000/5000/Phrase List は商用再配布禁止のため絶対に組み込まない**。CC BY-SA の継承条項がコード本体へ波及するかは未解決の法的論点 (→ Q-3)。(2026-06-13 再確認: NGSL-Spoken v1.2=721語/CC BY-SA 4.0, §17)

---

## 14. 非機能要件 (NFR)

| ID | 区分 | 要件 | 受け入れ基準 (AC) |
|---|---|---|---|
| **NFR-1** | 性能 | 発音評価は録音停止から結果表示まで体感許容内 | 通常ネットワークで 95p < 5秒 (Azure 往復含む) |
| **NFR-2** | 互換性 | iOS Safari で録音〜評価が動作する | 実機 iOS Safari で FR-4.1〜4.3 が通る |
| **NFR-3** | コスト | 個人開発フェーズは実質無料枠内 | Lambda/DynamoDB/S3/EventBridge は無料枠内。Bedrock/Azure のみ従量で、開発時はダミーモードで抑制 |
| **NFR-4** | プライバシー | 音声の越境送信と短期保存を明示・遵守 | プライバシーポリシーに Azure 送信を明記。S3 は TTL 削除 (FR-13.3) |
| **NFR-5** | セキュリティ | ユーザーは自分のデータのみアクセス可能 | IAM `dynamodb:LeadingKeys` でテナント分離 (FR-13.2)。シークレットは `~/.secrets/` 管理 |
| **NFR-6** | 可観測性 | 障害調査が可能 | CloudWatch Logs + X-Ray で Lambda のトレースが追える |
| **NFR-7** | 保守性 | IaC で再現可能 | 全インフラを CDK (TypeScript) で定義。手動変更を禁止 |
| **NFR-8** | リージョン | us-east-1 固定 | 全リソースが us-east-1 (C-5) |

### 14.1 コスト試算 (v1.0 §14 踏襲)

月100アクティブユーザ規模で AWS 約 $15〜25、Azure 約 $10〜。個人開発 (てつてつ単独) ではほぼ無料枠内。従量で本物の料金が出るのは **Bedrock と Azure のみ**なので、開発時は各 Lambda のダミー応答モード (FR-4.4 / FR-9.2) で呼び出し回数を抑える。

---

## 15. 段階リリース計画とベンチマーク

各 Phase を1つの PR (または小 PR 群) で段階マージする。詳細な進め方は plan.md、タスクは todo.md。

- **Phase 0 — 基盤**: GitHub / Next.js+CDK 初期化 / DynamoDB スキーマ (§12) / Cognito Identity Pool + LINE verify Lambda (§10) / NGSL-Spoken 721語 JSON 化 + CEFR-J レベル付与 + seed (§13) / 最小フロント (ログイン→単語1件表示)。**完了基準**: LINE ログインして自分の DynamoDB に書き込め、語彙1件が画面に出る。
- **Phase 1 — 発音コア + 習慣化**: Azure セットアップ案内 / 録音 UI / S3 presigned PUT / Lambda→Azure / 音素 FB 可視化 / HVPT / Polly 模範音声 / SMART 目標 / 週次プラン (ルールのみ) / SM-2 / EventBridge→LINE Push / ストリーク・バッジ / プライバシーポリシー。**完了基準**: 毎日 LINE が来て録音すると音素 FB が出る。
- **Phase 2 — AI評価 + 連結発音**: Bedrock 説明評価 (テキスト先行) / Guardrails / 週次プランの LLM 自然言語化 (骨格はルール固定) / connected speech / Polly careful・reduced ペア。
- **Phase 3 — 拡張**: 説明の音声入力 (Transcribe) / 週次リフレクション / 難易度キャリブレーション / LIFF 設定画面 / (任意) 発音評価の AWS 内製化検討。

### 15.1 撤退・切替ベンチマーク (v1.0 §15 末尾)

| 指標 | しきい値 | アクション |
|---|---|---|
| Azure 月額 | > $50 | AWS 内製化 (wav2vec2 系 OSS 自前ホスト) を検討 |
| Bedrock 月額 | > $50 | Amazon Nova Lite へ切替検討 |
| LINE MAU | > 100 | Light Plan へ切替 |
| Guardrail フラグ率 | > 10% | プロンプト/グラウンディング改善 |

---

## 16. 制約・前提・Non-Goals・未決事項

### 16.1 制約 (Constraints)

| ID | 制約 |
|---|---|
| **C-1** | en-US 固定 (Azure Prosody が en-US のみ) |
| **C-2** | Bedrock は Claude Haiku 4.5。Claude 3.5 Haiku は EOL(2026-06-19) で新規採用禁止 |
| **C-3** | LINE は Communication Plan (月200通無料) で開始 |
| **C-4** | 語彙は NGSL-Spoken + CEFR-J のみ。Oxford 3000/5000 は禁止 |
| **C-5** | 全リソース us-east-1 |
| **C-6** | AWS アカウント ID / IAM ユーザー名はリポジトリに書かない (`~/.secrets/pronounce-en.env`) |
| **C-7** | Azure サブスクリプションは Phase 1 直前に取得 (Phase 0 では Azure に触れない) |

### 16.2 前提 (Assumptions)

- MVP 利用者はてつてつ本人 1名。スマホ (iOS Safari) 利用が主。
- フロント配信は Amplify Hosting または S3+CloudFront (Phase 0 着手時に最終決定, → Q-4)。

### 16.3 Non-Goals (MVP でやらないこと)

- 方言・他英語圏 (en-GB 等) の発音評価。en-US のみ。
- 多人数向けスケール最適化・課金機能・チーム機能。
- リアルタイム会話・チャットボット的対話。
- 発音評価の AWS 内製化 (Phase 3 で「検討」のみ。MVP は Azure)。
- Oxford 系商用語彙の利用。

### 16.4 未決事項 (Open Questions)

| ID | 論点 | 解決予定 |
|---|---|---|
| **Q-1** | HVPT 用の複数話者音声をどう調達するか (Polly 複数ボイス vs コーパス) | Phase 1 着手時 |
| **Q-2** | §12 の再設計キースキーマで AP を満たせるか (てつてつ承認) | Phase 0 実装着手前 |
| **Q-3** | NGSL の CC BY-SA 継承条項がコード本体へ波及するか | 公開検討時に専門家確認 |
| **Q-4** | フロント配信は Amplify Hosting か S3+CloudFront か | Phase 0 着手時 |
| **Q-5** | LINE 2026-10-01 料金改定が運用コストに与える影響 | Light Plan 切替検討時 |
| **Q-6** | GSI2 (`DUE#<date>`) のホットパーティション対策 (シャード分割) | 公開・複数ユーザー化時 |

---

## 17. 一次ソース索引 (2026-06-13 再検証済み)

- AWS Transcribe feature matrix (発音評価不可の根拠): <https://docs.aws.amazon.com/transcribe/latest/dg/feature-matrix.html>
- Azure Pronunciation Assessment (Prosody=en-US のみ, granularity): <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment>
- Bedrock Claude Haiku 4.5 model card (EOL 2026-10-01 以降): <https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html>
- Bedrock Converse API: <https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html>
- Bedrock Guardrails contextual grounding: <https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html>
- Polly SSML phoneme: <https://docs.aws.amazon.com/polly/latest/dg/ssml-phoneme.html>
- Cognito GetOpenIdTokenForDeveloperIdentity: <https://docs.aws.amazon.com/cognitoidentity/latest/APIReference/API_GetOpenIdTokenForDeveloperIdentity.html>
- Cognito Developer-Authenticated Identities: <https://docs.aws.amazon.com/cognito/latest/developerguide/developer-authenticated-identities.html>
- LINE verify ID token: <https://developers.line.biz/en/docs/line-login/verify-id-token/>
- LINE Messaging API pricing (2026 改定情報): <https://developers.line.biz/en/docs/messaging-api/pricing/>
- EventBridge Scheduler: <https://aws.amazon.com/eventbridge/scheduler/>
- NGSL-Spoken (CC BY-SA 4.0 / v1.2=721語): <https://www.newgeneralservicelist.com/ngsl-spoken>
- CEFR-J Wordlist: <https://cefr-j.org/download_eng>

---

## 変更履歴

- **v2.0 (2026-06-13)**: v1.0 がファイル消失していたため、plan.md/spec.md/knowledge.md と一次ソース再検証 (2026-06-13) をもとに再構成。§12 DynamoDB キー設計はアクセスパターンから再設計した提案 (要承認, Q-2)。機能要件に受け入れ基準・優先度を付与し、非機能要件/Non-Goals/未決事項を新設。
