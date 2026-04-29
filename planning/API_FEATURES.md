# API Features (Latest)

## Settings
- `GET /api/settings`
- `PUT /api/settings`

Payload:
```json
{
  "compact_table_rows": true,
  "auto_refresh_screener": true
}
```

## Watchlist
- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/{ticker}`

Payload POST:
```json
{
  "ticker": "BBCA",
  "notes": "Breakout candidate"
}
```

## Portfolio
- `GET /api/portfolio`
- `POST /api/portfolio`
- `DELETE /api/portfolio/{ticker}`

Payload POST:
```json
{
  "ticker": "BBCA",
  "lots": 10,
  "avg_price": 9200
}
```

## Frontend Behavior
- Route `#watchlist` and `#portfolio` now use backend persistence.
- Screener auto-refresh obeys `auto_refresh_screener` (5 minutes).
- Mobile navigation uses bottom bar (`@media max-width: 768px`).
