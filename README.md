# Giftia

商品選択を自分1人で選ぶだけでなく、第三者の意見を取り入れる機能を取り入れる

| フォルダ | 中身 |
| :--- | :--- |
| `giftia-frontend/` | 画面（Next.js / TypeScript） |
| `backend/` | 検索API（FastAPI / Python）。DBは班のMySQL |

## 班メンバー

| 呼び名 | 役割 | GitHub |
| :--- | :--- | :--- |
| ぐんさん | （記入） | `kozueg-44gh` |
| じゅんちゃん | （記入） | `j-nu471` |
| いでっち | （記入） | `tomotech0` |

**リーダー（PM・マージ担当）：いでっち**

## 環境構築



### 1. リポジトリを取得

```bash
git clone https://github.com/tomotech0/Kujiragumo-13.git
cd Kujiragumo-13
```

### 2. バックエンド（FastAPI）

リポジトリの直下から始めます。

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Mac: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Mac: cp .env.example .env
```

`.env` に班のDB接続情報を入れます（値は班で共有されたものを使う）。
画面から呼べるように、`CORS_ORIGINS=http://localhost:3000` も書いてください（空のままだと画面からのリクエストが拒否されます）。

```bash
uvicorn main:app --reload       # http://localhost:8000/api/health で動作確認
```

### 3. フロントエンド（Next.js）

バックエンドとは**別のターミナル**を開き、リポジトリの直下から始めます。

```bash
cd giftia-frontend
npm install
```

`giftia-frontend/.env.local` を作り、APIのURLを書きます。

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev                     # http://localhost:3000
```

画面で検索するには、バックエンドも同時に起動しておく必要があります。

## 班のルール

### 絶対に上げないもの

- `.env` / `.env.local`（DBのパスワードなどの接続情報）、証明書（`.pem` / `.crt`）
- `node_modules/`、`.venv/`、`.next/`
- このリポジトリは**公開**です。一度上げた秘密情報は、消しても履歴に残ります
- 生成AIにも `.env` の中身を見せない・貼らない

### 開発の流れ（GitHub Flow）

誰が何をするかは、次のとおりです。

| STEP | やること | 誰が |
| :--- | :--- | :--- |
| 0 | Issueを立てる（**任意**） | 作成者 |
| 1 | `main` をpullして、作業ブランチを切る | 作成者 |
| 2 | AIと一緒にファイルを追加・変更する | 作成者 + AI |
| 3 | 変更を自分で読み、差分を確認する | 作成者 |
| 4 | commit して push する | 作成者 |
| 5 | PRを出し、Slackで「PR出しました」と通知する | 作成者 |
| 6 | レビュー：手元で動かして確認する | 作成者以外 |
| 7 | Approve する | 作成者以外 |
| 8 | merge する、Slackで「merge しました」と通知する | **リーダー**（リーダー自身のPRは、レビューした他のメンバー） |
| 9 | 全員が `main` をpullして起動し、PRに「再現OK」とコメントする | 全員 |

`main` には直接pushできません（Branch protectionで守ります）。必ず作業ブランチからPRを出します。

### STEP 0：Issue（任意）

- 本文に「なぜ / やること / やらないこと」を書く
- 付けた番号（`#1`）は、commit と PR で使う
- Issueを立てなかったときは、`(#番号)` と `Closes #番号` は省略してよい

### STEP 1：ブランチ

- 必ず最新の `main` から切る
- 名前：`feature/issue-{番号}-{概要}` / `fix/issue-{番号}-{概要}` / `docs/{概要}`
  （Issueがなければ `feature/{概要}`）

### STEP 3：確認（人の役目）

- ステージするのは**今回のファイルだけ**。関係ないファイルや `.env` は、ステージしない
- frontend と backend が、今までどおり起動するか確かめる
- テスト結果・ログ・スクショは `evidence/` に保存し、PRに付ける（`docs/5文書/テスト設計.md` の「実行方法」）

### STEP 4：commit・push

- メッセージ：`◯◯をする (#1)`（`(#1)` を付けるとIssueとつながる）
- pushするのは作業ブランチだけ（`main` は外す）

### STEP 5：PR

- `base: main` ← `compare: 作業ブランチ` を確かめる
- 本文は自分の言葉で書く：

```
何を：
なぜ：
確認手順：

Closes #1
```

### STEP 6〜7：レビュー・Approve（作成者以外）

- 本文の確認手順と `Closes #番号` を確かめる
- Files changed で、変更が今回のファイルだけか、`.env` がないかを見る
- 文書（5文書）に無い機能を作っていないか、証拠（テスト結果・スクショ）が付いているかを見る
- `fetch` して作業ブランチを手元でチェックアウトし、確認手順どおりに動かす（`pull` ではない）
- 動いたら、Submit review → コメント（例：手元で確認しました）→ **Approve**
- 直してほしいときは Request changes。作成者が同じブランチにpushすれば、PRが更新される
- コードの良し悪しは判定しなくてよい。「本文どおりに動くか」「余計な変更がないか」を見る

### STEP 8：merge（リーダー）

- 1 approval が付いていることを確かめる
- Merge pull request → Confirm merge（squashは使わない）
- Delete branch で作業ブランチを消す
- **自分のPRは自分でマージしない。** リーダーのPRは、レビューした他のメンバーがマージする

### STEP 9：全員で再現

- `main` をpullして起動し、PRに「再現OK」とコメントする。全員のコメントがそろったら1周完了
- 動かなければ、PRにコメントして作成者に伝える。依存が増えていたら、インストールし直す

### 困ったとき

| こんなとき | まずやること |
| :--- | :--- |
| `main` にpushできない | 正常な動き。作業ブランチを作ってpushし、PRを出す |
| Conflictが起きた | 最新の `main` を作業ブランチに取り込み、`<<<<<<<` の箇所を直す。AIに頼んでもよいが、結果は自分で確かめる |
| `.env` をcommitした | すぐリーダーと講師に連絡する。削除のcommitでは履歴から消えないため、接続情報を変更する |
| PRが大きくなりすぎた | 目的ごとにブランチを分けて、PRを出し直す |
| pullしたら動かない | 依存のインストールし直しを試す。それでも動かなければ、PRにコメントする |

### DB・ライブラリ

- 既存のテーブル構造を壊さない。列の削除・型変更は、マージ前に班へ共有する
- スキーマを変えたら、ADRに1行足す。手元のDBの作り直しが必要なときは、PR本文にその手順を書く
- 新しいライブラリを足すときは、IssueかPRのコメントで一言伝える
- `requirements.txt` のバージョンは `==` で固定する（ADR-0002）。上げるときは動作確認をしてから書き換える

### 5文書とADR

- 正本は `docs/5文書/`（要求・要件・仕様・設計・テスト設計・ADR・実装計画）。このREADMEや `AGENTS.md` と食い違うときは、5文書を優先する
- 文書に無い機能は作らない。気づいたら止めて、リーダーへ伝え、ADRを切ってから作る
- 決めたことは `ADR.md` に1行足し、**同じPRの中で**下流の文書にも反映する。手順は `実装計画.md`「ADRを足したときの手順」

## AIエージェントを使う人へ

Claude Code / Codex / Cursor / Copilot など、どのAIでも同じルールで動くよう、共通の指示を [`AGENTS.md`](./AGENTS.md) にまとめています。
Claude Code は `CLAUDE.md` から `AGENTS.md` を読み込みます。ルールを変えるときは `AGENTS.md` を編集してください。

AIにやらせないこと：`.env` の中身を見せる・貼る、`git` の commit / push / merge（人がやる）、文書に無い機能を作らせる。
AIが作ったコードも、人と同じくレビューとPRを通します。
