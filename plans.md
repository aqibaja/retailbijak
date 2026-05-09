# 🇮🇩 RetailBijak — Fase 18: Advanced Analytics, Export & Intelligence

> **Status:** 🆕 Fase 18 dimulai — 0%
> **Tujuan:** Tambah fitur high-value: PDF report, portfolio performance chart, AI market briefing, push notifications, screener alerts.
> **Prinsip:** Setiap fitur harus punya value proposition jelas — jangan nambah bloat.
> **Constraint:** FREE models only (Nvidia Nemotron). No paid API dependencies.

---

## Masalah Teridentifikasi (Fase 18 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **Tidak ada PDF report** — Analis tidak bisa download laporan saham | 🔴 High | Loss of professional users |
| P2 | **Portfolio performance chart** — Equity curve tidak ada | 🔴 High | User tidak bisa lihat performa portofolio secara visual |
| P3 | **AI Market Briefing** — Belum ada ringkasan pasar harian otomatis | 🟠 Medium | User ketinggalan konteks market |
| P4 | **Browser push notification** — Alert hanya via in-app polling | 🟠 Medium | User harus buka web untuk lihat alert |
| P5 | **Screener filter sebagai alert** — Tidak bisa simpan kondisi scan | 🟡 Low | Power user harus buka screener terus |
| P6 | **Compare view minim** — Hanya 233 lines, no radar/spider chart | 🟡 Low | Analisis komparasi terbatas |

---

## 🔴 18.1 PDF Stock Report (HIGH IMPACT)

> **Goal:** Download one-click PDF laporan saham: TA summary + FA data + AI analysis.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 18.1.1 | **PDF generation service** — Generate HTML → PDF via weasyprint or pdfkit | `backend/services/pdf_report.py` (new) | 30m | Use `pdfkit` (wkhtmltopdf wrapper) — easier install than weasyprint. Template: company header, key stats table, TA signals, FA data, AI summary, footer. |
| 18.1.2 | **PDF endpoint** — `GET /api/stocks/{ticker}/report` return PDF | `backend/routes/stock_detail.py` | 15m | Async generate HTML, render to PDF, return `FileResponse` with `Content-Type: application/pdf` |
| 18.1.3 | **Download button UI** — Add "Download Report" button in stock detail | `frontend/js/views/stock_detail.js` | 10m | Button in stock hero/toolbar area. Click → download PDF. Show loading toast. |

**Value:** ★★★★★ — Fitur paling diminta analyst/sales
**Dependency:** `pdfkit` (~30MB), `wkhtmltopdf` system package
**Risk:** wkhtmltopdf mungkin tidak available di semua VPS. Alternatif: HTML report page + browser print.

---

## 🔴 18.2 Portfolio Performance Chart (HIGH IMPACT)

> **Goal:** Equity curve chart + benchmark comparison (IHSG).

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 18.2.1 | **Portfolio value history endpoint** — `GET /api/portfolio/history?range=1M,3M,1Y` | `backend/routes/user.py` | 20m | Aggregate TransactionLog + latest prices to compute daily portfolio value. Return series of {date, value, invested, pnl_pct}. |
| 18.2.2 | **Equity curve chart** — LightweightCharts line series di portfolio tab | `frontend/js/views/portfolio.js` | 20m | Tab baru "Kinerja" di portfolio. Line chart: portfolio return vs IHSG. Range selector: 1M, 3M, 1Y, MAX. |

**Value:** ★★★★★ — Portfolio tanpa performance chart = gelap
**Dependency:** LightweightCharts (already loaded), TransactionLog data

---

## 🟠 18.3 AI Market Briefing (MEDIUM IMPACT)

> **Goal:** Daily AI-generated market summary — brief, actionable, IDX-focused.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 18.3.1 | **Market briefing generator** — Collect top movers, sector performance, breadth → AI summary | `backend/services/market_briefing.py` (new) | 25m | Use existing OpenRouter LLM service (FREE model: nvidia/nemotron-3-nano). Prompt: "Buat ringkasan pasar IDX hari ini dalam 3 paragraf: IHSG, top movers, sektor terbaik/terburuk, breadth, sentimen." |
| 18.3.2 | **Briefing cache + scheduler** — Generate every trading day 16:30 WIB, cache di DB | `backend/scheduler.py` | 10m | Job: daily at 16:30. Store result in `market_briefings` table. Max 1 per day. |
| 18.3.3 | **Briefing widget** — Card di dashboard + dedicated `#briefing` page | `frontend/js/views/dashboard.js` | 15m | Narrative card like existing market-narrative-panel. Show: generated time, refresh button. |

**Value:** ★★★★☆ — Daily context saves user 15 menit riset
**Dependency:** OpenRouter LLM (FREE model), existing API key
**Risk:** LLM latency 5-15 detik — async generation acceptable

---

## 🟠 18.4 Web Push Notifications (MEDIUM IMPACT)

> **Goal:** Browser push notifications when alert triggers — even when tab is closed.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 18.4.1 | **VAPID key setup** — Generate key pair for push protocol | terminal | 5m | `npx web-push generate-vapid-keys`. Save in env vars. |
| 18.4.2 | **Push subscription endpoint** — `POST /api/push/subscribe` save subscription | `backend/routes/system.py` | 15m | Store endpoint + keys in `push_subscriptions` table. One per device. |
| 18.4.3 | **Push trigger from alert checker** — When alert triggers, send push | `backend/updaters/alert_checker.py` | 15m | Use `py-webpush` to send notification. Payload: ticker, alert type, value. |
| 18.4.4 | **Service worker push handler** — Show notification when push arrives | `frontend/sw.js` | 10m | `self.addEventListener('push', ...)` show notification with click → open stock detail. |

**Value:** ★★★★☆ — User dapat alert real-time tanpa buka web
**Dependency:** `py-webpush` library, VAPID keys, HTTPS (already have via nginx/cloudflare)

---

## 🟡 18.5 Compare View Enhancement (LOW IMPACT)

> **Goal:** Radar chart + correlation matrix for stock comparison.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 18.5.1 | **Radar chart** — Multi-metric comparison (RSI, Volume, PER, PBV, Yield) | `frontend/js/views/compare.js` | 20m | Use Canvas API or lightweight chart. Compare 2-4 stocks on 5 metrics. |
| 18.5.2 | **Correlation matrix** — Price correlation heatmap | `backend/routes/stocks.py` + `frontend/js/views/compare.js` | 20m | Backend: compute Pearson correlation from OHLCV daily returns. Frontend: simple CSS grid heatmap. |

**Value:** ★★★☆☆ — Power user tool, niche but sticky
**Dependency:** OHLCV data (already available)

---

## Prioritas Eksekusi — Fase 18

### 🔴 NOW (Day 1)
18.1.1 → 18.1.2 → 18.1.3 (PDF Report)

### 🟠 Next (Day 2)
18.2.1 → 18.2.2 (Portfolio Performance)

### 🟡 Later (Day 3-4)
18.3.1 → 18.3.2 → 18.3.3 (AI Briefing)
18.4.1 → 18.4.2 → 18.4.3 → 18.4.4 (Push Notifications)
18.5.1 → 18.5.2 (Compare Enhancement)

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | 🆕 | Fase 18 dimulai |
