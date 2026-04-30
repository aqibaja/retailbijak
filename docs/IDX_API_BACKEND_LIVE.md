# IDX-API Backend Live Documentation

Dokumen ini menjelaskan backend IDX-API yang *benar-benar sudah jalan* dan siap dipakai sebagai sumber data real untuk RetailBijak.

## Ringkasan

IDX-API adalah backend data pipeline untuk pasar saham Indonesia (IDX) dengan komponen utama:

- HTTP API server
- Sync pipeline data real
- Client/facade module per domain
- SQLite + Drizzle ORM
- Static asset serving

Backend ini menjadi sumber data harian untuk:

- dashboard saham
- detail saham
- market overview
- trading summary
- corporate action
- participants
- scanner/scoring berbasis data lokal

---

## Komponen yang Sudah Jalan

### 1. HTTP Server
File utama:

- `src/api/Server.ts`

Fitur aktif:

- router Deno berbasis `@neabyte/deserve`
- CORS aktif (`origin: '*'`)
- static image serving di `/public/img`
- server listen ke `0.0.0.0`
- port configurable via config

### 2. Health Check
Endpoint aktif:

- `GET /health`

Response:

```json
{ "status": "ok" }
```

### 3. Facade / Client Module
File utama:

- `src/index.ts`

Domain module yang tersedia:

- `company`
- `market`
- `participants`
- `statistics`
- `trading`

### 4. Sync Real Data
Backend sudah menyiapkan modul sync untuk data real IDX, termasuk:

- company profile
- company announcement
- financial ratio
- financial report
- dividend
- stock split
- new listing
- delisting
- market indices
- index summary
- daily index
- stock summary
- trade summary
- broker summary
- foreign / domestic trading
- participants
- market calendar
- securities master

---

## Route Tree yang Sudah Tersedia

### Public
- `GET /health`
- `GET /public/img/*`

### Companies
- `GET /companies`
- `GET /companies/:code`
- `GET /companies/:code/announcements`
- `GET /companies/:code/financial-reports`
- `GET /companies/:code/issued-history`

### Securities & Announcements
- `GET /securities`
- `GET /announcements`
- `GET /stock-screener`
- `GET /suspend`
- `GET /relisting`

### Market
- `GET /market/indices`
- `GET /market/indices/:code/chart`
- `GET /market/calendar`
- `GET /market/daily-index`
- `GET /market/sectoral-movement`
- `GET /market/index-summary`

### Trading
- `GET /trading/summary`
- `GET /trading/stock-summary`
- `GET /trading/broker-summary`
- `GET /trading/top-gainer`
- `GET /trading/top-loser`
- `GET /trading/domestic`
- `GET /trading/foreign`
- `GET /trading/active-volume`
- `GET /trading/active-value`
- `GET /trading/active-frequency`
- `GET /trading/industry`
- `GET /trading/company/:code/daily`
- `GET /trading/company/:code/summary`

### Corporate Action / Data
- `GET /data/additional-listing`
- `GET /data/delisting`
- `GET /data/dividend`
- `GET /data/financial-ratio`
- `GET /data/new-listing`
- `GET /data/right-offering`
- `GET /data/stock-split`

### Participants
- `GET /participants/brokers`
- `GET /participants/dealers`
- `GET /participants/profiles`

---

## Parameter Umum

Banyak endpoint mendukung:

- `limit`
- `offset`
- `total=1`

Parameter domain-spesifik yang juga dipakai:

- `date=YYYYMMDD`
- `year`
- `month`
- `period=1D|1W|1M|1Q|1Y`
- `code`

### Pagination
- default `limit`: 50
- maximum `limit`: 500

---

## Data Flow

```text
IDX source
  -> fetcher/client
  -> parser/validator
  -> transform
  -> upsert SQLite
  -> API routes
  -> frontend / consumer
```

Tujuan arsitektur ini:

- data real diambil sekali
- disimpan lokal
- dibaca cepat oleh frontend
- UI tidak bergantung fetch langsung ke source eksternal

---

## Database Layer

Database yang dipakai:

- SQLite

ORM/query layer:

- Drizzle ORM

Backend ini cocok untuk menyimpan:

- companies
- securities
- announcements
- financial reports
- financial ratios
- stock summaries
- trading summaries
- market indices
- index summaries
- participants
- calendar events
- corporate action data

---

## Cara Pakai

### Sync data

```typescript
import * as sync from '@app/Backend/Sync/index.ts'

await sync.dbInitialize()
await sync.syncCompanyProfile()
await sync.syncStockSummary('20240220')
await sync.syncIndexList()
```

### Client access

```typescript
import IDXClient from '@app/index.ts'

const client = new IDXClient()
const indices = await client.market.getIndexList()
const summary = await client.trading.getStockSummary('20240220')
```

### Start server

```typescript
import { serve } from '@app/api/Server.ts'
await serve()
```

---

## Status

Yang sudah bisa dibilang *operasional*:

- server HTTP
- health endpoint
- route modular
- sync data real
- database persistence
- facade client
- static assets

Jadi backend ini bukan skeleton; ini backend operasional real-data.

---

## Rekomendasi Integrasi ke RetailBijak

Agar mudah dipakai oleh frontend RetailBijak:

1. buat layer adapter tunggal untuk API IDX
2. standarkan response internal
3. cache hasil harian di SQLite lokal
4. sediakan fallback/demo data di UI
5. dokumentasikan endpoint dan contoh response
6. sinkronkan data harian sebelum UI load

---

## File Terkait di Repo Ini

- `src/api/Server.ts`
- `src/index.ts`
- `src/api/routes/index.ts`
- `USAGE.md`
- `planning/API_SPEC.md`
- `planning/README.md`
- `planning/TASKS.md`
