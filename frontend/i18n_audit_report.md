# RetailBijak i18n Audit Report
## Hardcoded Indonesian Strings Needing Translation Keys

### Summary
- **Files using `__()` properly**: Only `sector.js` (33 usages) and `i18n.js` itself
- **Files with 0 i18n usage**: All other 20+ view files hardcode Indonesian text
- **index.html**: ~50 instances of hardcoded Indonesian text with no/few `data-i18n` attributes

---

## 1. index.html Hardcoded Strings

### Topbar / Status Bar
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 43 | `Langsung ke konten` | `skip_link` (EXISTS) |
| 59 | `IDX TUTUP` (in #market-status-text) | `market.closed` (EXISTS, but no data-i18n on this span) |
| 66 | `Memuat...` (#freshness-text) | `general.loading` (EXISTS) |
| 76 | `Scroll ke atas` (scroll-to-top aria-label) | `topbar.scroll_top` |

### Bottom Nav
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 106 | `Lainnya` (more button) | `bottom.more` |

### PWA Install Banner
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 117 | `Instal RetailBijak` | `pwa.install_title` |
| 118 | `Akses lebih cepat ke pasar IDX` | `pwa.install_sub` |
| 120 | `Install` | `pwa.install_btn` |

### Shortcuts Overlay
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 141 | `Pintasan keyboard` (aria-label) | `shortcuts.title` |
| 145 | `Pintasan Keyboard` | `shortcuts.title` |
| 150 | `Navigasi` | `shortcuts.navigation` |
| 151 | `Buka pintasan ini` | `shortcuts.open_this` |
| 152 | `Cari saham` | `shortcuts.search_stock` |
| 153 | `Dashboard` | `shortcuts.dashboard` |
| 154 | `Screener` | `shortcuts.screener` |
| 155 | `Portfolio` | `shortcuts.portfolio` |
| 156 | `Tutup modal / Tutup search` | `shortcuts.close_modal` |

### More Drawer
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 166 | `Menu Lainnya` | `drawer.title` |
| 167 | `Tutup` (title) | `general.close` (EXISTS) |
| 170 | `Pasar` + `Overview market IDX` | `drawer.market`, `drawer.market_desc` |
| 171 | `Sektor` + `Performa sektor & industri` | `drawer.sector`, `drawer.sector_desc` |
| 172 | `Berita` + `News feed & watchlist news` | `drawer.news`, `drawer.news_desc` |
| 173 | `Sinyal` + `Signal overview & TA` | `drawer.signals`, `drawer.signals_desc` |
| 174 | `Alert` + `Harga & indikator` | `drawer.alerts`, `drawer.alerts_desc` |
| 175 | `Breadth` + `Market breadth analysis` | `drawer.breadth`, `drawer.breadth_desc` |
| 176 | `Movers` + `Top gainers & losers` | `drawer.movers`, `drawer.movers_desc` |
| 177 | `Treemap` + `Peta pasar interaktif` | `drawer.treemap`, `drawer.treemap_desc` |
| 178 | `Kalender` + `Dividen, RUPS, IPO` | `drawer.calendar`, `drawer.calendar_desc` |
| 179 | `Aksi Korporasi` + `Corporate actions` | `drawer.corporate`, `drawer.corporate_desc` |
| 180 | `Indeks` + `IHSG, LQ45, IDX30` | `drawer.indices`, `drawer.indices_desc` |
| 181 | `Bandingkan` + `Side-by-side stocks` | `drawer.compare`, `drawer.compare_desc` |
| 182 | `Backtest` + `Uji strategi trading` | `drawer.backtest`, `drawer.backtest_desc` |
| 183 | `Paper Trading` + `Simulasi portfolio` | `drawer.paper_trades`, `drawer.paper_trades_desc` |
| 184 | `AI Picks` + `Rekomendasi AI harian` | `drawer.ai_picks`, `drawer.ai_picks_desc` |
| 185 | `Bantuan` + `Panduan & FAQ` | `drawer.help`, `drawer.help_desc` |

### Sidebar data-tooltips (data-i18n-aria exists but tooltip text is hardcoded)
| Line | Hardcoded Text | Suggested Key |
|------|---------------|---------------|
| 79-95 | `Dashboard`, `Pemindai`, `Pasar`, `Sektor`, `Aset`, `Berita`, `Sinyal`, `Alert`, `Breadth`, `Kalender`, `Treemap`, `Indeks`, `Aksi Korporasi`, `Backtest`, `Paper Trading`, `Movers`, `AI Picks` | `sidebar.*` (partial exist) |

---

## 2. View Files Summary (0% i18n Coverage)

| File | Hardcoded Strings Count | Missing Domain |
|------|----------------------|----------------|
| stock_detail.js | ~60+ hardcoded ID strings | `stock.*` (partial exists), `price_board.*` |
| screener.js | ~50+ hardcoded ID strings | `screener.*` (partial exists) |
| portfolio.js | ~40+ hardcoded ID strings | `portfolio.*` (partial exists) |
| alerts.js | ~25 hardcoded ID strings | `alerts.*` (NEW domain) |
| calendar.js | ~30 hardcoded ID strings | `calendar.*` (NEW domain) |
| breadth.js | ~10 hardcoded ID strings | `breadth.*` (NEW domain) |
| treemap.js | ~15 hardcoded ID strings | `treemap.*` (NEW domain) |
| corporate.js | ~20 hardcoded ID strings | `corporate.*` (NEW domain) |
| backtest.js | ~25 hardcoded ID strings | `backtest.*` (NEW domain) |
| paper_trades.js | ~25 hardcoded ID strings | `paper.*` (NEW domain) |
| compare.js | ~20 hardcoded ID strings | `compare.*` (NEW domain) |
| movers.js | ~15 hardcoded ID strings | `movers.*` (NEW domain) |
| indices.js | ~15 hardcoded ID strings | `indices.*` (NEW domain) |
| help.js | ~30 hardcoded ID strings | `help.*` (NEW domain) |
| market.js | ~40 hardcoded ID strings | `market.*` (partial exists) |
| dashboard.js | ~30 hardcoded ID strings | `dashboard.*` (partial exists) |
| main.js | ~5 hardcoded ID strings | `general.*` (partial exists) |
| router.js | ~20 hardcoded ID strings | (route titles/descriptions) |

---

## 3. Key New Domains Needed

### `alerts.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| alerts.title | Alert Harga | Price Alerts |
| alerts.subtitle | Monitor stock movements with automatic notifications. | Pantau pergerakan saham dengan notifikasi otomatis. |
| alerts.create | New Alert | Alert Baru |
| alerts.empty_title | No Alerts Yet | Belum Ada Alert |
| alerts.empty_desc | Create price or RSI alerts to monitor your favorite stocks automatically. | Buat alert harga atau RSI untuk memantau saham favorit Anda secara otomatis. |
| alerts.create_btn | Create Alert | Buat Alert |
| alerts.table_stock | Stock | Saham |
| alerts.table_type | Type | Tipe |
| alerts.table_condition | Condition | Kondisi |
| alerts.table_status | Status | Status |
| alerts.table_created | Created | Dibuat |
| alerts.triggered | Triggered | Terpicu |
| alerts.active | Active | Aktif |
| alerts.inactive | Inactive | Nonaktif |
| alerts.history_title | Trigger History | Riwayat Terpicu |
| alerts.trigger_stock | Stock | Saham |
| alerts.trigger_type | Type | Tipe |
| alerts.trigger_value | Trigger | Trigger |
| alerts.trigger_price | Price at Time | Harga Saat Itu |
| alerts.trigger_time | Time | Waktu |
| alerts.info_text | Alerts are checked every 2 minutes. Once triggered, you'll get a toast notification. | Alert dicek setiap 2 menit. Begitu kondisi terpenuhi, kamu akan mendapat notifikasi. |
| alerts.delete_confirm | Delete this alert? | Hapus alert ini? |
| alerts.deleted | Alert deleted | Alert dihapus |
| alerts.failed_delete | Failed to delete alert | Gagal menghapus alert |
| alerts.new_title | New Alert | Alert Baru |
| alerts.form_ticker | Stock Code | Kode Saham |
| alerts.form_type | Alert Type | Tipe Alert |
| alerts.form_value | Threshold Value | Nilai Ambang |
| alerts.form_save | Save Alert | Simpan Alert |
| alerts.failed_create | Failed to create alert | Gagal membuat alert |
| alerts.type_price_above | Price above (Price >) | Harga di atas (Price >) |
| alerts.type_price_below | Price below (Price <) | Harga di bawah (Price <) |
| alerts.type_rsi_above | RSI above (RSI >) | RSI di atas (RSI >) |
| alerts.type_rsi_below | RSI below (RSI <) | RSI di bawah (RSI <) |
| alerts.load_failed | Failed to load alerts | Gagal Memuat |
| alerts.load_failed_desc | Try refreshing the page. | Coba refresh halaman. |

### `calendar.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| calendar.title | Market Calendar | Kalender Pasar |
| calendar.subtitle | Dividends, earnings, and corporate actions for IDX stocks | Dividen, laba, dan aksi korporasi saham IDX |
| calendar.prev_month | Previous month | Bulan sebelumnya |
| calendar.next_month | Next month | Bulan berikutnya |
| calendar.today | Today | Hari Ini |
| calendar.select_hint | Select a date to view events | Pilih tanggal untuk melihat event |
| calendar.no_events | No events | Belum ada event |
| calendar.click_hint | Click a date with events. | Klik tanggal yang memiliki event. |
| calendar.no_events_date | No events on this date | Tidak ada event |
| calendar.no_events_date_desc | No corporate actions on this date. | Tidak ada aksi korporasi pada tanggal ini. |
| calendar.event | Event | Event |
| calendar.event_label | Events — | Event — |
| calendar.day_names | Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday | Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu |
| calendar.day_short | Mon,Tue,Wed,Thu,Fri,Sat,Sun | Sen,Sel,Rab,Kam,Jum,Sab,Min |
| calendar.month_names | January,February,March,April,May,June,July,August,September,October,November,December | Januari,Februari,Maret,April,Mei,Juni,Juli,Agustus,September,Oktober,November,Desember |
| calendar.type_dividend | Dividend | Dividend |
| calendar.type_earnings | Earnings | Earnings |
| calendar.type_corporate | Corporate | Corporate |
| calendar.today_events | Today's Events | Event Hari Ini |
| calendar.see_calendar | View Calendar → | Lihat Kalender → |
| calendar.more_events | +{n} more events | +{n} event lainnya |
| calendar.detail_link | Detail → | Detail → |
| calendar.has_events | , has events | , ada event |

### `breadth.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| breadth.title | Market Breadth | Market Breadth |
| breadth.subtitle | Advance-Decline analysis — daily gainers vs decliners | Analisis Advance-Decline harian |
| breadth.today | Today | Hari Ini |
| breadth.average | Average | Rata-rata |
| breadth.ratio | Ratio (today) | Ratio (hari ini) |
| breadth.cumulative | Cumulative Breadth | Cumulative Breadth |
| breadth.green_days | Green Days | Hari Hijau |
| breadth.gainers | Gainers | Gainers |
| breadth.decliners | Decliners | Decliners |
| breadth.stock_count | Number of Stocks | Jumlah Saham |
| breadth.date_col | Date | Tanggal |
| breadth.distribution_col | Distribution | Distribusi |
| breadth.ratio_col | Ratio | Ratio |
| breadth.cumulative_col | Cumulative | Cumulative |
| breadth.export_title | No data to export | Tidak ada data untuk diexport |
| breadth.export_success | Breadth CSV downloaded ({n} days) | CSV breadth diunduh ({n} hari) |
| breadth.load_failed | Failed to load breadth data | Gagal memuat data breadth |
| breadth.csv_headers | Date,Gainers,Decliners,Ratio,Cumulative Breadth | Tanggal,Gainers,Decliners,Ratio,Cumulative Breadth |

### `treemap.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| treemap.title | IDX Market Treemap | Treemap Pasar IDX |
| treemap.subtitle | Full IDX market visualization — size shows market cap, color shows price change. | Visualisasi seluruh pasar IDX — ukuran menunjukkan kapitalisasi pasar, warna menunjukkan perubahan harga. |
| treemap.refresh | Reload | Muat Ulang |
| treemap.empty_title | Treemap Data Not Available | Data Treemap Belum Tersedia |
| treemap.empty_desc | IDX market data is not yet available for treemap display. Try refreshing or wait for the next trading session. | Data pasar IDX belum tersedia untuk ditampilkan dalam bentuk treemap. |
| treemap.empty_mobile | Data Not Available | Data Belum Tersedia |
| treemap.empty_mobile_desc | Please try again later. | Silakan coba lagi nanti. |
| treemap.error_title | Failed to Load Treemap | Gagal Memuat Treemap |
| treemap.stocks | stocks | saham |
| treemap.market_share | market share | pasar |
| treemap.legend_0_1 | +0-1% | +0-1% |
| treemap.legend_1_3 | +1-3% | +1-3% |
| treemap.legend_3_5 | +3-5% | +3-5% |
| treemap.legend_5 | +5%+ | +5%+ |
| treemap.legend_neg_0_1 | -0-1% | -0-1% |
| treemap.legend_neg_1_3 | -1-3% | -1-3% |
| treemap.legend_neg_3_5 | -3-5% | -3-5% |
| treemap.legend_neg_5 | -5%- | -5%- |

### `corporate.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| corporate.title | Corporate Actions | Aksi Korporasi |
| corporate.subtitle | IPO, rights issue, stock split, dividends, and IDX corporate actions | IPO, rights issue, stock split, dividen, dan aksi korporasi IDX |
| corporate.tab_all | All | Semua |
| corporate.tab_listing | Listing/IPO | Listing/IPO |
| corporate.tab_dividend | Dividend | Dividen |
| corporate.tab_corporate | Corporate | Korporasi |
| corporate.tab_ipo | IPO Calendar | IPO Kalender |
| corporate.tab_rights | HMETD | HMETD |
| corporate.error_title | Failed to load data | Gagal memuat data |
| corporate.error_desc | Corporate actions data is not available at this time. | Data aksi korporasi tidak tersedia saat ini. |
| corporate.empty_title | No data | Tidak ada data |
| corporate.empty_desc | No corporate actions {filter}. | Tidak ada aksi korporasi {filter}. |
| corporate.view | View | Lihat |
| corporate.type_listing | Listing | Listing |
| corporate.type_ipo | IPO | IPO |
| corporate.type_dividend | Dividend | Dividen |
| corporate.type_corporate | Corporate | Korporasi |
| corporate.type_rights | HMETD | HMETD |
| corporate.type_earnings | Earnings | Laba |
| corporate.type_economic | Economic | Ekonomi |
| corporate.type_buyback | Buyback | Buyback |
| corporate.source_live | Live | Live |
| corporate.source_info | Info | Info |

### `backtest.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| backtest.title | Backtesting | Backtesting |
| backtest.subtitle | Test trading strategies on historical data. Calculate return, drawdown, Sharpe ratio, and view equity curve. | Uji strategi trading pada data historis. Hitung return, drawdown, Sharpe ratio, dan lihat equity curve. |
| backtest.kicker | Strategy Simulation | Simulasi Strategi |
| backtest.form_ticker | Stock Code | Kode Saham |
| backtest.form_strategy | Strategy | Strategi |
| backtest.form_capital | Initial Capital (Rp) | Modal Awal (Rp) |
| backtest.run | Run | Jalankan |
| backtest.empty_title | Run a Backtest | Jalankan Backtest |
| backtest.empty_desc | Select a stock and strategy, then click Run to see simulation results. | Pilih saham dan strategi, lalu klik Jalankan untuk melihat hasil simulasi. |
| backtest.enter_ticker | Enter stock code | Masukkan kode saham |
| backtest.failed_title | Failed | Gagal |
| backtest.load_failed | Backtest engine didn't respond. | Backtest engine tidak merespon. |
| backtest.kpi_return | Total Return | Total Return |
| backtest.kpi_drawdown | Max Drawdown | Max Drawdown |
| backtest.kpi_sharpe | Sharpe Ratio | Sharpe Ratio |
| backtest.kpi_winrate | Win Rate | Win Rate |
| backtest.kpi_trades | Total Trades | Total Trade |
| backtest.kpi_initial | Initial Capital | Modal Awal |
| backtest.kpi_final | Final Value | Nilai Akhir |
| backtest.equity_curve | Equity Curve | Equity Curve |
| backtest.trade_history | Trade History ({n}) | Riwayat Trade ({n}) |
| backtest.table_num | # | # |
| backtest.table_buy | Buy | Beli |
| backtest.table_price | Price | Harga |
| backtest.table_sell | Sell | Jual |
| backtest.table_shares | Shares | Saham |
| backtest.table_pnl | P&L | P&L |
| backtest.table_return | Return | Return |
| backtest.no_trades_title | No Trades | Tidak Ada Trade |
| backtest.strategy_sma | SMA Crossover (20/50) | SMA Crossover (20/50) |
| backtest.strategy_rsi | RSI Reversal (30/70) | RSI Reversal (30/70) |
| backtest.strategy_bb | Bollinger Breakout | Bollinger Breakout |
| backtest.error | Error | Error |

### `paper.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| paper.title | Paper Trading | Paper Trading |
| paper.subtitle | Risk-free trading simulation. Open virtual positions, track real-time P&L based on latest market prices. | Simulasi trading tanpa risiko. Buka posisi virtual, pantau P&L real-time berdasarkan harga pasar terbaru. |
| paper.kicker | Virtual Trading | Virtual Trading |
| paper.new_position | Open New Position | Buka Posisi Baru |
| paper.form_ticker | Code | Kode |
| paper.form_type | Type | Tipe |
| paper.form_qty | Quantity | Jumlah |
| paper.form_price | Price (Rp) | Harga (Rp) |
| paper.form_open | Open | Buka |
| paper.filter_all | All | Semua |
| paper.filter_open | Open | Terbuka |
| paper.filter_closed | Closed | Tertutup |
| paper.kpi_trades | Total Trades | Total Trade |
| paper.kpi_open | Open | Terbuka |
| paper.kpi_pnl | Total P&L | Total P&L |
| paper.kpi_winrate | Win Rate | Win Rate |
| paper.empty_title | No trades yet | Belum ada trade |
| paper.empty_desc | Open a new position to start paper trading. | Buka posisi baru untuk memulai paper trading. |
| paper.table_num | # | # |
| paper.table_ticker | Code | Kode |
| paper.table_type | Type | Tipe |
| paper.table_entry | Entry | Entry |
| paper.table_exit | Exit | Exit |
| paper.table_qty | Qty | Qty |
| paper.table_price | Price | Harga |
| paper.table_pnl | P&L | P&L |
| paper.table_return | Return | Return |
| paper.table_status | Status | Status |
| paper.table_action | Action | Aksi |
| paper.close_btn | Close | Tutup |
| paper.close_prompt | Close price for {ticker}: | Harga tutup untuk {ticker}: |
| paper.delete_confirm | Delete this trade? | Hapus trade ini? |
| paper.deleted | Trade deleted | Trade dihapus |
| paper.enter_ticker | Enter stock code | Masukkan kode saham |
| paper.enter_price | Enter price | Masukkan harga |
| paper.type_buy | BUY (Long) | BUY (Long) |
| paper.type_sell | SELL (Short) | SELL (Short) |

### `compare.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| compare.title | Stock Comparison | Perbandingan Saham |
| compare.subtitle | Compare performance, fundamentals, and price movements of multiple stocks side-by-side. | Bandingkan performa, fundamental, dan pergerakan harga beberapa saham secara side-by-side. |
| compare.kicker | Multi-Stock Analysis | Analisis Multi-Saham |
| compare.clear_all | Clear All | Hapus Semua |
| compare.input_placeholder | Type stock code (BBCA, BMRI...) | Ketik kode saham (BBCA, BMRI...) |
| compare.add_btn | Add | Tambah |
| compare.empty_hint | No stocks yet. Type a stock code above to start. | Belum ada saham. Ketik kode saham di atas untuk mulai. |
| compare.min_two | Add at Least 2 Stocks | Tambahkan Minimal 2 Saham |
| compare.min_two_desc | Enter stock codes above, then click Add to start comparing. | Masukkan kode saham di kolom di atas, lalu klik Tambah untuk memulai perbandingan. |
| compare.load_failed | Failed to load comparison data | Gagal memuat data perbandingan |
| compare.error_loading | An error occurred while fetching comparison data. | Terjadi kesalahan saat mengambil data perbandingan. |
| compare.price_chart | Price Comparison (Normalized 100) | Perbandingan Harga (Normalized 100) |
| compare.perf_summary | Performance Summary | Ringkasan Performa |
| compare.radar_chart | Comparison Radar | Radar Perbandingan |
| compare.radar_desc | Based on: Momentum, Volume, PE, PBV, ROE, Dividend Yield (normalized 0-100) | Berdasarkan: Momentum, Volume, PE, PBV, ROE, Dividend Yield (dinormalisasi 0-100) |
| compare.row_name | Name | Nama |
| compare.row_sector | Sector | Sektor |
| compare.row_market_cap | Market Cap | Market Cap |
| compare.row_price | Price | Harga |
| compare.row_return_1m | Return 1M | Return 1B |
| compare.row_return_3m | Return 3M | Return 3B |
| compare.row_return_total | Total Return | Return Total |
| compare.row_high_90d | High 90D | High 90H |
| compare.row_low_90d | Low 90D | Low 90H |
| compare.row_avg_volume | Avg Volume | Rata Volume |
| compare.row_pe | PE | PE |
| compare.row_pbv | PBV | PBV |
| compare.row_roe | ROE | ROE |
| compare.row_der | DER | DER |
| compare.row_div_yield | Dividend Yield | Dividend Yield |
| compare.already_added | {ticker} is already in the comparison list | {ticker} sudah di daftar banding |
| compare.max_reached | Max 5 stocks for comparison | Maksimal 5 saham untuk perbandingan |
| compare.added | {ticker} added to comparison | {ticker} ditambahkan ke perbandingan |

### `movers.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| movers.title | Market Movers | Market Movers |
| movers.subtitle | IDX stocks with the largest movements — gainers, losers, and most active with multi-timeframe performance. | Saham IDX dengan pergerakan terbesar — gainers, losers, dan most active dengan multi-timeframe performance. |
| movers.empty_title | No Data Yet | Belum Ada Data |
| movers.empty_desc | Market movers data is not yet available for this session. | Data market movers belum tersedia untuk sesi ini. |
| movers.error_title | Failed to Load Data | Gagal Memuat Data |
| movers.error_desc | An error occurred while fetching data. Please try again. | Terjadi kesalahan saat mengambil data. Silakan coba lagi. |
| movers.tab_gainers | Gainers | Gainers |
| movers.tab_losers | Losers | Losers |
| movers.tab_volume | Most Active | Most Active |
| movers.no_data | No data to display. | Tidak ada data untuk ditampilkan. |
| movers.export_empty | No data to export | Tidak ada data untuk diexport |
| movers.export_success | CSV downloaded ({n} stocks) | CSV diunduh ({n} saham) |
| movers.col_rank | # | # |
| movers.col_ticker | Ticker | Ticker |
| movers.col_name | Name | Name |
| movers.col_price | Price | Price |
| movers.col_chg_pct | Chg% | Chg% |
| movers.col_volume | Volume | Volume |
| movers.loading | Loading... | Memuat... |
| movers.csv_btn | CSV | CSV |
| movers.refresh_btn | Refresh | Refresh |

### `indices.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| indices.title | IDX Indices | Indeks IDX |
| indices.subtitle | Track IDX index constituents and performance | Pantau konstituen & performa indeks saham IDX |
| indices.back | Back | Kembali |
| indices.table_ticker | Ticker | Ticker |
| indices.table_name | Name | Nama |
| indices.table_price | Price | Harga |
| indices.table_change | Change | Change |
| indices.table_pct | % | % |
| indices.table_volume | Volume | Volume |
| indices.table_sector | Sector | Sektor |
| indices.error_title | Failed to load index data | Gagal memuat data indeks |
| indices.error_desc | Try refreshing the page. | Coba refresh halaman. |
| indices.constituents_failed | Failed to load constituents | Gagal memuat konstituen |
| indices.loading | Loading... | Memuat... |
| indices.stocks | stocks | stocks |
| indices.constituents | constituents | konstituen |

### `sector.*` Additional Keys (for hardcoded strings in sector.js)
| Key | EN | ID |
|-----|-----|-----|
| sector.rotation_title | Sector Rotation (12 weeks) | Rotasi Sektor (12 minggu) |
| sector.rotation_show | Show | Tampilkan |
| sector.rotation_hide | Close | Tutup |
| sector.rotation_analysis | No sector data for analysis | Tidak ada data sektor untuk analisis |
| sector.performance_today | Today's Performance | Performa Hari Ini |
| sector.show_all_stocks | Show All Stocks ({n}) — Sort & Filter | Tampilkan Semua Saham ({n}) — Urutkan & Filter |
| sector.industries | industries | industri |
| sector.ticker | Code | Kode |
| sector.company | Company | Perusahaan |
| sector.price_col | Price | Harga |
| sector.change_col | Change | Perubahan |
| sector.top_stock | Top | Teratas |
| sector.bottom_stock | Bottom | Terbawah |

### `help.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| help.title | Help Center | Pusat Bantuan |
| help.subtitle | Quick guide for scanner, portfolio, watchlist, and troubleshooting RetailBijak operations. | Panduan ringkas untuk alur pemindai, portofolio, daftar pantau, dan penanganan kendala operasional RetailBijak. |
| help.meta_pill | GUIDE | PANDUAN |
| help.quick_guide | Quick Start Guide | Panduan Mulai Cepat |
| help.open_settings | Open Settings | Buka Settings |
| help.step1_title | Open Scanner | Buka Pemindai |
| help.step1_desc | Go to scanner page, select active timeframe, then run SwingAQ scan to find the strongest candidates. | Masuk ke halaman pemindai, pilih timeframe aktif, lalu jalankan pemindai SwingAQ untuk membaca kandidat terkuat. |
| help.step2_title | Analyze Results | Analisis Hasil |
| help.step2_desc | Check CCI, magic line, and volume spikes from scan results, then open ticker detail for price structure validation. | Periksa CCI, magic line, dan lonjakan volume dari hasil scan, lalu buka detail ticker untuk validasi struktur harga. |
| help.step3_title | Manage Candidates | Kelola Kandidat |
| help.step3_desc | Save selected stocks to watchlist or portfolio for faster and more consistent monitoring. | Simpan saham pilihan ke daftar pantau atau portofolio agar pemantauan berikutnya lebih cepat dan konsisten. |
| help.keyboard_title | Keyboard Shortcuts | Pintasan Keyboard |
| help.faq_title | FAQ | Tanya Jawab |
| help.faq_swingaq_q | What is SwingAQ? | Apa itu SwingAQ? |
| help.faq_swingaq_a | SwingAQ is an institutional scanning engine that analyzes accumulation based on CCI, magic line (MA), and volume spikes to detect potential swing trading candidates. | SwingAQ adalah mesin pemindaian institusional yang menganalisis akumulasi berdasarkan CCI, magic line (MA), dan lonjakan volume untuk mendeteksi kandidat swing trading potensial. |
| help.faq_empty_q | Why are scan results empty? | Kenapa hasil scan kosong? |
| help.faq_empty_a | The scanner requires updated OHLCV data. Make sure the scheduler is running (check 09:00 & 15:30 WIB). If still empty, try refreshing or re-running the scan. | Scanner membutuhkan data OHLCV yang diperbarui. Pastikan scheduler berjalan (cek jam 09:00 & 15:30 WIB). Jika masih kosong, coba refresh atau jalankan ulang scan. |
| help.faq_portfolio_q | How to add stocks to portfolio? | Bagaimana cara menambahkan saham ke portofolio? |
| help.faq_portfolio_a | Open Portfolio page, click Add, then enter stock code, lot quantity, and average price. Data is saved in the database and synced across sessions. | Buka halaman Portofolio, klik Tambah, lalu isi kode saham, jumlah lot, dan harga rata-rata. Data tersimpan di basis data dan sinkron antar sesi. |
| help.faq_watchlist_q | What's the difference between Watchlist and Portfolio? | Apa perbedaan Watchlist dan Portofolio? |
| help.faq_watchlist_a | Watchlist is for monitoring target stocks without ownership data. Portfolio is for recording owned positions with average price and lots. | Watchlist untuk memantau saham incaran tanpa data kepemilikan. Portofolio untuk mencatat posisi yang sudah dimiliki beserta harga rata-rata dan lot. |
| help.faq_realtime_q | Real-time or delayed data? | Data real-time atau tertunda? |
| help.faq_realtime_a | Price data is updated via scheduler from Yahoo Finance at 09:00 and 15:30 WIB. Not real-time streaming — use technical indicators for confirmation. | Data harga diperbarui melalui scheduler dari Yahoo Finance pada jam 09:00 dan 15:30 WIB. Bukan real-time streaming — gunakan indikator teknikal untuk konfirmasi. |
| help.faq_ai_q | How to activate AI Picks? | Bagaimana cara mengaktifkan AI Picks? |
| help.faq_ai_a | Go to Settings, enter your OpenRouter API key, then save. Once active, AI Picks will show daily language model recommendations. | Masuk ke Pengaturan, masukkan API key OpenRouter, lalu simpan. Setelah aktif, AI Picks akan menampilkan rekomendasi berbasis model bahasa setiap hari. |
| help.support_title | Need Help? | Butuh Bantuan? |
| help.support_desc | Learn RetailBijak workflow: from scanning, analysis, to portfolio management. | Pelajari alur kerja RetailBijak: mulai dari pemindaian, analisis, hingga manajemen portofolio. |
| help.open_scanner | Open Scanner | Buka Pemindai |
| help.manage_assets | Manage Assets | Kelola Aset |

### `bottom.*` Additional Keys
| Key | EN | ID |
|-----|-----|-----|
| bottom.more | More | Lainnya |

### `drawer.*` Domain
| Key | EN | ID |
|-----|-----|-----|
| drawer.title | More Menu | Menu Lainnya |

### `stock_detail.*` Additional Keys (for the many hardcoded strings)
| Key | EN | ID |
|-----|-----|-----|
| stock.loading_emiten | Loading issuer data... | Memuat data emiten... |
| stock.price_prev_close | Previous | Sebelumnya |
| stock.price_open | Open | Pembukaan |
| stock.price_high | High | Tertinggi |
| stock.price_low | Low | Terendah |
| stock.price_volume | Volume | Volume |
| stock.price_value | Value | Nilai |
| stock.price_52w_high | 52W High | 52W Tertinggi |
| stock.price_52w_low | 52W Low | 52W Terendah |
| stock.chart_title | Price Chart | Grafik Harga |
| stock.chart_loading | Loading chart... | Memuat chart... |
| stock.chart_full | Full | Full |
| stock.chart_full_title | Open Full Chart | Buka Chart Penuh |
| stock.market_stats | Market Stats | Market Stats |
| stock.latest_catalysts | Latest Catalysts | Katalis Terbaru |
| stock.catalyst_desc | News, announcements, and sentiment that may affect price | Berita, pengumuman, dan sentimen yang berpotensi mempengaruhi harga |
| stock.tab_ai_chat | AI Chat | AI Chat |
| stock.tab_analysis | Analysis | Analisis |
| stock.tab_news | News | Berita |
| stock.tab_fundamental | Fundamental | Fundamental |
| stock.session_summary | Session Summary | Ringkasan Sesi |
| stock.tv_analysis | TradingView Technical Analysis | Analisis Teknikal TradingView |
| stock.ai_quick_read | Quick AI Read | Pembacaan Cepat AI |
| stock.ai_analysis | AI Analysis | Analisis AI |
| stock.ai_disclaimer | Analysis by AI based on technical + fundamental data. Always do your own research. | Analisis oleh AI berdasarkan data teknikal + fundamental. Selalu lakukan riset sendiri. |
| stock.custom_technical | Custom Technical Summary | Ringkasan Teknikal (Custom) |
| stock.signal_label | Signal | Sinyal |
| stock.confidence_label | Confidence | Keyakinan |
| stock.btn_watchlist | + Watch | + Pantau |
| stock.btn_watched | ✓ Watched | ✓ Dipantau |
| stock.btn_alert | Alert | Peringatan |
| stock.btn_compare | Compare | Bandingkan |
| stock.btn_scanner | Scanner | Pindai |
| stock.btn_ai_analysis | AI Analysis | AI Analisis |
| stock.btn_pdf | PDF | PDF |
| stock.related_news | Related News | Berita Terkait |
| stock.idx_announcements | IDX Announcements | Pengumuman IDX |
| stock.fundamental_metrics | Fundamental Metrics | Fundamental Metrics |
| stock.ask_ai_about | Ask AI about | Tanya AI tentang |
| stock.chat_greeting | Hello! Ask me about this stock. Example: \"What's the outlook for {ticker}?\" | Halo! Tanya saya tentang saham ini. Contoh: \"Apa outlook {ticker}?\" |
| stock.chat_hint | Ask about this stock... | Tanya tentang saham ini... |
| stock.chat_loading_history | Loading chat history... | Memuat riwayat chat... |
| stock.added_watchlist | {ticker} added to Watchlist | {ticker} ditambahkan ke Daftar Pantau |
| stock.removed_watchlist | {ticker} removed from Watchlist | {ticker} dihapus dari Daftar Pantau |
| stock.failed_watchlist | Failed to {action} {ticker} | Gagal {action} {ticker} |
| stock.ai_not_available | AI analysis is not available right now | AI analysis tidak tersedia saat ini |
| stock.ai_failed | Failed to load AI analysis. Check connection or try again. | Gagal memuat analisis AI. Periksa koneksi atau coba lagi. |
| stock.chat_error | Failed to connect to AI assistant. Try again. | Gagal terhubung ke asisten AI. Coba lagi. |
| stock.pdf_loading | Generating PDF report... | Membuat laporan PDF... |
| stock.pdf_ready | PDF report ready | Laporan PDF siap |
| stock.generating_report | Generating report for {ticker}... | Membuat laporan untuk {ticker}... |

### `screener.*` Additional Keys
| Key | EN | ID |
|-----|-----|-----|
| screener.kicker | SwingAQ Intelligence | SwingAQ Intelligence |
| screener.hero_title | Institutional Accumulation Scanner | Pemindai Akumulasi Institusi |
| screener.control_panel | CONTROL CENTER | PUSAT KONTROL |
| screener.timeframe | Timeframe: | Timeframe: |
| screener.daily | Daily (1D) | Harian (1D) |
| screener.index_filter | Index Filter | Filter Indeks |
| screener.all_stocks | All Stocks | Semua Saham |
| screener.pattern_filter | Candlestick Pattern Filter | Filter Pola Candlestick |
| screener.all_patterns | All Patterns | Semua Pola |
| screener.scan_pattern | Scan Pattern | Scan Pola |
| screener.quick_presets | Quick Presets | Preset Cepat |
| screener.analyzing | Analyzing... | Sedang menganalisis... |
| screener.live_signals | Live Signals | Sinyal Live |
| screener.not_scanned | NOT SCANNED | BELUM SCAN |
| screener.search_placeholder | Search code... | Cari kode... |
| screener.sort_cci | Sort: CCI | Urut: CCI |
| screener.sort_volume | Sort: Volume | Urut: Volume |
| screener.sort_ma | Sort: MA | Urut: MA |
| screener.sort_price | Sort: Price | Urut: Harga |
| screener.sort_ticker | Sort: Code | Urut: Kode |
| screener.sort_name | Sort: Name | Urut: Nama |
| screener.tv_title | TradingView Stock Scanner | Pemindai Saham TradingView |
| screener.tv_desc | Screen IDX stocks in real-time — filter by performance, volume, fundamentals, and more. | Screen saham IDX secara real-time — filter berdasarkan performa, volume, fundamental, dan lainnya. |
| screener.col_code | Code | Kode |
| screener.col_name | Name | Nama |
| screener.col_price | Price | Harga |
| screener.col_direction | Direction | Arah |
| screener.col_pattern | Pattern | Pola |
| screener.col_strength | Strength | Strength |
| screener.col_days | Days | Hari |

### `dashboard.*` Additional Keys
| Key | EN | ID |
|-----|-----|-----|
| dashboard.workspace | IDX WORKSPACE | RUANG KERJA IDX |
| dashboard.hero_title | Market Dashboard | Dashboard Pasar |
| dashboard.hero_desc | Monitor IHSG, breadth, and key movers in one screen. | Pantau IHSG, breadth, dan penggerak utama dalam satu layar. |
| dashboard.run_scanner | Run Scanner | Jalankan Pemindai |
| dashboard.market_overview | Market Overview | Ikhtisar Pasar |
| dashboard.ihsg_chart | IHSG Chart | IHSG Chart |
| dashboard.ihsg_data_from | Data from IDX | Data dari IDX |
| dashboard.top_movers | Top Movers | Penggerak Teratas |
| dashboard.see_all | See All → | Lihat Semua → |
| dashboard.bias_label | Market Bias | Bias Pasar |
| dashboard.lead_gainer | Top Gainer | Penguat Utama |
| dashboard.lead_sector | Lead Sector | Sektor Utama |
| dashboard.portfolio_pnl | Portfolio P&L | Portofolio P&L |
| dashboard.loading | Loading... | Memuat... |
| dashboard.sync_status | Sync: waiting for market summary. | Sinkronisasi: menunggu ringkasan pasar. |

### `market.*` Additional Keys
| Key | EN | ID |
|-----|-----|-----|
| market.page_title | Market Overview | Ikhtisar Pasar |
| market.page_desc | Market dashboard for IDX pulse, top movers, fund flows, and session catalysts. | Dashboard Pasar untuk pulse market IDX, movers utama, aliran dana, dan katalis sesi berjalan. |
| market.syncing | Syncing | Menyinkronkan |
| market.summary_sentence | Compiling market pulse summary... | Menyusun ringkasan denyut pasar... |
| market.updated_at | Updated {time} WIB | Diperbarui {time} WIB |
| market.source_label | Source: | Sumber: |
| market.refresh_btn | Reload | Muat Ulang |
| market.data_quality | Data Quality | Kualitas Data |
| market.flow_section | Flows & Participation | Arus & Partisipasi |
| market.flow_desc | Fund flows and broker engagement to measure session participation. | Aliran dana dan keterlibatan broker untuk mengukur partisipasi sesi. |
| market.catalyst_section | Catalysts & Agenda | Katalis & Agenda |
| market.catalyst_desc | Corporate catalysts and announcements that may move prices. | Katalis korporasi dan pengumuman yang berpotensi menggerakkan harga. |
| market.heatmap_title | IDX Market Heatmap | Heatmap Pasar IDX |
| market.heatmap_desc | IDX sector performance map — size = market cap, color = change. | Peta performa sektor bursa IDX — ukuran = kapitalisasi pasar, warna = perubahan. |
| market.local_heatmap_title | Sector Heatmap (CSS Grid) | Heatmap Sektor (CSS Grid) |
| market.local_heatmap_desc | IDX sector performance based on local OHLCV data — intensity = 1-day change %. | Performa sektor IDX berdasarkan data OHLCV lokal — intensitas = perubahan % 1 hari. |
| market.click_for_detail | Click sector for details | Klik sektor untuk detail |
| market.data_from_local | Data from local database | Data dari database lokal |
| market.ihsg_card_title | IHSG Summary | Ringkasan IHSG |
| market.ihsg_card_desc | Main index summary and session pulse | Ringkasan indeks utama dan denyut pasar sesi berjalan |
| market.market_mood | Market Mood | Mood Pasar |
| market.top_gainer | Top Gainer | Penguat Utama |
| market.top_loser | Top Loser | Pelemah Utama |
