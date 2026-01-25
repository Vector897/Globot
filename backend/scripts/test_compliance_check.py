"""
Test script for Route Compliance Check
Run with: python scripts/test_compliance_check.py
"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Vessel, VesselType, UserDocument, DocumentType, Port, Customer
from services.compliance_service import ComplianceService, get_compliance_service
from services.maritime_knowledge_base import get_maritime_knowledge_base
from datetime import datetime, timedelta


def setup_test_data(db: Session):
    """Create test vessel and documents"""

    # Check if test customer exists
    customer = db.query(Customer).filter(Customer.name == "Test Shipping Co").first()
    if not customer:
        customer = Customer(
            name="Test Shipping Co",
            email="test@shipping.com",
            phone="123-456-7890"
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        print(f"Created test customer: {customer.name} (ID: {customer.id})")

    # Check if test vessel exists
    vessel = db.query(Vessel).filter(Vessel.imo_number == "9876543").first()
    if not vessel:
        vessel = Vessel(
            customer_id=customer.id,
            name="MV Test Explorer",
            imo_number="9876543",
            mmsi="123456789",
            call_sign="TXPL",
            vessel_type=VesselType.CONTAINER,
            flag_state="Panama",
            gross_tonnage=45000.0,
            deadweight_tonnage=52000.0,
            year_built=2018
        )
        db.add(vessel)
        db.commit()
        db.refresh(vessel)
        print(f"Created test vessel: {vessel.name} (ID: {vessel.id})")
    else:
        print(f"Using existing vessel: {vessel.name} (ID: {vessel.id})")

    # Add some test documents (simulating uploaded certificates)
    existing_docs = db.query(UserDocument).filter(UserDocument.vessel_id == vessel.id).count()

    if existing_docs == 0:
        # Add some documents - but intentionally leave gaps for testing
        test_documents = [
            {
                "document_type": DocumentType.SAFETY_CERTIFICATE,
                "original_filename": "solas_cert.pdf",
                "extracted_text": "SOLAS Safety Certificate for MV Test Explorer IMO 9876543",
                "expiry_date": datetime.now() + timedelta(days=365),  # Valid
                "is_verified": True
            },
            {
                "document_type": DocumentType.ISM_CERTIFICATE,
                "original_filename": "ism_cert.pdf",
                "extracted_text": "ISM Safety Management Certificate for MV Test Explorer",
                "expiry_date": datetime.now() + timedelta(days=180),  # Valid
                "is_verified": True
            },
            {
                "document_type": DocumentType.ISPS_CERTIFICATE,
                "original_filename": "isps_cert.pdf",
                "extracted_text": "ISPS International Ship Security Certificate",
                "expiry_date": datetime.now() + timedelta(days=30),  # Expiring soon!
                "is_verified": True
            },
            {
                "document_type": DocumentType.MARPOL_CERTIFICATE,
                "original_filename": "iopp_cert.pdf",
                "extracted_text": "International Oil Pollution Prevention Certificate",
                "expiry_date": datetime.now() - timedelta(days=10),  # EXPIRED!
                "is_verified": True
            },
        ]

        for doc_data in test_documents:
            doc = UserDocument(
                vessel_id=vessel.id,
                file_path=f"/test/path/{doc_data['original_filename']}",
                **doc_data
            )
            db.add(doc)

        db.commit()
        print(f"Created {len(test_documents)} test documents for vessel")
        print("  - SOLAS Certificate: Valid (expires in 365 days)")
        print("  - ISM Certificate: Valid (expires in 180 days)")
        print("  - ISPS Certificate: EXPIRING SOON (30 days)")
        print("  - MARPOL Certificate: EXPIRED (10 days ago)")
        print("  - Missing: Load Line, Crew Certificates, Registry, etc.")
    else:
        print(f"Vessel already has {existing_docs} documents")

    return vessel


async def test_knowledge_base_search():
    """Test the maritime knowledge base search"""
    print("\n" + "="*70)
    print("TEST 1: Maritime Knowledge Base Search")
    print("="*70)

    kb = get_maritime_knowledge_base()

    # Check if running in mock mode
    if kb.mock_mode:
        print("\n⚠️  Knowledge Base is running in MOCK MODE")
        print("   (langchain/chromadb dependencies may not be installed)")

    # Get collection stats
    stats = kb.get_collection_stats()
    print(f"\nCollection Statistics:")
    for name, count in stats.items():
        print(f"  - {name}: {count} documents")

    # Test search
    print("\nSearching for 'SOLAS fire safety requirements'...")
    results = kb.search_general("SOLAS fire safety requirements", top_k=3)

    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"\n  Result {i}:")
        print(f"    Source: {result.source}")
        print(f"    Score: {result.score:.3f}")
        print(f"    Content: {result.content[:150]}...")
        if result.metadata:
            print(f"    Metadata: {result.metadata}")


async def test_port_requirements():
    """Test port-specific requirement search"""
    print("\n" + "="*70)
    print("TEST 2: Port Requirements Search")
    print("="*70)

    kb = get_maritime_knowledge_base()

    # Search for Rotterdam (ECA zone, Paris MOU)
    print("\nSearching requirements for Rotterdam (NLRTM)...")
    results = kb.search_by_port("NLRTM", vessel_type="container", top_k=5)

    print(f"\nFound {len(results)} regulations for Rotterdam:")
    for i, result in enumerate(results, 1):
        print(f"\n  {i}. [{result.source}] (score: {result.score:.2f})")
        print(f"     {result.content[:200]}...")


async def test_required_documents():
    """Test required documents lookup"""
    print("\n" + "="*70)
    print("TEST 3: Required Documents for Port Call")
    print("="*70)

    kb = get_maritime_knowledge_base()

    print("\nGetting required documents for container vessel at Singapore (SGSIN)...")
    docs = kb.search_required_documents("SGSIN", "container")

    print(f"\nRequired Documents ({len(docs)} total):")
    for doc in docs:
        print(f"  - {doc['document_type']}")
        print(f"    Source: {doc['regulation_source']}")
        print(f"    Description: {doc['description'][:80]}...")
        print()


async def test_route_compliance(db: Session, vessel: Vessel):
    """Test full route compliance check"""
    print("\n" + "="*70)
    print("TEST 4: Route Compliance Check")
    print("="*70)

    compliance_service = get_compliance_service()

    # Define test route: Singapore -> Rotterdam -> Hamburg
    route = ["SGSIN", "NLRTM", "DEHAM"]

    print(f"\nVessel: {vessel.name} (IMO: {vessel.imo_number})")
    print(f"Type: {vessel.vessel_type.value}")
    print(f"Flag: {vessel.flag_state}")
    print(f"Route: {' -> '.join(route)}")

    # Get vessel documents
    documents = db.query(UserDocument).filter(UserDocument.vessel_id == vessel.id).all()
    print(f"\nVessel has {len(documents)} documents on file:")
    for doc in documents:
        status = "✅ Valid" if doc.expiry_date and doc.expiry_date > datetime.now() else "❌ Expired"
        days_left = (doc.expiry_date - datetime.now()).days if doc.expiry_date else "N/A"
        print(f"  - {doc.document_type.value}: {status} ({days_left} days)")

    # Run compliance check (non-AI mode for faster testing)
    print("\n" + "-"*50)
    print("Running compliance check...")
    print("-"*50)

    vessel_info = {
        "id": vessel.id,
        "name": vessel.name,
        "imo_number": vessel.imo_number,
        "vessel_type": vessel.vessel_type.value,
        "flag_state": vessel.flag_state,
        "gross_tonnage": vessel.gross_tonnage
    }

    result = await compliance_service.check_route_compliance(
        vessel_info=vessel_info,
        port_codes=route,
        documents=documents,
        db=db
    )

    # Display results
    print(f"\n{'='*50}")
    print(f"COMPLIANCE RESULT: {result.overall_status.upper()}")
    print(f"{'='*50}")

    for port_result in result.port_results:
        port_status_icon = "✅" if port_result.status == "compliant" else "❌"
        print(f"\n{port_status_icon} Port: {port_result.port_code} ({port_result.port_name})")
        print(f"   Status: {port_result.status}")
        print(f"   PSC Regime: {port_result.psc_regime or 'Unknown'}")
        print(f"   Is ECA Zone: {'Yes' if port_result.is_eca else 'No'}")

        if port_result.missing_documents:
            print(f"   ❌ Missing Documents ({len(port_result.missing_documents)}):")
            for doc in port_result.missing_documents[:5]:  # Show first 5
                print(f"      - {doc}")

        if port_result.expiring_documents:
            print(f"   ⚠️  Expiring Documents ({len(port_result.expiring_documents)}):")
            for doc in port_result.expiring_documents:
                print(f"      - {doc}")

        if port_result.expired_documents:
            print(f"   🚫 Expired Documents ({len(port_result.expired_documents)}):")
            for doc in port_result.expired_documents:
                print(f"      - {doc}")

    # Print narrative report
    if result.narrative_report:
        print(f"\n{'='*50}")
        print("NARRATIVE REPORT")
        print(f"{'='*50}")
        print(result.narrative_report)

    return result


async def main():
    """Main test runner"""
    print("\n" + "="*70)
    print("MARITIME COMPLIANCE SYSTEM - TEST SUITE")
    print("="*70)

    # Create tables if needed
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Setup test data
        print("\nSetting up test data...")
        vessel = setup_test_data(db)

        # Run tests
        await test_knowledge_base_search()
        await test_port_requirements()
        await test_required_documents()
        await test_route_compliance(db, vessel)

        print("\n" + "="*70)
        print("ALL TESTS COMPLETED")
        print("="*70)

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
