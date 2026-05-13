"""Tests for Brand Brain, Creator CRM, and Outreach Hub features"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_HEADERS = {"Authorization": "Bearer test_session_e2e_2025", "Content-Type": "application/json"}

# ---- Brand Brain ----

def test_brand_brain_get_profile():
    r = requests.get(f"{BASE_URL}/api/brand-brain/profile", headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    print("Brand brain profile:", data)

def test_brand_brain_save_profile():
    payload = {
        "company_name": "TEST_BrandCo",
        "industry": "Beauty & Skincare",
        "price_point": "mid",
        "brand_voice": "fun and energetic",
        "target_audience": "Gen Z women 18-25",
        "words_to_use": ["glow", "radiant"],
        "words_to_avoid": ["cheap", "basic"],
        "creator_no_gos": ["controversial creators"],
        "competitor_brands": ["RivalBrand"]
    }
    r = requests.post(f"{BASE_URL}/api/brand-brain/profile", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data.get("company_name") == "TEST_BrandCo"

def test_brand_brain_get_products():
    r = requests.get(f"{BASE_URL}/api/brand-brain/products", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_brand_brain_add_product():
    payload = {"name": "TEST_Product X", "description": "A test product", "price": 29.99, "category": "Skincare"}
    r = requests.post(f"{BASE_URL}/api/brand-brain/products", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data.get("name") == "TEST_Product X"

# ---- Creator CRM ----

def test_crm_import():
    r = requests.post(f"{BASE_URL}/api/crm/import", headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "imported" in data or "skipped" in data
    print("Import result:", data)

def test_crm_list_creators():
    r = requests.get(f"{BASE_URL}/api/crm/creators", headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"CRM creators count: {len(data)}")

def test_crm_update_creator_stage():
    # Get first creator
    r = requests.get(f"{BASE_URL}/api/crm/creators", headers=AUTH_HEADERS)
    assert r.status_code == 200
    creators = r.json()
    if not creators:
        pytest.skip("No creators found")
    crm_id = creators[0]["crm_id"]
    r2 = requests.patch(f"{BASE_URL}/api/crm/creators/{crm_id}", json={"stage": "Negotiating"}, headers=AUTH_HEADERS)
    assert r2.status_code == 200
    assert r2.json().get("stage") == "Negotiating"

def test_crm_add_note():
    r = requests.get(f"{BASE_URL}/api/crm/creators", headers=AUTH_HEADERS)
    creators = r.json()
    if not creators:
        pytest.skip("No creators found")
    crm_id = creators[0]["crm_id"]
    r2 = requests.post(f"{BASE_URL}/api/crm/creators/{crm_id}/notes", json={"content": "TEST_Note from pytest"}, headers=AUTH_HEADERS)
    assert r2.status_code == 200

# ---- Outreach Hub ----

def test_outreach_get_sequences():
    r = requests.get(f"{BASE_URL}/api/outreach-hub/sequences", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_outreach_create_sequence():
    payload = {
        "creator_name": "TEST_Creator",
        "sequence_type": "paid",
        "steps": [{"day": 1, "subject": "Hi", "message": "Hello!"}]
    }
    r = requests.post(f"{BASE_URL}/api/outreach-hub/sequences", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data.get("creator_name") == "TEST_Creator"

def test_outreach_negotiate():
    payload = {
        "creator_name": "Emma Reynolds",
        "creator_ask": "$5000 for 3 posts",
        "our_budget": "$3000",
        "deliverables": "3 Instagram posts",
        "campaign_context": "Beauty product launch"
    }
    r = requests.post(f"{BASE_URL}/api/outreach-hub/negotiate", json=payload, headers=AUTH_HEADERS, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert len(str(data)) > 10
    print("Negotiate response keys:", list(data.keys()))

def test_outreach_deal_terms():
    payload = {
        "creator_name": "Emma Reynolds",
        "campaign_name": "Summer Glow Campaign",
        "deliverables": ["3 Instagram posts", "1 Reel"],
        "timeline": "4 weeks",
        "payment_amount": 3000,
        "usage_rights": "90 days organic"
    }
    r = requests.post(f"{BASE_URL}/api/outreach-hub/deal-terms", json=payload, headers=AUTH_HEADERS, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert len(str(data)) > 10
    print("Deal terms response keys:", list(data.keys()))
