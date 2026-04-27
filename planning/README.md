# SwingAQ Scanner — Project Planning

> **Master document — baca ini dulu sebelum membaca file lain.**
> Semua context proyek ada di folder `planning/`. Jika AI kehilangan context, minta baca folder ini.

---

## 🎯 Tujuan Proyek

Membangun **website stock scanner** untuk saham Indonesia (IDX) yang mendeteksi sinyal BUY berdasarkan indikator **SwingAQ** (SwingByAQib) — sebuah indikator TradingView custom yang ditulis di PineScript.

Website ini terbuka untuk publik (tanpa autentikasi), berjalan lokal, dan memungkinkan user untuk:
- Memilih **timeframe** (Daily, H1, H4, Weekly, dll.)
- **Scan semua saham IDX** sekaligus
- **Melihat progress scanning** secara real-time
- Melihat **daftar saham** yang memenuhi sinyal BUY saat ini
- Melihat **Stop Loss level** untuk setiap sinyal

---

## 📁 Struktur File Planning

```
planning/
├── README.md          ← File ini (baca pertama kali)
├── SIGNAL_LOGIC.md   ← Logika sinyal BUY/SELL dari PineScript (paling penting)
├── ARCHITECTURE.md   ← Stack teknis & arsitektur sistem
├── API_SPEC.md       ← Spesifikasi endpoint backend
├── UI_SPEC.md        ← Spesifikasi tampilan frontend
└── TASKS.md          ← Breakdown task implementasi (checklist)
```

---

## 📜 Source of Truth

- **PineScript asli**: `/Users/mhusnulaqib/Documents/APP/SwingAQ/SwingAQ.pinescript `
- **Logic terjemahan**: `planning/SIGNAL_LOGIC.md`

---

## 🧰 Tech Stack (Ringkasan)

| Layer        | Teknologi                        |
|--------------|----------------------------------|
| Backend      | Python 3.11+ + FastAPI           |
| Data         | yfinance (Yahoo Finance)         |
| Progress     | Server-Sent Events (SSE)         |
| Frontend     | HTML + Vanilla CSS + Vanilla JS  |
| Server       | Uvicorn (local)                  |
| Stock List   | Hardcoded JSON (IDX ~900 saham)  |

---

## 📐 Keputusan Desain Utama

| Keputusan                    | Pilihan                     | Alasan                                  |
|------------------------------|-----------------------------|-----------------------------------------|
| Auth                         | Tidak ada                   | Open access, local dulu                 |
| Data source                  | yfinance (gratis)           | Tidak perlu API key                     |
| Real-time progress           | SSE (Server-Sent Events)    | Lebih simple dari WebSocket, one-way OK |
| Timeframe                    | User pilih saat scan        | Fleksibel: 1d, 1h, 1wk, 1mo            |
| Universe saham               | Semua IDX (~900 ticker .JK) | User ingin scan semua                   |
| Deployment awal              | Local (uvicorn)             | Tidak perlu VPS dulu                    |
| Stop Loss display            | Ya, tampil di hasil         | Sesuai permintaan                       |

---

## 🚫 Out of Scope (Versi 1)

- Autentikasi / user account
- Notifikasi email / Telegram
- Backtest
- Charting interaktif (TradingView embed, dsb.)
- Deployment ke cloud
- Database persisten (hasil scan tidak disimpan)
- SELL signal scanner (fokus BUY dulu)

---

## 🗂️ Struktur Direktori Proyek Final

```
SwingAQ/
├── planning/                  ← Semua file planning (folder ini)
├── SwingAQ.pinescript         ← Source PineScript asli
├── backend/
│   ├── main.py                ← FastAPI app entry point
│   ├── scanner.py             ← Logika scanning & sinyal SwingAQ
│   ├── indicators.py          ← Kalkulasi Magic Line, CCI, SL
│   ├── stocks.py              ← Daftar saham IDX
│   └── requirements.txt
├── frontend/
│   ├── index.html             ← Single page app
│   ├── style.css
│   └── app.js
└── README.md                  ← Quick start guide
```

---

## ⚡ Quick Start (setelah implementasi selesai)

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Jalankan server
uvicorn main:app --reload --port 8000

# 3. Buka browser
open http://localhost:8000
```

---

## 📌 Status Proyek

- [x] Planning selesai
- [ ] Backend — indicators.py
- [ ] Backend — scanner.py
- [ ] Backend — stocks.py
- [ ] Backend — main.py (FastAPI)
- [ ] Frontend — index.html
- [ ] Frontend — style.css
- [ ] Frontend — app.js
- [ ] Testing & validasi sinyal
- [ ] Polish UI
