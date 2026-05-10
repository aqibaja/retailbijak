"""
Sector & Industry Classifier for IDX Stocks
============================================
Mengisi 960/974 stocks yang belum punya sector/industry data.

Strategy (dual approach):
1. Try yfinance info (rate-limited, but works for popular stocks)
2. Fallback: name-based keyword classification

Run as scheduler: daily 03:00 WIB
"""

import logging
import time
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, Stock
logger = logging.getLogger(__name__)

# ─── Keyword-based sector classification ──────────────
# IDX stock names contain keywords that reveal their sector
SECTOR_KEYWORDS = {
    'Financials': [
        'BANK', 'BNK', 'FINANCE', 'FINANCIAL', 'KREDIT', 'MANDIRI', 'BCA', 'BRI', 'BNI',
        'DANA', 'TABUNGAN', 'ASURANSI', 'INSURANCE', 'SEKURITAS', 'SECURITIES',
        'PEGADAIAN', 'PEMBIAYAAN', 'FINTECH', 'BPR', 'SYARIAH', 'INVESTAMA', 'VENTURA',
        'DINAMIKA', 'MITRA', 'KAPITAL', 'ARTHA', 'ASSET', 'MANAJEMEN', 'MANAGEMENT',
        'MULTIFINANCE', 'DANA SYARIAH',
    ],
    'Energy': [
        'ENERGY', 'ENERGI', 'MINYAK', 'OIL', 'GAS', 'BATUBARA', 'COAL', 'TAMBANG',
        'MINING', 'PERTAMINA', 'GEOTHERMAL', 'PANAS BUMI', 'SUMBER', 'CORPORINDO',
        'RESOURCES', 'SUMBERDAYA', 'HYDRO', 'POWER', 'ENERGI BARU',
    ],
    'Basic Materials': [
        'TAMBANG', 'MINING', 'SEMEN', 'CEMENT', 'BAJA', 'STEEL', 'KERTAS', 'PAPER',
        'KIMIA', 'CHEMICAL', 'NIKEL', 'NICKEL', 'EMAS', 'GOLD', 'TIMAH', 'TIN',
        'LOGAM', 'METAL', 'INDUSTRY', 'PLASTIK', 'POLY', 'PULP',
        'MINERAL', 'MINERALS', 'ALUMINDO', 'LIGHT METAL', 'KERAMIK', 'CERAMIC',
        'INTI', 'PABRIK', 'KACA', 'GLASS', 'FLAT', 'KALENG', 'PACKAGING',
        'KEMASAN', 'TIMBANG',
    ],
    'Industrials': [
        'INDUSTRI', 'MESIN', 'MACHINERY', 'KONSTRUKSI', 'CONSTRUCTION',
        'OTOMOTIF', 'AUTOMOTIVE', 'ELEKTRONIK', 'ELECTRONIC', 'KABEL', 'CABLE',
        'PIPA', 'PIPE', 'ALAT', 'TOOL', 'ENGINEERING', 'REKAYASA',
        'KARYA', 'SPAREPARTS', 'SPARE PART', 'ELEKTRINDO', 'NARATAMA',
        'INDONUSA', 'MEKANIK', 'MECANIQUE',
    ],
    'Consumer Non-Cyclicals': [
        'MAKANAN', 'FOOD', 'MINUMAN', 'BEVERAGE', 'ROKOK', 'TOBACCO', 'CIGARETTE',
        'KOSMETIK', 'COSMETIC', 'FARMASI', 'PHARMACEUTICAL', 'OBAT', 'KESEHATAN',
        'HEALTH', 'SUSU', 'MILK', 'INDOFOOD',
        'UNILEVER', 'GUDANG GARAM', 'DARYA VARIA', 'KALBE',
        'AGRO', 'AGRICULTURE', 'LESTARI', 'TANI', 'FARM', 'BUMI',
        'TIRTA', 'AIR', 'WATER', 'SEJAHTERA', 'AKASHA', 'WIRA',
        'IKAN', 'FISH', 'MINA', 'PERIKANAN', 'LAUT',
        'BERKAH', 'PANGAN', 'MAKMUR', 'TUNAS', 'SAWIT', 'PALM',
        'INTI', 'BUDI',
    ],
    'Consumer Cyclicals': [
        'RITEL', 'RETAIL', 'DEPARTEMEN', 'STORE', 'SUPERMARKET', 'MALL',
        'HIBURAN', 'ENTERTAINMENT', 'HOTEL', 'PARIWISATA', 'TOURISM',
        'FASHION', 'HIDUP', 'ASPIRASI', 'RUMAH', 'MUSTIKA',
    ],
    'Healthcare': [
        'RUMAH SAKIT', 'HOSPITAL', 'FARMASI', 'PHARMA', 'OBAT', 'MEDICAL',
        'KESEHATAN', 'HEALTH', 'DIAGNOSTIK', 'LABORATORIUM', 'SILOAM',
        'DOKTER', 'KLINIK',
    ],
    'Technology': [
        'TEKNOLOGI', 'TECHNOLOGY', 'DIGITAL', 'SOFTWARE', 'TELEKOMUNIKASI',
        'KOMPUTER', 'COMPUTER', 'IT ', 'DATA', 'ONLINE', 'PLATFORM', 'GOTO',
        'MEDIA', 'TELEVISI', 'TV', 'BROADCAST', 'INFORMATIKA',
        'GRAPHIA', 'CITRA',
    ],
    'Infrastructure': [
        'TELEKOMUNIKASI', 'TELKOM', 'TELEKOM', 'TOWER', 'INFRASTRUKTUR',
        'INFRASTRUCTURE', 'JALAN TOL', 'TOLL ROAD', 'PELABUHAN', 'PORT',
        'BANDARA', 'AIRPORT', 'LOGISTIK', 'LOGISTICS', 'TRANSPORTASI',
    ],
    'Transportation': [
        'TRANSPORTASI', 'TRANSPORT', 'LOGISTIK', 'LOGISTICS', 'PELAYARAN',
        'SHIPPING', 'PENERBANGAN', 'AVIATION', 'KAPAL', 'SHIP', 'KERETA',
        'KARGO', 'CARGO', 'ANCARA', 'TAXI', 'SARANA',
    ],
    'Property & Real Estate': [
        'PROPERTI', 'PROPERTY', 'REALTY', 'REAL ESTATE', 'LAND', 'TANAH',
        'GEDUNG', 'BUILDING', 'APARTEMEN', 'APARTMENT', 'KAWASAN',
        'KOMMUTER', 'COMMUTER', 'PURI', 'GREEN', 'CITRAMULIA', 'PRAMULIA',
    ],
    'Energy & Mineral': [
        'ARCHI', 'ATLAS RESOURCES',
    ],
    'Investment Services': [
        'ASHMORE',
    ],
}

# Industry sub-classification (more specific) — covers all sectors
INDUSTRY_KEYWORDS = {
    'Financials': [
        ('Bank', ['BANK', 'BNI', 'BCA', 'BRI', 'MANDIRI', 'BNK', 'SYARIAH', 'BPR']),
        ('Insurance', ['ASURANSI', 'INSURANCE']),
        ('Securities', ['SEKURITAS', 'SECURITIES', 'INVESTAMA']),
        ('Multi-Finance', ['PEMBIAYAAN', 'MULTIFINANCE', 'FINANCE', 'KREDIT', 'DANA']),
        ('Fintech', ['FINTECH', 'DIGITAL', 'PAYMENT']),
        ('Asset Management', ['ASSET', 'MANAJEMEN', 'MANAGEMENT', 'VENTURA', 'KAPITAL']),
    ],
    'Energy': [
        ('Coal Mining', ['BATUBARA', 'COAL', 'ARCHI']),
        ('Oil & Gas', ['MINYAK', 'OIL', 'GAS', 'PERTAMINA', 'ENERGI']),
        ('Geothermal', ['GEOTHERMAL', 'PANAS BUMI']),
        ('Renewable Energy', ['ENERGI BARU', 'RENEWABLE', 'HYDRO', 'SURYA', 'SOLAR']),
        ('Power Utility', ['POWER', 'PLN', 'LISTRIK']),
    ],
    'Basic Materials': [
        ('Metal & Mineral Mining', ['NIKEL', 'NICKEL', 'EMAS', 'GOLD', 'TIMAH', 'TIN', 'LOGAM', 'METAL', 'MINERAL', 'ALUMINDO']),
        ('Cement', ['SEMEN', 'CEMENT']),
        ('Steel', ['BAJA', 'STEEL']),
        ('Chemicals', ['KIMIA', 'CHEMICAL']),
        ('Pulp & Paper', ['KERTAS', 'PAPER', 'PULP']),
        ('Packaging', ['KEMASAN', 'PACKAGING', 'KALENG', 'PLASTIK', 'POLY']),
        ('Glass & Ceramics', ['KACA', 'GLASS', 'KERAMIK', 'CERAMIC']),
    ],
    'Industrials': [
        ('Machinery', ['MESIN', 'MACHINERY', 'ALAT BERAT', 'HEAVY EQUIPMENT']),
        ('Construction', ['KONSTRUKSI', 'CONSTRUCTION', 'KARYA', 'WIKA', 'WASKITA', 'ADHI', 'PTPP']),
        ('Automotive', ['OTOMOTIF', 'AUTOMOTIVE', 'ASII', 'SPAREPARTS', 'SPARE PART']),
        ('Electronics', ['ELEKTRONIK', 'ELECTRONIC', 'ELEKTRINDO']),
        ('Cable', ['KABEL', 'CABLE']),
        ('Engineering', ['ENGINEERING', 'REKAYASA', 'INDUSTRI']),
        ('Pipe & Steel Fabrication', ['PIPA', 'PIPE', 'FABRIKASI', 'FABRICATION']),
    ],
    'Consumer Non-Cyclicals': [
        ('Food & Beverage', ['MAKANAN', 'FOOD', 'MINUMAN', 'BEVERAGE', 'INDOFOOD', 'SUSU', 'MILK', 'PANGAN', 'BERKAH']),
        ('Tobacco', ['ROKOK', 'TOBACCO', 'CIGARETTE', 'GUDANG GARAM', 'GGRM', 'HMSP']),
        ('Pharmaceuticals', ['FARMASI', 'PHARMACEUTICAL', 'OBAT', 'KALBE', 'DARYA VARIA']),
        ('Cosmetics & Household', ['KOSMETIK', 'COSMETIC', 'UNILEVER', 'RUMAH TANGGA', 'HIDUP']),
        ('Agriculture', ['AGRO', 'AGRICULTURE', 'TANI', 'FARM', 'SAWIT', 'PALM', 'LESTARI', 'PERKEBUNAN', 'PLANTATION']),
        ('Fishery', ['IKAN', 'FISH', 'MINA', 'PERIKANAN', 'LAUT']),
        ('Healthcare', ['KESEHATAN', 'HEALTH', 'RUMAH SAKIT', 'HOSPITAL', 'SILOAM', 'MEDICAL']),
    ],
    'Consumer Cyclicals': [
        ('Retail', ['RITEL', 'RETAIL', 'SUPERMARKET', 'DEPARTEMEN', 'STORE', 'MATAHARI', 'RAMAYANA']),
        ('Entertainment', ['HIBURAN', 'ENTERTAINMENT', 'MEDIA', 'FILM', 'TELEVISI', 'TV', 'BROADCAST']),
        ('Hospitality', ['HOTEL', 'RESORT', 'PARIWISATA', 'TOURISM', 'RESTORAN', 'RESTAURANT']),
        ('Fashion & Lifestyle', ['FASHION', 'MUSTIKA', 'ASPIRASI', 'HIDUP']),
        ('Property Developer', ['PROPERTI', 'PROPERTY', 'REALTY', 'LAND', 'TANAH', 'GEDUNG', 'BUILDING', 'APARTEMEN', 'APARTMENT']),
    ],
    'Healthcare': [
        ('Hospital', ['RUMAH SAKIT', 'HOSPITAL', 'SILOAM', 'MITRA KELUARGA']),
        ('Pharmaceutical', ['FARMASI', 'PHARMA', 'OBAT', 'KALBE', 'DARYA VARIA']),
        ('Medical Devices', ['ALAT KESEHATAN', 'MEDICAL', 'DIAGNOSTIK']),
        ('Laboratory', ['LABORATORIUM', 'LAB', 'PRODIA']),
    ],
    'Technology': [
        ('Software', ['SOFTWARE', 'TEKNOLOGI', 'TECHNOLOGY', 'INFORMATIKA', 'IT ']),
        ('Digital Services', ['DIGITAL', 'ONLINE', 'PLATFORM', 'GOTO', 'E-COMMERCE']),
        ('Hardware & Devices', ['KOMPUTER', 'COMPUTER', 'HARDWARE', 'ELEKTRONIK']),
        ('Telecommunication', ['TELEKOMUNIKASI', 'TELKOM', 'TELEKOM', 'DATA', 'NETWORK', 'FIBER']),
        ('Media & Broadcasting', ['MEDIA', 'TELEVISI', 'TV', 'BROADCAST', 'GRAPHIA', 'CITRA']),
    ],
    'Infrastructure': [
        ('Telecommunication', ['TELEKOMUNIKASI', 'TELKOM', 'TELEKOM', 'TOWER', 'FIBER', 'DATA', 'NETWORK']),
        ('Toll Road', ['JALAN TOL', 'TOLL ROAD', 'TOL']),
        ('Port & Harbor', ['PELABUHAN', 'PORT', 'HARBOR']),
        ('Airport', ['BANDARA', 'AIRPORT']),
        ('Logistics', ['LOGISTIK', 'LOGISTICS', 'KURIR', 'DELIVERY']),
        ('Utility', ['UTILITY', 'AIR', 'WATER', 'LISTRIK', 'POWER', 'ENERGI']),
    ],
    'Transportation': [
        ('Shipping', ['PELAYARAN', 'SHIPPING', 'KAPAL', 'SHIP', 'LAUT', 'MARINE']),
        ('Aviation', ['PENERBANGAN', 'AVIATION', 'MASKAPAI', 'AIRLINE']),
        ('Land Transport', ['KERETA', 'TRAIN', 'TAXI', 'BUS', 'SARANA']),
        ('Logistics', ['LOGISTIK', 'LOGISTICS', 'KARGO', 'CARGO', 'ANCARA']),
    ],
    'Property & Real Estate': [
        ('Property Development', ['PROPERTI', 'PROPERTY', 'DEVELOPMENT', 'DEVELOPER', 'REALTY', 'KAWASAN', 'PURI', 'GREEN']),
        ('Real Estate', ['REAL ESTATE', 'TANAH', 'LAND', 'RUMAH']),
        ('REIT', ['REIT', 'DANA INVESTASI', 'PROPERTI']),
        ('Building Management', ['GEDUNG', 'BUILDING', 'APARTEMEN', 'APARTMENT', 'KOMMUTER', 'COMMUTER']),
    ],
    'Energy & Mineral': [
        ('Coal Mining', ['ARCHI', 'ATLAS', 'RESOURCES', 'TAMBANG', 'MINING']),
        ('Oil & Gas', ['ENERGY', 'ENERGI', 'MINYAK', 'GAS']),
    ],
    'Investment Services': [
        ('Investment', ['ASHMORE', 'INVESTMENT', 'INVESTASI', 'ASSET MANAGEMENT']),
        ('Financial Advisory', ['ADVISORY', 'KONSULTAN', 'SECURITIES']),
    ],
}

# Direct ticker→sector override (for well-known stocks that don't match keywords)
TICKER_OVERRIDES = {
    'GOTO': ('Technology', 'Internet Platform'),
    'BBCA': ('Financials', 'Bank'),
    'BBRI': ('Financials', 'Bank'),
    'BMRI': ('Financials', 'Bank'),
    'BBNI': ('Financials', 'Bank'),
    'TLKM': ('Infrastructure', 'Telecommunication'),
    'ISAT': ('Infrastructure', 'Telecommunication'),
    'EXCL': ('Infrastructure', 'Telecommunication'),
    'ASII': ('Industrials', 'Automotive'),
    'UNVR': ('Consumer Non-Cyclicals', 'Household Products'),
    'INDF': ('Consumer Non-Cyclicals', 'Food Processing'),
    'ICBP': ('Consumer Non-Cyclicals', 'Food Processing'),
    'ADRO': ('Energy', 'Coal Mining'),
    'BREN': ('Energy', 'Coal Mining'),
    'BUMI': ('Energy', 'Coal Mining'),
    'PTBA': ('Energy', 'Coal Mining'),
    'ANTM': ('Basic Materials', 'Metal Mining'),
    'BRPT': ('Basic Materials', 'Chemical'),
    'AMMN': ('Basic Materials', 'Metal Mining'),
    'GGRM': ('Consumer Non-Cyclicals', 'Tobacco'),
    'HMSP': ('Consumer Non-Cyclicals', 'Tobacco'),
}


def classify_by_keywords(ticker: str, name: str) -> tuple[str, str] | None:
    """Classify a stock using name-based keyword matching."""
    if not name:
        return None
    
    name_upper = name.upper()
    
    # Try ticker override first
    base = ticker.replace('.JK', '')
    if base in TICKER_OVERRIDES:
        return TICKER_OVERRIDES[base]
    
    # Score each sector by keyword matches
    scores = {}
    industry_found = None
    
    for sector, keywords in SECTOR_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in name_upper:
                score += 1
        if score > 0:
            scores[sector] = score
    
    if not scores:
        return None
    
    # Pick sector with highest score
    best_sector = max(scores, key=scores.get)
    
    # Try to determine industry within that sector
    sector_industries = INDUSTRY_KEYWORDS.get(best_sector, [])
    for ind_name, ind_keywords in sector_industries:
        if any(kw in name_upper for kw in ind_keywords):
            return (best_sector, ind_name)
    
    return (best_sector, '')


def classify_all_missing():
    """Classify all stocks that are missing sector/industry data."""
    db = SessionLocal()
    try:
        # Find stocks without sector
        stocks = db.query(Stock).filter(
            (Stock.sector.is_(None)) | (Stock.sector == '')
        ).order_by(Stock.ticker).all()
        
        logger.info(f"Found {len(stocks)} stocks without sector data")
        
        # Try yfinance for batch of unknown stocks (with delays)
        # Use a smaller batch to avoid rate limits
        unknown_stocks = []
        
        updated = 0
        for stock in stocks:
            result = classify_by_keywords(stock.ticker, stock.name or '')
            
            if result:
                sector, industry = result
                stock.sector = sector
                stock.industry = industry if industry else None
                updated += 1
                logger.info(f"[KEYWORD] {stock.ticker}: {sector} / {industry or '-'}")
            else:
                unknown_stocks.append(stock.ticker)
        
        db.commit()
        logger.info(f"Updated {updated} stocks via keyword classification")
        
        if unknown_stocks:
            logger.info(f"Unclassified stocks ({len(unknown_stocks)}): {unknown_stocks[:10]}...")
        
        return {
            'classified': updated,
            'unclassified': len(unknown_stocks),
            'total': len(stocks),
        }
    
    except Exception as e:
        logger.error(f"Error classifying sectors: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def _industry_keyword_fallback(ticker: str, name: str, sector: str) -> str | None:
    """Fallback industry classification using name keywords within a given sector."""
    if not name:
        return None

    name_upper = name.upper()
    sector_industries = INDUSTRY_KEYWORDS.get(sector, [])

    for ind_name, ind_keywords in sector_industries:
        if any(kw in name_upper for kw in ind_keywords):
            return ind_name

    return None


def classify_industries():
    """Classify industry (sub-sector) for stocks that have sector but no industry.

    Strategy:
    1. Query stocks with sector set but industry missing
    2. Try ticker overrides first
    3. Fallback: keyword-based industry matching
    4. If still not found, use sector->default industry mapping
    """
    db = SessionLocal()
    try:
        # Stocks that have sector but no industry
        stocks = db.query(Stock).filter(
            Stock.sector.isnot(None),
            Stock.sector != '',
            (Stock.industry.is_(None)) | (Stock.industry == ''),
        ).order_by(Stock.ticker).all()

        logger.info(f"Found {len(stocks)} stocks with sector but no industry")

        updated = 0
        skipped = 0

        for stock in stocks:
            ticker_base = stock.ticker.replace('.JK', '')

            # 1. Check ticker overrides first
            if ticker_base in TICKER_OVERRIDES:
                _, industry = TICKER_OVERRIDES[ticker_base]
                if industry:
                    stock.industry = industry
                    updated += 1
                    logger.info(f"[OVERRIDE] {stock.ticker}: {stock.sector} → {industry}")
                    continue

            # 2. Keyword-based industry matching for stocks in this sector
            industry = _industry_keyword_fallback(ticker_base, stock.name, stock.sector)
            if industry:
                stock.industry = industry
                updated += 1
                logger.info(f"[KEYWORD] {stock.ticker}: {stock.sector} → {industry}")
                continue

            # 3. Use default industry per sector if available
            sector_industries = INDUSTRY_KEYWORDS.get(stock.sector, [])
            if sector_industries:
                default_ind = sector_industries[0][0]
                stock.industry = default_ind
                updated += 1
                logger.info(f"[DEFAULT] {stock.ticker}: {stock.sector} → {default_ind}")
            else:
                skipped += 1
                logger.debug(f"[SKIP] {stock.ticker}: no industry mapping for sector '{stock.sector}'")

        db.commit()
        logger.info(f"Industry classification done: {updated} updated, {skipped} skipped")

        return {
            'updated': updated,
            'skipped': skipped,
            'total': len(stocks),
        }

    except Exception as e:
        logger.error(f"Error classifying industries: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    result = classify_all_missing()
    print(f"Sector classify done: {result['classified']} classified, {result['unclassified']} unclassified out of {result['total']}")
    result2 = classify_industries()
    print(f"Industry classify done: {result2['updated']} updated, {result2['skipped']} skipped out of {result2['total']}")
