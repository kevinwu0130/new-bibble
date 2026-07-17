# New Bibble

專案骨架，尚未決定具體功能，先建立可運行的基本架構供後續擴充。

## 技術棧

- React 18 + Vite + React Router 6
- Tailwind CSS 3
- 部署目標：Cloudflare Pages
- 後端（保留彈性）：Cloudflare Pages Functions（`functions/api/health.js` 為健康檢查範例）

## 開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
npm run preview
```

## 部署（Cloudflare Pages）

```bash
npm run build
npx wrangler pages deploy dist --project-name new-bibble
```

## API 範例

- `GET /api/health` — 健康檢查，回傳 `{ status: "ok" }`

之後若需要資料庫，可在 `wrangler.toml` 補上 `[[d1_databases]]` 綁定並在 `functions/api/` 新增對應端點。
