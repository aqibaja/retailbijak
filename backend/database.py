import os
from datetime import datetime
from typing import Any

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:////opt/swingaq/backend/swingaq.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String, primary_key=True, index=True)
    name = Column(String)
    sector = Column(String)
    industry = Column(String)
    market_cap = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow)


class OHLCVDaily(Base):
    __tablename__ = "ohlcv_daily"

    ticker = Column(String, primary_key=True, index=True)
    date = Column(DateTime, primary_key=True, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)


class Fundamental(Base):
    __tablename__ = "fundamentals"

    ticker = Column(String, primary_key=True, index=True)
    trailing_pe = Column(Float)
    forward_pe = Column(Float)
    price_to_book = Column(Float)
    trailing_eps = Column(Float)
    dividend_yield = Column(Float)
    roe = Column(Float)
    roa = Column(Float)
    debt_to_equity = Column(Float)
    revenue = Column(Float)
    net_income = Column(Float)
    free_cashflow = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Financial(Base):
    __tablename__ = "financials"

    ticker = Column(String, primary_key=True, index=True)
    period = Column(DateTime, primary_key=True)
    type = Column(String, primary_key=True)  # 'income', 'balance', 'cashflow'
    data = Column(JSON)


class Signal(Base):
    __tablename__ = "signals"

    ticker = Column(String, primary_key=True, index=True)
    timeframe = Column(String, primary_key=True, index=True)
    signal_date = Column(DateTime, primary_key=True, index=True)
    signal_type = Column(String)  # 'buy', 'sell'
    close = Column(Float)
    magic_line = Column(Float)
    cci = Column(Float)
    stop_loss = Column(Float)
    sl_pct = Column(Float)


class BrokerSummary(Base):
    __tablename__ = "broker_summary"

    ticker = Column(String, primary_key=True, index=True)
    date = Column(DateTime, primary_key=True, index=True)
    broker_code = Column(String, primary_key=True)
    buy_volume = Column(Integer)
    sell_volume = Column(Integer)
    net_volume = Column(Integer)
    buy_value = Column(Float)
    sell_value = Column(Float)
    net_value = Column(Float)


class News(Base):
    __tablename__ = "news"

    id = Column(String, primary_key=True)  # link as ID
    title = Column(String)
    link = Column(String)
    published_at = Column(DateTime, index=True)
    source = Column(String)
    summary = Column(String)
    image_url = Column(String, nullable=True)
    tickers = Column(String, nullable=True)  # JSON array of related IDX tickers
    sentiment = Column(String, nullable=True)  # 'positive', 'negative', 'neutral'


class UserSetting(Base):
    __tablename__ = "user_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WatchlistGroup(Base):
    __tablename__ = "watchlist_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    icon = Column(String, default="folder")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    notes = Column(String, default="")
    group_id = Column(Integer, ForeignKey("watchlist_groups.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    lots = Column(Integer, nullable=False)
    avg_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyAIPickReport(Base):
    __tablename__ = "daily_ai_pick_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trading_date = Column(String, index=True, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)
    mode = Column(String, index=True, nullable=False)
    market_bias = Column(String, default="")
    summary = Column(String, default="")
    runtime_state = Column(String, default="unknown")
    runtime_message = Column(String, default="")
    model = Column(String, default="")
    payload_json = Column(JSON)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False)  # price_above, price_below, rsi_above, rsi_below
    value = Column(Float, nullable=False)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertTrigger(Base):
    __tablename__ = "alert_triggers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, index=True, nullable=False)
    ticker = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False)
    trigger_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
    seen = Column(Integer, default=0)


class PaperTrade(Base):
    __tablename__ = "paper_trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    trade_type = Column(String, nullable=False)  # BUY or SELL
    entry_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)  # in shares
    entry_date = Column(DateTime, default=datetime.utcnow)
    exit_price = Column(Float)
    exit_date = Column(DateTime)
    pnl = Column(Float)
    pnl_pct = Column(Float)
    status = Column(String, default='open')  # open or closed
    strategy = Column(String, default='manual')  # strategy name if from backtest
    notes = Column(String, default='')


class TransactionLog(Base):
    """Portfolio transaction history — buy/sell records for P&L tracking."""
    __tablename__ = "transaction_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    transaction_type = Column(String, nullable=False)  # 'buy' or 'sell'
    price = Column(Float, nullable=False)
    lots = Column(Integer, nullable=False)
    shares = Column(Integer, nullable=False)  # computed as lots * 100
    fee = Column(Float, default=0.0)
    total = Column(Float, nullable=False)  # (price * shares) + fee
    transaction_date = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(String, default='')
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatHistory(Base):
    """AI chat history per stock — persistent Q&A context."""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    message = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
