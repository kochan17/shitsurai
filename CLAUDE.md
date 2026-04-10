# shitsurai

AIDesigner MCPサーバーのセルフホスト版クローン。Claude APIでUI HTMLを生成し、Playwrightでプレビュー画像を返す。

## プロジェクト構造

```
src/
├── index.ts              # MCPサーバーエントリポイント
├── cli.ts                # CLIエントリポイント
├── server.ts             # MCPサーバー設定（stdio / HTTP）
├── llm/
│   └── client.ts         # Anthropic API クライアント
├── prompts/
│   ├── generate.ts       # generate_design 用プロンプト
│   ├── refine.ts         # refine_design 用プロンプト
│   └── adopt.ts          # adopt 用プロンプト
├── renderer/
│   └── playwright.ts     # Playwright ヘッドレスブラウザ（シングルトン）
├── scanner/
│   └── repo-scanner.ts   # プロジェクト自動スキャン
├── scraper/
│   └── url-scraper.ts    # URL スクレイピング（mode/url機能）
├── store/
│   └── run-store.ts      # run_id 管理（インメモリ + ファイル永続化）
└── tools/
    ├── generate-ui.ts    # generate_design ツール
    ├── refine-ui.ts      # refine_design ツール
    ├── preview.ts        # preview ツール
    └── adopt.ts          # adopt ツール
```

## ビルド・実行

```bash
npm run build          # TypeScript コンパイル
npm run dev            # watch モード
npx playwright install chromium  # 初回のみ
```

## MCPツール一覧

| ツール | 説明 |
|--------|------|
| `generate_design` | テキストプロンプトからHTML/CSSデザイン生成 |
| `refine_design` | 既存デザインをフィードバックで改善 |
| `preview` | HTMLをPNGスクリーンショットに変換 |
| `adopt` | HTMLプロトタイプをフレームワーク別コードに変換 |

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `ANTHROPIC_API_KEY` | ○ | - | Anthropic APIキー |
| `SHITSURAI_MODEL` | - | `claude-sonnet-4-20250514` | 使用するClaudeモデル |
| `SHITSURAI_TRANSPORT` | - | `stdio` | `http` でHTTPサーバーモード |
| `SHITSURAI_PORT` | - | `3100` | HTTPモード時のポート |

## コーディングルール

- TypeScript strict モード
- `any` 禁止 → `unknown` + type guard
- `enum` 禁止 → union type / `as const`
- `as` アサーションは最終手段 → type guard を優先
- 3つ以上のパラメータ → Options Object パターン
- export 関数には明示的な戻り値型
- `const` デフォルト、`let` は再代入時のみ

## アーティファクト保存先

`.aidesigner/runs/{run_id}/` に以下を保存：
- `design.html` — 生成HTML
- `request.json` — リクエスト情報
- `repo-context.json` — リポジトリコンテキスト
- `summary.json` — ラン概要
- `preview.png` — プレビュー画像
- `adoption.json` — フレームワーク移植ガイド
- `.aidesigner/latest.json` — 最新ランへのポインタ
