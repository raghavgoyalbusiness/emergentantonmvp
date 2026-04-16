"""Backend API tests for Influencer Connect platform"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://brand-brief-1.preview.emergentagent.com').rstrip('/')
TOKEN = "test_session_e2e_2025"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
TEST_CAMPAIGN_ID = "campaign_4f65982f244d"


class TestAuth:
    """Auth endpoint tests"""

    def test_auth_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "user_id" in data
        assert data["user_id"] == "test-user-e2e"

    def test_auth_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


class TestDashboard:
    """Dashboard stats endpoint"""

    def test_get_dashboard_stats(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "total_campaigns" in data
        assert "total_spend" in data
        assert "campaign_health_score" in data
        assert isinstance(data["total_campaigns"], int)


class TestInfluencers:
    """Influencer endpoints"""

    def test_get_influencers(self):
        r = requests.get(f"{BASE_URL}/api/influencers", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 20
        # Validate first influencer fields
        inf = data[0]
        assert "name" in inf
        assert "handle" in inf
        assert "platform" in inf
        assert "followers" in inf

    def test_get_influencers_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/influencers")
        assert r.status_code == 401


class TestCampaigns:
    """Campaign CRUD tests"""

    def test_list_campaigns(self):
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_campaign_by_id(self):
        r = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}", headers=HEADERS)
        assert r.status_code in [200, 404]  # May not exist in all envs
        if r.status_code == 200:
            data = r.json()
            assert "campaign_id" in data

    def test_create_campaign(self):
        payload = {
            "name": "TEST_Campaign_e2e",
            "brand_name": "Test Brand",
            "product_type": "Skincare",
            "target_audience": "Women 25-35",
            "campaign_goal": "Brand Awareness",
            "budget_min": 5000,
            "budget_max": 20000,
            "platforms": ["Instagram", "TikTok"],
            "brand_tone": "authentic"
        }
        r = requests.post(f"{BASE_URL}/api/campaigns", headers=HEADERS, json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "campaign_id" in data
        assert data["name"] == "TEST_Campaign_e2e"
        assert data["stage"] == "Brief"
        # Store for stage update test
        TestCampaigns._created_id = data["campaign_id"]

    def test_update_campaign_stage(self):
        # First get a valid campaign
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=HEADERS)
        campaigns = r.json()
        assert len(campaigns) > 0
        cid = campaigns[0]["campaign_id"]

        r2 = requests.patch(f"{BASE_URL}/api/campaigns/{cid}/stage", headers=HEADERS, json={"stage": "Outreach"})
        assert r2.status_code == 200

        # Verify it was saved
        r3 = requests.get(f"{BASE_URL}/api/campaigns/{cid}", headers=HEADERS)
        assert r3.json()["stage"] == "Outreach"

        # Restore
        requests.patch(f"{BASE_URL}/api/campaigns/{cid}/stage", headers=HEADERS, json={"stage": "Brief"})

    def test_update_campaign_invalid_stage(self):
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=HEADERS)
        cid = r.json()[0]["campaign_id"]
        r2 = requests.patch(f"{BASE_URL}/api/campaigns/{cid}/stage", headers=HEADERS, json={"stage": "InvalidStage"})
        assert r2.status_code == 400


class TestInbox:
    """Inbox/messages endpoints"""

    def test_list_messages(self):
        r = requests.get(f"{BASE_URL}/api/messages", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


class TestAnalytics:
    """Analytics endpoints"""

    def test_get_analytics(self):
        r = requests.get(f"{BASE_URL}/api/analytics", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)


class TestPayments:
    """Payments endpoints"""

    def test_list_payment_transactions(self):
        r = requests.get(f"{BASE_URL}/api/payments", headers=HEADERS)
        assert r.status_code == 200
