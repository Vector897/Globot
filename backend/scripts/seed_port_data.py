"""
Seed port data into the database
Run with: python scripts/seed_port_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Port, PSCRegime

# Port data with UN/LOCODE and PSC regime mapping
PORTS_DATA = [
    # --- East Asia (Tokyo MOU) ---
    {"name": "Shanghai", "un_locode": "CNSHA", "country": "China", "country_code": "CHN",
     "coordinates": [121.60, 31.23], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Singapore", "un_locode": "SGSIN", "country": "Singapore", "country_code": "SGP",
     "coordinates": [103.82, 1.26], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Ningbo", "un_locode": "CNNGB", "country": "China", "country_code": "CHN",
     "coordinates": [121.85, 29.86], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Shenzhen", "un_locode": "CNSZX", "country": "China", "country_code": "CHN",
     "coordinates": [114.26, 22.56], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Qingdao", "un_locode": "CNTAO", "country": "China", "country_code": "CHN",
     "coordinates": [120.32, 36.06], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Guangzhou", "un_locode": "CNCAN", "country": "China", "country_code": "CHN",
     "coordinates": [113.60, 22.75], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Busan", "un_locode": "KRPUS", "country": "South Korea", "country_code": "KOR",
     "coordinates": [129.07, 35.10], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Tianjin", "un_locode": "CNTSN", "country": "China", "country_code": "CHN",
     "coordinates": [117.70, 38.99], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Hong Kong", "un_locode": "HKHKG", "country": "China", "country_code": "CHN",
     "coordinates": [114.12, 22.35], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Xiamen", "un_locode": "CNXMN", "country": "China", "country_code": "CHN",
     "coordinates": [118.06, 24.48], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Kaohsiung", "un_locode": "TWKHH", "country": "Taiwan", "country_code": "TWN",
     "coordinates": [120.28, 22.62], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Laem Chabang", "un_locode": "THLCH", "country": "Thailand", "country_code": "THA",
     "coordinates": [100.89, 13.08], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Cai Mep", "un_locode": "VNCMT", "country": "Vietnam", "country_code": "VNM",
     "coordinates": [107.03, 10.52], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Haiphong", "un_locode": "VNHPH", "country": "Vietnam", "country_code": "VNM",
     "coordinates": [106.70, 20.84], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Tanjung Pelepas", "un_locode": "MYTPP", "country": "Malaysia", "country_code": "MYS",
     "coordinates": [103.55, 1.36], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Port Klang", "un_locode": "MYPKG", "country": "Malaysia", "country_code": "MYS",
     "coordinates": [101.32, 2.99], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Jakarta", "un_locode": "IDJKT", "country": "Indonesia", "country_code": "IDN",
     "coordinates": [106.87, -6.10], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Manila", "un_locode": "PHMNL", "country": "Philippines", "country_code": "PHL",
     "coordinates": [120.96, 14.60], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Tokyo", "un_locode": "JPTYO", "country": "Japan", "country_code": "JPN",
     "coordinates": [139.78, 35.62], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Yokohama", "un_locode": "JPYOK", "country": "Japan", "country_code": "JPN",
     "coordinates": [139.66, 35.44], "region": "Asia", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": False},
    {"name": "Colombo", "un_locode": "LKCMB", "country": "Sri Lanka", "country_code": "LKA",
     "coordinates": [79.84, 6.94], "region": "Asia", "psc_regime": PSCRegime.INDIAN_OCEAN_MOU, "is_eca": False},
    {"name": "Mumbai", "un_locode": "INBOM", "country": "India", "country_code": "IND",
     "coordinates": [72.95, 18.95], "region": "Asia", "psc_regime": PSCRegime.INDIAN_OCEAN_MOU, "is_eca": False},

    # --- Middle East (Riyadh MOU) ---
    {"name": "Jebel Ali", "un_locode": "AEJEA", "country": "UAE", "country_code": "ARE",
     "coordinates": [55.02, 25.01], "region": "Middle East", "psc_regime": PSCRegime.RIYADH_MOU, "is_eca": False},
    {"name": "Salalah", "un_locode": "OMSLL", "country": "Oman", "country_code": "OMN",
     "coordinates": [54.00, 16.94], "region": "Middle East", "psc_regime": PSCRegime.RIYADH_MOU, "is_eca": False},
    {"name": "Jeddah", "un_locode": "SAJED", "country": "Saudi Arabia", "country_code": "SAU",
     "coordinates": [39.16, 21.48], "region": "Middle East", "psc_regime": PSCRegime.RIYADH_MOU, "is_eca": False},

    # --- Europe (Paris MOU) - Many in ECA zones ---
    {"name": "Rotterdam", "un_locode": "NLRTM", "country": "Netherlands", "country_code": "NLD",
     "coordinates": [4.05, 51.95], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": True},
    {"name": "Antwerp", "un_locode": "BEANR", "country": "Belgium", "country_code": "BEL",
     "coordinates": [4.28, 51.30], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": True},
    {"name": "Hamburg", "un_locode": "DEHAM", "country": "Germany", "country_code": "DEU",
     "coordinates": [9.93, 53.53], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": True},
    {"name": "Felixstowe", "un_locode": "GBFXT", "country": "UK", "country_code": "GBR",
     "coordinates": [1.31, 51.95], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": True},
    {"name": "Le Havre", "un_locode": "FRLEH", "country": "France", "country_code": "FRA",
     "coordinates": [0.10, 49.48], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": True},
    {"name": "Valencia", "un_locode": "ESVLC", "country": "Spain", "country_code": "ESP",
     "coordinates": [-0.32, 39.44], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": False},
    {"name": "Algeciras", "un_locode": "ESALG", "country": "Spain", "country_code": "ESP",
     "coordinates": [-5.43, 36.14], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": False},
    {"name": "Barcelona", "un_locode": "ESBCN", "country": "Spain", "country_code": "ESP",
     "coordinates": [2.16, 41.34], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": False},
    {"name": "Piraeus", "un_locode": "GRPIR", "country": "Greece", "country_code": "GRC",
     "coordinates": [23.61, 37.94], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": False},
    {"name": "Genoa", "un_locode": "ITGOA", "country": "Italy", "country_code": "ITA",
     "coordinates": [8.88, 44.40], "region": "Europe", "psc_regime": PSCRegime.PARIS_MOU, "is_eca": False},

    # --- Africa ---
    {"name": "Tanger Med", "un_locode": "MAPTM", "country": "Morocco", "country_code": "MAR",
     "coordinates": [-5.50, 35.88], "region": "Africa", "psc_regime": PSCRegime.MEDITERRANEAN_MOU, "is_eca": False},
    {"name": "Cape Town", "un_locode": "ZACPT", "country": "South Africa", "country_code": "ZAF",
     "coordinates": [18.43, -33.91], "region": "Africa", "psc_regime": PSCRegime.INDIAN_OCEAN_MOU, "is_eca": False},
    {"name": "Durban", "un_locode": "ZADUR", "country": "South Africa", "country_code": "ZAF",
     "coordinates": [31.04, -29.87], "region": "Africa", "psc_regime": PSCRegime.INDIAN_OCEAN_MOU, "is_eca": False},
    {"name": "Port Said", "un_locode": "EGPSD", "country": "Egypt", "country_code": "EGY",
     "coordinates": [32.31, 31.27], "region": "Africa", "psc_regime": PSCRegime.MEDITERRANEAN_MOU, "is_eca": False},

    # --- Americas ---
    {"name": "Los Angeles", "un_locode": "USLAX", "country": "USA", "country_code": "USA",
     "coordinates": [-118.25, 33.73], "region": "Americas", "psc_regime": PSCRegime.USCG, "is_eca": True},
    {"name": "Long Beach", "un_locode": "USLGB", "country": "USA", "country_code": "USA",
     "coordinates": [-118.21, 33.75], "region": "Americas", "psc_regime": PSCRegime.USCG, "is_eca": True},
    {"name": "New York", "un_locode": "USNYC", "country": "USA", "country_code": "USA",
     "coordinates": [-74.05, 40.66], "region": "Americas", "psc_regime": PSCRegime.USCG, "is_eca": True},
    {"name": "Savannah", "un_locode": "USSAV", "country": "USA", "country_code": "USA",
     "coordinates": [-81.08, 32.09], "region": "Americas", "psc_regime": PSCRegime.USCG, "is_eca": True},
    {"name": "Vancouver", "un_locode": "CAVAN", "country": "Canada", "country_code": "CAN",
     "coordinates": [-123.11, 49.29], "region": "Americas", "psc_regime": PSCRegime.TOKYO_MOU, "is_eca": True},
    {"name": "Manzanillo", "un_locode": "MXZLO", "country": "Mexico", "country_code": "MEX",
     "coordinates": [-104.31, 19.06], "region": "Americas", "psc_regime": PSCRegime.VINA_DEL_MAR, "is_eca": False},
    {"name": "Santos", "un_locode": "BRSSZ", "country": "Brazil", "country_code": "BRA",
     "coordinates": [-46.31, -23.97], "region": "Americas", "psc_regime": PSCRegime.VINA_DEL_MAR, "is_eca": False},
    {"name": "Panama City", "un_locode": "PAPTB", "country": "Panama", "country_code": "PAN",
     "coordinates": [-79.56, 8.94], "region": "Americas", "psc_regime": PSCRegime.CARIBBEAN_MOU, "is_eca": False},
]


def seed_ports(db: Session):
    """Seed port data into database"""
    print(f"Seeding {len(PORTS_DATA)} ports...")

    for port_data in PORTS_DATA:
        # Check if port already exists
        existing = db.query(Port).filter(Port.un_locode == port_data["un_locode"]).first()
        if existing:
            print(f"  Port {port_data['un_locode']} already exists, skipping")
            continue

        port = Port(
            name=port_data["name"],
            un_locode=port_data["un_locode"],
            country=port_data["country"],
            country_code=port_data["country_code"],
            region=port_data["region"],
            longitude=port_data["coordinates"][0],
            latitude=port_data["coordinates"][1],
            psc_regime=port_data["psc_regime"],
            is_eca=port_data["is_eca"],
        )
        db.add(port)
        print(f"  Added port: {port_data['name']} ({port_data['un_locode']})")

    db.commit()
    print("Port seeding complete!")


def main():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_ports(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
