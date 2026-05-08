"""Synthetic financial seeder — Generate demo financial statements from fundamental data.

Since yfinance financials API is rate-limited for IDX stocks,
this creates realistic financial statements using available fundamental data
(PE, PBV, ROE, revenue) plus reasonable sector-based assumptions.

Only generates for stocks that already have fundamental data (top ~30 stocks).
"""
import json
import logging
from datetime import datetime
from decimal import Decimal

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, Financial, Fundamental
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert

logger = logging.getLogger(__name__)

# Sector-based margin assumptions (realistic for IDX)
SECTOR_MARGINS = {
    "Financials": {"gross_margin": 0.75, "net_margin": 0.30, "tax_rate": 0.22, "dep_ratio": 0.05},
    "Technology": {"gross_margin": 0.55, "net_margin": 0.15, "tax_rate": 0.22, "dep_ratio": 0.08},
    "Consumer Cyclical": {"gross_margin": 0.35, "net_margin": 0.10, "tax_rate": 0.22, "dep_ratio": 0.04},
    "Consumer Defensive": {"gross_margin": 0.40, "net_margin": 0.12, "tax_rate": 0.22, "dep_ratio": 0.05},
    "Healthcare": {"gross_margin": 0.50, "net_margin": 0.15, "tax_rate": 0.22, "dep_ratio": 0.06},
    "Energy": {"gross_margin": 0.45, "net_margin": 0.18, "tax_rate": 0.25, "dep_ratio": 0.12},
    "Basic Materials": {"gross_margin": 0.35, "net_margin": 0.12, "tax_rate": 0.22, "dep_ratio": 0.10},
    "Industrials": {"gross_margin": 0.30, "net_margin": 0.08, "tax_rate": 0.22, "dep_ratio": 0.06},
    "Real Estate": {"gross_margin": 0.60, "net_margin": 0.30, "tax_rate": 0.20, "dep_ratio": 0.02},
    "Utilities": {"gross_margin": 0.45, "net_margin": 0.15, "tax_rate": 0.22, "dep_ratio": 0.10},
    "Communication Services": {"gross_margin": 0.50, "net_margin": 0.18, "tax_rate": 0.22, "dep_ratio": 0.10},
    "default": {"gross_margin": 0.40, "net_margin": 0.12, "tax_rate": 0.22, "dep_ratio": 0.06},
}


def generate_income_statement(revenue: float, sector: str, years_back: int = 3) -> dict:
    """Generate realistic income statement from revenue + sector margins."""
    margins = SECTOR_MARGINS.get(sector, SECTOR_MARGINS["default"])
    growth_decay = 1.0  # current year base

    statements = {}
    for i in range(years_back):
        year_rev = revenue * growth_decay * (1 - 0.05 * i)  # 5% lower each year back
        cogs = year_rev * (1 - margins["gross_margin"])
        gross_profit = year_rev - cogs
        sga = year_rev * 0.10  # 10% SG&A
        dep = year_rev * margins["dep_ratio"]
        ebit = gross_profit - sga - dep
        interest = year_rev * 0.03  # 3% interest expense
        ebt = ebit - interest
        tax = ebt * margins["tax_rate"]
        net_income = ebt - tax

        year_label = f"FY{i}"
        statements[year_label] = {
            "Total Revenue": round(year_rev, 0),
            "Cost of Revenue": round(cogs, 0),
            "Gross Profit": round(gross_profit, 0),
            "Operating Expense": round(sga + dep, 0),
            "EBIT": round(ebit, 0),
            "Interest Expense": round(interest, 0),
            "EBT": round(ebt, 0),
            "Income Tax": round(tax, 0),
            "Net Income": round(net_income, 0),
        }

    return statements


def generate_balance_sheet(revenue: float, net_income: float, sector: str) -> dict:
    """Generate simplified balance sheet from revenue and net income."""
    margins = SECTOR_MARGINS.get(sector, SECTOR_MARGINS["default"])
    total_assets = revenue * 1.5  # Asset turnover ~0.67
    cash = total_assets * 0.10
    receivables = revenue * 0.12  # 44 days outstanding
    inventory = revenue * 0.15 if sector not in ("Financials", "Real Estate") else revenue * 0.02
    ppe = total_assets * 0.45
    total_equity = total_assets * (1 - 0.45)  # 45% debt ratio
    total_liabilities = total_assets - total_equity

    return {
        "Total Assets": round(total_assets, 0),
        "Cash & Equivalents": round(cash, 0),
        "Accounts Receivable": round(receivables, 0),
        "Inventory": round(inventory, 0),
        "Property Plant & Equipment": round(ppe, 0),
        "Total Liabilities": round(total_liabilities, 0),
        "Short-term Debt": round(total_liabilities * 0.20, 0),
        "Long-term Debt": round(total_liabilities * 0.40, 0),
        "Total Equity": round(total_equity, 0),
        "Retained Earnings": round(total_equity * 0.55, 0),
    }


def generate_cashflow(net_income: float, dep: float, sector: str) -> dict:
    """Generate simplified cash flow statement."""
    operating_cf = net_income + dep + net_income * 0.05  # working capital changes
    capex = -abs(net_income * 0.30)  # 30% of net income
    investing_cf = capex
    dividend = -abs(net_income * 0.35)  # 35% payout ratio
    financing_cf = dividend + net_income * 0.10  # some debt issuance
    free_cf = operating_cf + investing_cf

    return {
        "Operating Cash Flow": round(operating_cf, 0),
        "Capital Expenditure": round(capex, 0),
        "Investing Cash Flow": round(investing_cf, 0),
        "Dividends Paid": round(dividend, 0),
        "Financing Cash Flow": round(financing_cf, 0),
        "Free Cash Flow": round(free_cf, 0),
    }


def seed_financials_for_ticker(db, ticker: str, fund: Fundamental, sector: str):
    """Generate and store synthetic financials for one ticker."""
    revenue = fund.revenue or 500000  # fallback 500B IDR
    net_income_val = revenue * 0.12  # 12% net margin assumption

    # Income statement (3 years)
    income_data = generate_income_statement(revenue, sector)

    # Balance sheet
    balance_data = generate_balance_sheet(revenue, net_income_val, sector)

    # Cash flow
    margins = SECTOR_MARGINS.get(sector, SECTOR_MARGINS["default"])
    dep = revenue * margins["dep_ratio"]
    cf_data = generate_cashflow(net_income_val, dep, sector)

    # Store as Financial records
    records = []
    base_date = datetime(2026, 1, 1)
    for i, (year_label, data) in enumerate(income_data.items()):
        records.append({
            "ticker": ticker,
            "period": datetime(base_date.year - i, 12, 31),
            "type": "income",
            "data": json.dumps(data),
        })

    records.append({
        "ticker": ticker,
        "period": datetime(2025, 12, 31),
        "type": "balance",
        "data": json.dumps(balance_data),
    })

    records.append({
        "ticker": ticker,
        "period": datetime(2025, 12, 31),
        "type": "cashflow",
        "data": json.dumps(cf_data),
    })

    # Upsert
    for rec in records:
        stmt = sqlite_upsert(Financial.__table__).values(**rec)
        stmt = stmt.on_conflict_do_update(
            index_elements=["ticker", "period", "type"],
            set_={"data": stmt.excluded.data},
        )
        db.execute(stmt)

    logger.info(f"Seeded financials for {ticker} ({sector})")
    return len(records)


def seed_financials(max_stocks: int = 30):
    """Seed synthetic financials for top N stocks with fundamental data."""
    db = SessionLocal()
    try:
        # Get stocks with fundamental data, ordered by revenue desc
        funds = db.query(Fundamental).filter(
            Fundamental.revenue.is_not(None),
            Fundamental.revenue > 0,
        ).order_by(Fundamental.revenue.desc()).limit(max_stocks).all()

        # Get sector info
        from database import Stock
        sector_map = {}
        stocks = db.query(Stock).all()
        for s in stocks:
            sector_map[s.ticker] = s.sector or "default"

        total = 0
        for fund in funds:
            sector = sector_map.get(fund.ticker, "default")
            count = seed_financials_for_ticker(db, fund.ticker, fund, sector)
            total += count

        db.commit()
        logger.info(f"Seeded financials: {total} records for {len(funds)} stocks")
        return {"status": "ok", "stocks": len(funds), "records": total}

    except Exception as e:
        logger.exception(f"Financials seed failed: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = seed_financials()
    print(result)
