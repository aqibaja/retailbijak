from datetime import datetime
from typing import Any

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./swingaq.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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


class UserSetting(Base):
    __tablename__ = "user_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    notes = Column(String, default="")
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


# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
