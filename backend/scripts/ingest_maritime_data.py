"""
Maritime regulation data ingestion pipeline.
Ingests maritime laws, conventions, and port requirements into the knowledge base.

Usage:
    python scripts/ingest_maritime_data.py --source imo
    python scripts/ingest_maritime_data.py --source psc
    python scripts/ingest_maritime_data.py --source all
"""
import sys
import os
import json
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from services.maritime_knowledge_base import get_maritime_knowledge_base

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

settings = get_settings()

# Try to import LangChain Document
try:
    from langchain_core.documents import Document
except ImportError:
    class Document:
        def __init__(self, page_content: str, metadata: Dict = None):
            self.page_content = page_content
            self.metadata = metadata or {}


# ========== Sample Maritime Regulation Data ==========
# This is seed data - in production, you would source this from official IMO documents

IMO_CONVENTIONS_DATA = [
    # SOLAS - Safety of Life at Sea
    {
        "title": "SOLAS Chapter II-1: Construction - Subdivision and Stability",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS",
        "chapter": "II-1",
        "summary": "Requirements for ship subdivision and stability to ensure ship survives flooding and maintains stability in damaged conditions.",
        "required_documents": ["safety_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro"],
        "min_gross_tonnage": 500,
    },
    {
        "title": "SOLAS Chapter II-2: Fire Protection, Detection and Extinction",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS",
        "chapter": "II-2",
        "summary": "Comprehensive requirements for fire safety including structural fire protection, fire detection systems, fire-fighting equipment, and escape routes.",
        "required_documents": ["safety_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 500,
    },
    {
        "title": "SOLAS Chapter III: Life-Saving Appliances and Arrangements",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS",
        "chapter": "III",
        "summary": "Requirements for lifeboats, liferafts, rescue boats, lifejackets, and other life-saving equipment. Includes specifications for survival craft capacity and launching systems.",
        "required_documents": ["safety_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 500,
    },
    {
        "title": "SOLAS Chapter V: Safety of Navigation",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS",
        "chapter": "V",
        "summary": "Navigation safety requirements including voyage planning, AIS, ECDIS, radar, and voyage data recorders. Applies to all ships on international voyages.",
        "required_documents": ["safety_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier", "general_cargo"],
        "min_gross_tonnage": 300,
    },
    {
        "title": "SOLAS Chapter IX: Management for the Safe Operation of Ships (ISM Code)",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS/ISM",
        "chapter": "IX",
        "summary": "International Safety Management (ISM) Code requirements for a safety management system. Ships must have a Safety Management Certificate (SMC) and company must have Document of Compliance (DOC).",
        "required_documents": ["ism_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 500,
    },
    {
        "title": "SOLAS Chapter XI-2: Special Measures to Enhance Maritime Security (ISPS Code)",
        "regulation_type": "imo_convention",
        "source_convention": "SOLAS/ISPS",
        "chapter": "XI-2",
        "summary": "International Ship and Port Facility Security (ISPS) Code requirements. Ships must have International Ship Security Certificate (ISSC), Ship Security Plan, and designated Ship Security Officer.",
        "required_documents": ["isps_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 500,
    },

    # MARPOL - Marine Pollution
    {
        "title": "MARPOL Annex I: Prevention of Pollution by Oil",
        "regulation_type": "imo_convention",
        "source_convention": "MARPOL",
        "chapter": "Annex I",
        "summary": "Prevention of oil pollution including requirements for oil tankers, oily water separators, oil discharge monitoring, and IOPP Certificate.",
        "required_documents": ["marpol_certificate"],
        "applicable_vessel_types": ["tanker", "container", "bulk_carrier", "general_cargo"],
        "min_gross_tonnage": 400,
    },
    {
        "title": "MARPOL Annex II: Control of Pollution by Noxious Liquid Substances",
        "regulation_type": "imo_convention",
        "source_convention": "MARPOL",
        "chapter": "Annex II",
        "summary": "Requirements for chemical tankers carrying noxious liquid substances in bulk. Ships require NLS Certificate.",
        "required_documents": ["marpol_certificate"],
        "applicable_vessel_types": ["tanker"],
        "min_gross_tonnage": 150,
    },
    {
        "title": "MARPOL Annex IV: Prevention of Pollution by Sewage",
        "regulation_type": "imo_convention",
        "source_convention": "MARPOL",
        "chapter": "Annex IV",
        "summary": "Requirements for sewage treatment plants or holding tanks. Discharge restrictions near coastlines.",
        "required_documents": ["marpol_certificate"],
        "applicable_vessel_types": ["passenger", "container", "tanker", "bulk_carrier"],
        "min_gross_tonnage": 400,
    },
    {
        "title": "MARPOL Annex V: Prevention of Pollution by Garbage",
        "regulation_type": "imo_convention",
        "source_convention": "MARPOL",
        "chapter": "Annex V",
        "summary": "Regulations for disposal of garbage from ships. Complete ban on plastic disposal. Garbage Management Plan and Garbage Record Book required.",
        "required_documents": ["marpol_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier", "general_cargo"],
        "min_gross_tonnage": 100,
    },
    {
        "title": "MARPOL Annex VI: Prevention of Air Pollution from Ships",
        "regulation_type": "imo_convention",
        "source_convention": "MARPOL",
        "chapter": "Annex VI",
        "summary": "Regulations for SOx, NOx emissions and fuel quality. Global sulphur cap of 0.5% (0.1% in ECAs). Ships require IAPP Certificate.",
        "required_documents": ["marpol_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier", "general_cargo"],
        "min_gross_tonnage": 400,
    },

    # STCW - Crew Training
    {
        "title": "STCW Convention: Standards of Training, Certification and Watchkeeping",
        "regulation_type": "imo_convention",
        "source_convention": "STCW",
        "chapter": "All",
        "summary": "Requirements for seafarer training, certification, and watchkeeping. All crew must have valid STCW certificates of competency appropriate to their rank and duties.",
        "required_documents": ["crew_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier", "general_cargo"],
        "min_gross_tonnage": 200,
    },

    # Load Line Convention
    {
        "title": "International Convention on Load Lines",
        "regulation_type": "imo_convention",
        "source_convention": "Load Line",
        "chapter": "1966/1988",
        "summary": "Requirements for load line marks and freeboard calculations ensuring ships are not overloaded. International Load Line Certificate required.",
        "required_documents": ["load_line_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "general_cargo", "ro_ro"],
        "min_gross_tonnage": 150,
    },

    # Tonnage Convention
    {
        "title": "International Convention on Tonnage Measurement",
        "regulation_type": "imo_convention",
        "source_convention": "Tonnage 1969",
        "chapter": "1969",
        "summary": "Universal tonnage measurement system. International Tonnage Certificate (ITC 69) required for all international voyages.",
        "required_documents": ["tonnage_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "passenger", "ro_ro", "lng_carrier", "general_cargo"],
        "min_gross_tonnage": 24,
    },

    # BWM Convention
    {
        "title": "Ballast Water Management Convention",
        "regulation_type": "imo_convention",
        "source_convention": "BWM",
        "chapter": "2004/2017",
        "summary": "Requirements for ballast water treatment to prevent transfer of invasive species. Ships must have Ballast Water Management Plan and Certificate.",
        "required_documents": ["ballast_water_certificate"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "general_cargo"],
        "min_gross_tonnage": 400,
    },
]

PSC_REQUIREMENTS_DATA = [
    {
        "title": "Paris MOU Port State Control Inspection Priorities",
        "regulation_type": "port_state_control",
        "source_convention": "Paris MOU",
        "region": "Europe",
        "summary": "Focus areas for Paris MOU PSC inspections include: working and living conditions (MLC), fire safety, life-saving appliances, navigation, pollution prevention, ISM/ISPS compliance. Ships from low-performing flags face increased inspections.",
        "applicable_regions": ["Europe"],
    },
    {
        "title": "Tokyo MOU Port State Control Inspection Priorities",
        "regulation_type": "port_state_control",
        "source_convention": "Tokyo MOU",
        "region": "Asia",
        "summary": "Tokyo MOU inspection priorities include structural safety, fire safety, life-saving equipment, navigation, MARPOL compliance, ISM/ISPS, and crew certification. Concentrated Inspection Campaigns (CICs) focus on specific areas annually.",
        "applicable_regions": ["Asia"],
    },
    {
        "title": "US Coast Guard Port State Control Requirements",
        "regulation_type": "port_state_control",
        "source_convention": "USCG",
        "region": "Americas",
        "summary": "USCG PSC includes examination of vessel documentation, hull structure, machinery, navigation equipment, life-saving, fire-fighting, pollution prevention, and crew certifications. 96-hour advance notice required.",
        "applicable_regions": ["Americas"],
        "required_documents": ["safety_certificate", "load_line_certificate", "marpol_certificate", "ism_certificate", "isps_certificate"],
    },
]

REGIONAL_REQUIREMENTS_DATA = [
    {
        "title": "EU MRV Regulation - Monitoring, Reporting and Verification of CO2 Emissions",
        "regulation_type": "regional",
        "source_convention": "EU MRV",
        "region": "Europe",
        "summary": "Ships over 5000 GT calling at EU/EEA ports must monitor and report CO2 emissions. Annual emissions report required. Document of Compliance issued by accredited verifier.",
        "applicable_regions": ["Europe"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 5000,
    },
    {
        "title": "EU ETS - Emission Trading System for Maritime",
        "regulation_type": "regional",
        "source_convention": "EU ETS",
        "region": "Europe",
        "summary": "From 2024, maritime transport included in EU ETS. Ships must surrender allowances for CO2 emissions from voyages to/from EU ports. Phase-in from 40% (2024) to 100% (2026).",
        "applicable_regions": ["Europe"],
        "applicable_vessel_types": ["container", "tanker", "bulk_carrier", "ro_ro", "lng_carrier"],
        "min_gross_tonnage": 5000,
    },
    {
        "title": "North Sea/Baltic Sea ECA - SOx Emission Control Area",
        "regulation_type": "environmental",
        "source_convention": "MARPOL Annex VI",
        "region": "Europe",
        "summary": "Ships operating in North Sea and Baltic Sea ECAs must use fuel with max 0.1% sulphur content or use approved exhaust gas cleaning systems (scrubbers).",
        "applicable_regions": ["Europe"],
        "is_eca": True,
    },
    {
        "title": "North American ECA - Emission Control Area",
        "regulation_type": "environmental",
        "source_convention": "MARPOL Annex VI",
        "region": "Americas",
        "summary": "Ships operating within 200 nautical miles of US and Canadian coastlines must use fuel with max 0.1% sulphur content. NOx Tier III standards apply to ships built after 2016.",
        "applicable_regions": ["Americas"],
        "is_eca": True,
    },
    {
        "title": "China Domestic Emission Control Areas",
        "regulation_type": "environmental",
        "source_convention": "China MSA",
        "region": "Asia",
        "summary": "China DECAs cover Pearl River Delta, Yangtze River Delta, and Bohai Rim. Ships at berth must use fuel with max 0.5% sulphur (0.1% in some ports).",
        "applicable_regions": ["Asia"],
        "is_eca": True,
    },
]


def create_documents_from_data(data_list: List[Dict], collection_name: str) -> List[Document]:
    """Convert regulation data to LangChain Documents"""
    documents = []

    for item in data_list:
        # Build full content
        content_parts = [
            f"Title: {item['title']}",
            f"Source: {item.get('source_convention', 'Unknown')}",
        ]

        if item.get('chapter'):
            content_parts.append(f"Chapter: {item['chapter']}")

        content_parts.append(f"\nSummary:\n{item.get('summary', '')}")

        if item.get('required_documents'):
            content_parts.append(f"\nRequired Documents: {', '.join(item['required_documents'])}")

        if item.get('applicable_vessel_types'):
            content_parts.append(f"Applicable Vessel Types: {', '.join(item['applicable_vessel_types'])}")

        if item.get('min_gross_tonnage'):
            content_parts.append(f"Minimum Gross Tonnage: {item['min_gross_tonnage']} GT")

        content = "\n".join(content_parts)

        # Build metadata
        metadata = {
            "title": item["title"],
            "regulation_type": item.get("regulation_type", ""),
            "source_convention": item.get("source_convention", ""),
            "chapter": item.get("chapter", ""),
            "collection": collection_name,
        }

        if item.get("required_documents"):
            metadata["required_documents"] = json.dumps(item["required_documents"])

        if item.get("applicable_vessel_types"):
            metadata["applicable_vessel_types"] = json.dumps(item["applicable_vessel_types"])

        if item.get("applicable_regions"):
            metadata["applicable_regions"] = json.dumps(item["applicable_regions"])

        if item.get("min_gross_tonnage"):
            metadata["min_gross_tonnage"] = item["min_gross_tonnage"]

        documents.append(Document(page_content=content, metadata=metadata))

    return documents


class MaritimeDataIngester:
    """Ingest maritime regulation data into ChromaDB"""

    def __init__(self):
        self.kb = get_maritime_knowledge_base()

    def ingest_imo_conventions(self):
        """Ingest IMO convention data"""
        logger.info("Ingesting IMO conventions...")

        documents = create_documents_from_data(IMO_CONVENTIONS_DATA, "imo_conventions")

        if self.kb.mock_mode:
            logger.warning("Knowledge base in mock mode - documents not stored")
            return len(documents)

        count = self.kb.add_documents("imo_conventions", documents)
        logger.info(f"Ingested {count} IMO convention documents")
        return count

    def ingest_psc_requirements(self):
        """Ingest Port State Control requirements"""
        logger.info("Ingesting PSC requirements...")

        documents = create_documents_from_data(PSC_REQUIREMENTS_DATA, "psc_requirements")

        if self.kb.mock_mode:
            logger.warning("Knowledge base in mock mode - documents not stored")
            return len(documents)

        count = self.kb.add_documents("psc_requirements", documents)
        logger.info(f"Ingested {count} PSC requirement documents")
        return count

    def ingest_regional_requirements(self):
        """Ingest regional requirements"""
        logger.info("Ingesting regional requirements...")

        documents = create_documents_from_data(REGIONAL_REQUIREMENTS_DATA, "regional_requirements")

        if self.kb.mock_mode:
            logger.warning("Knowledge base in mock mode - documents not stored")
            return len(documents)

        count = self.kb.add_documents("regional_requirements", documents)
        logger.info(f"Ingested {count} regional requirement documents")
        return count

    def ingest_from_json_file(self, json_path: str, collection_name: str):
        """Ingest regulation data from a JSON file"""
        logger.info(f"Ingesting from {json_path}...")

        with open(json_path, 'r') as f:
            data = json.load(f)

        if isinstance(data, dict) and "regulations" in data:
            data = data["regulations"]

        documents = create_documents_from_data(data, collection_name)

        if self.kb.mock_mode:
            logger.warning("Knowledge base in mock mode - documents not stored")
            return len(documents)

        count = self.kb.add_documents(collection_name, documents)
        logger.info(f"Ingested {count} documents from {json_path}")
        return count

    def ingest_all(self):
        """Ingest all data sources"""
        total = 0
        total += self.ingest_imo_conventions()
        total += self.ingest_psc_requirements()
        total += self.ingest_regional_requirements()

        # Check for additional JSON files in data directory
        data_dir = Path(settings.maritime_regulations_dir)
        if data_dir.exists():
            for json_file in data_dir.glob("**/*.json"):
                try:
                    collection = json_file.stem  # Use filename as collection hint
                    total += self.ingest_from_json_file(str(json_file), collection)
                except Exception as e:
                    logger.error(f"Error ingesting {json_file}: {e}")

        return total


def main():
    parser = argparse.ArgumentParser(description="Ingest maritime regulation data")
    parser.add_argument(
        "--source",
        choices=["imo", "psc", "regional", "all"],
        default="all",
        help="Data source to ingest"
    )
    parser.add_argument(
        "--json-file",
        type=str,
        help="Path to JSON file to ingest"
    )
    parser.add_argument(
        "--collection",
        type=str,
        default="imo_conventions",
        help="Collection name for JSON file ingestion"
    )

    args = parser.parse_args()

    ingester = MaritimeDataIngester()

    if args.json_file:
        count = ingester.ingest_from_json_file(args.json_file, args.collection)
    elif args.source == "imo":
        count = ingester.ingest_imo_conventions()
    elif args.source == "psc":
        count = ingester.ingest_psc_requirements()
    elif args.source == "regional":
        count = ingester.ingest_regional_requirements()
    else:  # all
        count = ingester.ingest_all()

    logger.info(f"Total documents ingested: {count}")

    # Print stats
    stats = ingester.kb.get_collection_stats()
    logger.info("Knowledge base stats:")
    for collection, doc_count in stats.items():
        logger.info(f"  {collection}: {doc_count} documents")


if __name__ == "__main__":
    main()
