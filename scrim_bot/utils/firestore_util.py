import asyncio
from datetime import datetime
from kloak.util import logger

from scrim_bot.utils.enums import GCP_PROJECT_ID
from scrim_bot.utils.singleton import Singleton

from google.cloud import firestore
from google.cloud.firestore_v1.collection import CollectionReference
from google.cloud.firestore_v1.document import DocumentReference
from google.cloud.firestore_v1.field_path import FieldPath
from google.cloud.firestore_v1.base_document import DocumentSnapshot

class FirestoreClient(metaclass=Singleton):
    def __init__(self, gcp_project: str=GCP_PROJECT_ID):
        self.db = firestore.Client(project=gcp_project)

    def get_document_ref(self, collection_name: str, doc_id: str) -> DocumentReference:
        """Returns a DocumentReference for a specific document."""
        return self.db.collection(collection_name).document(doc_id)

    async def add_document(self, collection_name: str, data: dict, doc_id: str = None) -> DocumentReference:
        """
        Asynchronously adds a new document or sets an existing one.
        If doc_id is provided, it uses set with merge=True for upsert behavior.
        Otherwise, Firestore generates an ID.
        """
        current_time = datetime.now()
        data_with_timestamps = {
            **data,
            "created_at": data.get("created_at", current_time),
            "last_updated_at": current_time,
        }

        if doc_id:
            doc_ref = self.db.collection(collection_name).document(doc_id)
            doc_ref.set(data_with_timestamps, merge=True)
            return doc_ref
        else:
            # .add() returns a tuple (update_time, DocumentReference)
            _, doc_ref = self.db.collection(collection_name).add(data_with_timestamps)
            logger.debug(f"Successfully added document {doc_ref.id} to collection {collection_name}")
            return doc_ref
        

    async def get_document(self, collection_name: str, doc_id: str) -> dict | None:
        """Asynchronously retrieves a document by its ID."""
        doc_ref = self.db.collection(collection_name).document(doc_id)
        doc: DocumentSnapshot = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None

    async def update_document(self, collection_name: str, doc_id: str, data: dict):
        """Asynchronously updates fields in an existing document."""
        doc_ref = self.db.collection(collection_name).document(doc_id)
        data["last_updated_at"] = datetime.now()
        doc_ref.update(data)
        return doc_ref

    async def delete_document(self, collection_name: str, doc_id: str):
        """Asynchronously deletes a document."""
        doc_ref = self.db.collection(collection_name).document(doc_id)
        doc_ref.delete()

    async def query_collection(self, collection_name: str, field: str, op: str, value: any, limit: int = None) -> list[dict]:
        """Asynchronously queries a collection."""
        query = self.db.collection(collection_name).where(FieldPath(field), op, value)
        if limit:
            query = query.limit(limit)
        results = query.get()
        return [doc.to_dict() for doc in results]

    async def get_by_normalized_name(self, collection_name: str, name: str) -> dict | None:
        """
        Helper to find a document by a normalized name field.
        Assumes a 'normalized_name' field exists in documents.
        """
        normalized_name = self._normalize_name(name)
        results = await self.query_collection(collection_name, 'normalized_name', '==', normalized_name, limit=1)
        return results[0] if results else None

    @staticmethod
    def _normalize_name(name: str) -> str:
        """Normalizes a company name for use as a Firestore document ID or lookup field."""
        return name.lower().strip().replace(" ", "-").replace(".", "").replace(",", "").replace("/", "-")
        

async def create_discovery_request(
    initial_prompt: str,
    material: str,
    location: str,
    user_id: str | None = None,
) -> DocumentReference:
    """Creates a new discovery request document in Firestore."""
    firecli = FirestoreClient()
    request_data = {
        "initial_prompt": initial_prompt,
        "material_requested": material,
        "target_location": location,
        "status": "initiated",
        "discovery_summary": "",
        "final_vendor_ids": [],
        "user_id": user_id,
        "total_companies_considered": 0,
        "successful_companies_detailed": 0,
    }
    doc_ref = await firecli.add_document("discovery_requests", request_data)
    return doc_ref


async def update_discovery_request(request_id: str, updates: dict) -> None:
    """Updates a discovery request document."""
    firecli = FirestoreClient()
    await firecli.update_document("discovery_requests", request_id, updates)


async def get_or_create_vendor(
        name: str,
        website_url: str | None = None,
        primary_offering: str | None = None,
        location_or_service_area: str | None = None,
        discovered_in_request_id: str | None = None,
) -> DocumentReference:
    """
    Retrieves a vendor by its normalized name or creates a new one if it doesn't exist.
    Returns the DocumentReference of the vendor.
    """
    firecli = FirestoreClient()
    normalized_name = firecli._normalize_name(name)
    existing_vendor_doc = await firecli.get_document("vendors", normalized_name)

    if existing_vendor_doc:
        # Vendor exists, update if necessary
        updates = {"last_updated_at": datetime.now()}
        if website_url and not existing_vendor_doc.get("website_url"):
            updates["website_url"] = website_url
        if primary_offering and not existing_vendor_doc.get("primary_offering"):
            updates["primary_offering"] = primary_offering
        if location_or_service_area and not existing_vendor_doc.get("location_or_service_area"):
            updates["location_or_service_area"] = location_or_service_area

        if updates:  # Only update if there's something new
            await firecli.update_document("vendors", normalized_name, updates)
        return firecli.get_document_ref("vendors", normalized_name)
    else:
        # Vendor does not exist, create a new one
        vendor_data = {
            "name": name,
            "normalized_name": normalized_name,  # Store for easier querying later
            "website_url": website_url,
            "primary_offering": primary_offering,
            "location_or_service_area": location_or_service_area,
            "vetting_status": "not_vetted",
            "last_vetting_report_id": None,
            "discovered_in_requests": discovered_in_request_id,
        }
        doc_ref = await firecli.add_document("vendors", vendor_data, doc_id=normalized_name)
        return doc_ref


async def update_vendor(vendor_id: str, updates: dict):
    """Updates a vendor document."""
    firecli = FirestoreClient()
    await firecli.update_document("vendors", vendor_id, updates)


async def create_vetting_report(
        vendor_id: str,
        report_type: str,
        report_content: str,
        citations: list[str],
        risk_score: float | None = None,
        course_of_action: str | None = None,
        generated_by_agent: str | None = None,
        associated_discovery_request_id: str | None = None,
) -> DocumentReference:
    """Creates a new vetting report document in Firestore."""
    firecli = FirestoreClient()
    report_data = {
        "vendor_id": vendor_id,
        "report_type": report_type,
        "report_content": report_content,
        "citations": citations,
        "risk_score": risk_score,
        "course_of_action": course_of_action,
        "generated_by_agent": generated_by_agent,
        "associated_discovery_request_id": associated_discovery_request_id,
    }
    doc_ref = await firecli.add_document("vetting_reports", report_data)
    return doc_ref
