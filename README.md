# New Bibble

聖經互動閱讀器：左欄經文、右欄地圖，經文中的人物／地點高亮與地圖 Pin 雙向連動。網址即狀態（`/:bookId/:chapter`），章節可直接分享連結、支援瀏覽器上一頁/下一頁。

兩欄中間的把手可拖曳調整經文／地圖區塊比例，也可點把手上的「收合地圖」一鍵把地圖／插圖收到細條、讓經文全螢幕顯示，再點「展開地圖」恢復；比例與收合狀態會存在 localStorage。

## 資料

- **經文**：和合本（CUV，公有領域）正體字全文，新舊約 66 卷 1,189 章 31,103 節
  - 來源：npm 套件 [`chinese-bible-search`](https://www.npmjs.com/package/chinese-bible-search)（MIT），文本取自 [信望愛站](http://springbible.fhl.net/OfflineBible/offline.html)
  - `src/data/books/` — 每卷一個 JSON，依需要動態載入
  - `src/data/bookIndex.json` — 66 卷目錄（名稱／縮寫／章數）
- **地圖註解**：`src/data/annotations/` — 含高亮實體、座標與路線的章節（目前 20 章），逐步擴充
- **英文對照（WEB）**：World English Bible，公有領域譯本
  - 來源：npm 套件 [`world-english-bible`](https://www.npmjs.com/package/world-english-bible)，文本取自 [ebible.org/web](http://ebible.org/web/)
  - `src/data/books-web/` — 每卷一個 JSON，結構與 `books/` 相同，同樣依需要動態載入
  - 導覽列「版本」切換「和合本」/「中英對照（WEB）」，選擇會存在 localStorage
  - ⚠️ **現代中文譯本未收錄**：該譯本版權屬聯合聖經公會/香港聖經公會所有，非公有領域，未取得授權前不會內嵌全文
- **AI 章節插圖**：沒有地圖標註的章節，由 Workers AI 產生該章插圖
  - `functions/api/illustration.js`：讀取順序為邊緣快取 → KV（`ILLUSTRATIONS` binding，永久儲存、全球共用）→ 都沒有才呼叫 Llama 3.1 寫場景描述 + FLUX schnell 產圖；產生成功會同時寫回 KV 與快取，之後同一章不再耗用 AI 額度
  - 需 `wrangler.toml` 的 `[ai]` binding（Pages 上免金鑰）與 `[[kv_namespaces]]` 的 `ILLUSTRATIONS` binding
  - `.github/workflows/warm-illustrations.yml` 每日 cron 自動巡覽所有未生成章節觸發產圖：單線程逐一請求（Workers AI 對高併發會限流回 502，單筆請求本身沒問題）、失敗自動退避重試，仍失敗則視為當日額度用盡、提早收工，隔日繼續

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

### 自動部署（GitHub Actions，建議）

push 到 `master` 會自動建置並部署到 Cloudflare Pages（見 `.github/workflows/deploy.yml`）。
需先在 GitHub repo 的 **Settings → Secrets and variables → Actions** 加入：

- `CLOUDFLARE_API_TOKEN` — 在 Cloudflare Dashboard 建立，權限至少 `Cloudflare Pages: Edit`
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare Dashboard 首頁右側可查到

也可在 Actions 頁面手動觸發（workflow_dispatch）。

### 手動部署

```bash
npm run build
npx wrangler pages deploy dist --project-name new-bibble
```

## 全文搜尋

點導覽列的 🔍（或按 `/` 快捷鍵）開啟搜尋。首次搜尋會在瀏覽器端動態載入全部 66 卷（複用既有的逐卷 lazy-load 快取，不另外產生索引檔），之後的搜尋直接查記憶體中的索引。中文採子字串比對，依正典順序回傳前 50 筆結果；點結果會跳到該章並捲動、短暫高亮對應經節。

## API 範例

- `GET /api/health` — 健康檢查，回傳 `{ status: "ok" }`

之後若需要資料庫，可在 `wrangler.toml` 補上 `[[d1_databases]]` 綁定並在 `functions/api/` 新增對應端點。
