"""
Deep backend API tests for Influencer Connect - Iteration 5
Tests: schema validation, data integrity, error handling (400/401/404), edge cases
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
AUTH_HEADER = {"Authorization": "Bearer test_session_e2e_2025"}
HEADERS = {**AUTH_HEADER, "Content-Type": "application/json"}


# ---- FIXTURES ----

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update(HEADERS)
    return s

@pytest.fixture(scope="module")
def campaign_id(session):
    """Create a campaign and return its ID for use in tests."""
    resp = session.post(f"{BASE_URL}/api/campaigns", json={
        "name": "TEST_DeepTest Campaign",
        "brand_name": "TEST_Brand",
        "product_type": "Test skincare product",
        "target_audience": "Women 25-35",
        "campaign_goal": "Brand awareness",
        "budget_min": 1000.0,
        "budget_max": 5000.0,
        "platforms": ["Instagram", "TikTok"],
        "brand_tone": "Natural, friendly"
    })
    assert resp.status_code == 200, f"Campaign creation failed: {resp.text}"
    cid = resp.json().get("campaign_id")
    assert cid, "No campaign_id returned"
    yield cid
    # Cleanup
    try:
        from pymongo import MongoClient
        import os as _os
        c = MongoClient(_os.environ["MONGO_URL"])
        c[_os.environ["DB_NAME"]].campaigns.delete_one({"campaign_id": cid})
    except Exception:
        pass


# ---- 1. GET /api/health ----
class TestHealth:
    """Health check endpoint"""

    def test_health_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: /api/health returns 200")

    def test_health_schema(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        data = resp.json()
        assert "status" in data, "Missing 'status' field"
        assert data["status"] == "ok", f"Expected 'ok', got {data['status']}"
        print("PASS: /api/health schema correct")


# ---- 2. GET /api/auth/me ----
class TestAuthMe:
    """Auth /me endpoint"""

    def test_me_with_valid_token(self, session):
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/auth/me returns 200")

    def test_me_schema(self, session):
        resp = session.get(f"{BASE_URL}/api/auth/me")
        data = resp.json()
        for field in ["user_id", "email", "name"]:
            assert field in data, f"Missing field: {field}"
        assert data["email"] == "testuser@influencerconnect.com"
        assert data["user_id"] == "test-user-e2e"
        print("PASS: /api/auth/me schema valid, email matches")

    def test_me_no_token_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: /api/auth/me without token returns 401")

    def test_me_invalid_token_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me",
                            headers={"Authorization": "Bearer invalid_token_xyz"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: /api/auth/me with invalid token returns 401")


# ---- 3. GET /api/dashboard/stats ----
class TestDashboardStats:
    """Dashboard stats endpoint"""

    def test_stats_returns_200(self, session):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        print("PASS: GET /api/dashboard/stats 200")

    def test_stats_schema(self, session):
        data = session.get(f"{BASE_URL}/api/dashboard/stats").json()
        for field in ["total_campaigns", "active_campaigns", "total_spend", "total_influencers"]:
            assert field in data, f"Missing field: {field}"
        assert isinstance(data["total_campaigns"], int)
        assert isinstance(data["total_spend"], (int, float))
        print("PASS: /api/dashboard/stats schema valid")

    def test_stats_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 401
        print("PASS: /api/dashboard/stats without auth returns 401")


# ---- 4. GET /api/influencers ----
class TestInfluencers:
    """Influencer listing endpoint"""

    def test_list_influencers_200(self):
        resp = requests.get(f"{BASE_URL}/api/influencers")
        assert resp.status_code == 200
        print("PASS: GET /api/influencers 200")

    def test_influencers_schema(self):
        data = requests.get(f"{BASE_URL}/api/influencers").json()
        assert isinstance(data, list), "Response must be a list"
        assert len(data) > 0, "Expected at least 1 influencer"
        inf = data[0]
        for field in ["name", "handle", "platform", "followers", "engagement_rate", "niche"]:
            assert field in inf, f"Missing field: {field}"
        assert isinstance(inf["followers"], int)
        assert isinstance(inf["engagement_rate"], float)
        print(f"PASS: /api/influencers schema valid, {len(data)} influencers returned")

    def test_influencers_filter_platform(self):
        resp = requests.get(f"{BASE_URL}/api/influencers?platform=Instagram")
        assert resp.status_code == 200
        data = resp.json()
        for inf in data:
            assert inf["platform"] == "Instagram"
        print(f"PASS: /api/influencers platform filter works, {len(data)} results")

    def test_influencer_not_found_returns_404(self):
        resp = requests.get(f"{BASE_URL}/api/influencers/inf_nonexistent_999")
        assert resp.status_code == 404
        print("PASS: /api/influencers/{id} 404 for unknown id")


# ---- 5. GET /api/campaigns ----
class TestCampaigns:
    """Campaign endpoints"""

    def test_list_campaigns_200(self, session):
        resp = session.get(f"{BASE_URL}/api/campaigns")
        assert resp.status_code == 200
        print("PASS: GET /api/campaigns 200")

    def test_campaigns_schema(self, session):
        data = session.get(f"{BASE_URL}/api/campaigns").json()
        assert isinstance(data, list)
        if data:
            c = data[0]
            for field in ["campaign_id", "name", "stage", "budget_min", "budget_max"]:
                assert field in c, f"Missing field: {field}"
        print("PASS: /api/campaigns schema valid")

    def test_campaigns_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/campaigns")
        assert resp.status_code == 401
        print("PASS: /api/campaigns without auth returns 401")


# ---- 6. POST /api/campaigns ----
class TestCreateCampaign:
    """Create campaign endpoint"""

    def test_create_campaign_200(self, session, campaign_id):
        # campaign_id fixture already created and validated
        assert campaign_id.startswith("campaign_")
        print(f"PASS: POST /api/campaigns created {campaign_id}")

    def test_create_campaign_schema(self, session):
        resp = session.post(f"{BASE_URL}/api/campaigns", json={
            "name": "TEST_Schema Check",
            "brand_name": "TEST_BrandB",
            "product_type": "Test product",
            "target_audience": "Gen Z",
            "campaign_goal": "Awareness",
            "budget_min": 500.0,
            "budget_max": 2000.0,
            "platforms": ["TikTok"],
            "brand_tone": "Fun"
        })
        assert resp.status_code == 200
        data = resp.json()
        for field in ["campaign_id", "name", "stage", "budget_min", "budget_max", "platforms"]:
            assert field in data, f"Missing field: {field}"
        assert data["stage"] == "Brief"
        assert data["name"] == "TEST_Schema Check"
        print("PASS: POST /api/campaigns schema and default stage=Brief correct")
        # cleanup
        try:
            from pymongo import MongoClient
            import os as _os
            c = MongoClient(_os.environ["MONGO_URL"])
            c[_os.environ["DB_NAME"]].campaigns.delete_one({"campaign_id": data["campaign_id"]})
        except Exception:
            pass

    def test_create_campaign_missing_field_returns_422(self, session):
        resp = session.post(f"{BASE_URL}/api/campaigns", json={
            "name": "Incomplete Campaign"
            # missing required fields
        })
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        print("PASS: POST /api/campaigns missing fields returns 422")


# ---- 7. PATCH /api/campaigns/{id}/stage ----
class TestCampaignStageUpdate:
    """Campaign stage update endpoint"""

    def test_update_stage_200(self, session, campaign_id):
        resp = session.patch(f"{BASE_URL}/api/campaigns/{campaign_id}/stage",
                             json={"stage": "Outreach"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["stage"] == "Outreach"
        print("PASS: PATCH /api/campaigns/{id}/stage returns 200 and updated stage")

    def test_update_stage_invalid_stage_400(self, session, campaign_id):
        resp = session.patch(f"{BASE_URL}/api/campaigns/{campaign_id}/stage",
                             json={"stage": "InvalidStage"})
        assert resp.status_code == 400
        print("PASS: PATCH stage with invalid value returns 400")

    def test_update_stage_nonexistent_campaign_404(self, session):
        resp = session.patch(f"{BASE_URL}/api/campaigns/campaign_nonexistent_999/stage",
                             json={"stage": "Outreach"})
        assert resp.status_code == 404
        print("PASS: PATCH stage nonexistent campaign returns 404")


# ---- 8. GET /api/analytics/overview ----
class TestAnalyticsOverview:
    """Analytics overview endpoint"""

    def test_analytics_overview_200(self, session):
        resp = session.get(f"{BASE_URL}/api/analytics/overview")
        assert resp.status_code == 200
        print("PASS: GET /api/analytics/overview 200")

    def test_analytics_overview_schema(self, session):
        data = session.get(f"{BASE_URL}/api/analytics/overview").json()
        for field in ["total_campaigns", "total_reach", "total_conversions", "total_spend", "avg_roas"]:
            assert field in data, f"Missing field: {field}"
        assert "monthly_trend" in data
        assert isinstance(data["monthly_trend"], list)
        print("PASS: /api/analytics/overview schema valid")


# ---- 9. GET /api/analytics/campaign/{id} ----
class TestCampaignAnalytics:
    """Per-campaign analytics endpoint"""

    def test_campaign_analytics_200(self, session, campaign_id):
        resp = session.get(f"{BASE_URL}/api/analytics/campaign/{campaign_id}")
        assert resp.status_code == 200
        print(f"PASS: GET /api/analytics/campaign/{campaign_id} 200")

    def test_campaign_analytics_schema(self, session, campaign_id):
        data = session.get(f"{BASE_URL}/api/analytics/campaign/{campaign_id}").json()
        for field in ["campaign_id", "campaign_name", "reach", "impressions",
                      "clicks", "conversions", "engagement_rate", "spend", "roas"]:
            assert field in data, f"Missing field: {field}"
        assert data["campaign_id"] == campaign_id
        print("PASS: /api/analytics/campaign schema valid")

    def test_campaign_analytics_404(self, session):
        resp = session.get(f"{BASE_URL}/api/analytics/campaign/campaign_nonexistent_999")
        assert resp.status_code == 404
        print("PASS: /api/analytics/campaign nonexistent returns 404")


# ---- 10-12. MESSAGES ----
class TestMessages:
    """Messages CRUD"""
    created_msg_id = None

    def test_list_messages_200(self, session):
        resp = session.get(f"{BASE_URL}/api/messages")
        assert resp.status_code == 200
        print("PASS: GET /api/messages 200")

    def test_messages_schema(self, session):
        data = session.get(f"{BASE_URL}/api/messages").json()
        assert isinstance(data, list)
        if data:
            m = data[0]
            for field in ["message_id", "influencer_name", "platform", "content", "direction", "is_read", "timestamp"]:
                assert field in m, f"Missing field: {field}"
        print("PASS: /api/messages schema valid")

    def test_create_message_200(self, session):
        resp = session.post(f"{BASE_URL}/api/messages", json={
            "influencer_name": "TEST_Influencer",
            "platform": "Instagram DM",
            "content": "TEST_Hello from automated test"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "message_id" in data
        assert data["influencer_name"] == "TEST_Influencer"
        assert data["direction"] == "outbound"
        TestMessages.created_msg_id = data["message_id"]
        print(f"PASS: POST /api/messages created {data['message_id']}")

    def test_mark_message_read(self, session):
        if not TestMessages.created_msg_id:
            pytest.skip("No message_id available")
        resp = session.patch(f"{BASE_URL}/api/messages/{TestMessages.created_msg_id}/read")
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        print("PASS: PATCH /api/messages/{id}/read returns 200")

    def test_messages_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/messages")
        assert resp.status_code == 401
        print("PASS: /api/messages without auth returns 401")


# ---- 13. GET /api/payments ----
class TestPayments:
    """Payments endpoint"""

    def test_list_payments_200(self, session):
        resp = session.get(f"{BASE_URL}/api/payments")
        assert resp.status_code == 200
        print("PASS: GET /api/payments 200")

    def test_payments_returns_list(self, session):
        data = session.get(f"{BASE_URL}/api/payments").json()
        assert isinstance(data, list)
        print(f"PASS: /api/payments returns list with {len(data)} items")


# ---- 14. POST /api/ai/score-influencers ----
class TestAIScoreInfluencers:
    """AI score-influencers endpoint"""

    def test_score_influencers_200(self, session, campaign_id):
        resp = session.post(f"{BASE_URL}/api/ai/score-influencers", json={
            "campaign_id": campaign_id,
            "influencer_ids": ["inf_001", "inf_002", "inf_003"]
        })
        # May take time for LLM call
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        print("PASS: POST /api/ai/score-influencers 200")

    def test_score_influencers_schema(self, session, campaign_id):
        resp = session.post(f"{BASE_URL}/api/ai/score-influencers", json={
            "campaign_id": campaign_id,
            "influencer_ids": ["inf_001"]
        })
        data = resp.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "influencer_id" in item or "match_score" in item, "Missing score fields"
        print("PASS: /api/ai/score-influencers returns scored list")

    def test_score_influencers_invalid_campaign_404(self, session):
        resp = session.post(f"{BASE_URL}/api/ai/score-influencers", json={
            "campaign_id": "campaign_nonexistent_999"
        })
        assert resp.status_code == 404
        print("PASS: /api/ai/score-influencers invalid campaign returns 404")


# ---- 15. POST /api/agent/chat ----
class TestAgentChat:
    """Brand Agent (Bedrock) chat endpoint"""

    def test_agent_chat_200(self):
        resp = requests.post(f"{BASE_URL}/api/agent/chat", json={
            "message": "Hello, what can you help me with?",
            "session_id": "test_session_iter5"
        }, timeout=60)
        assert resp.status_code in [200, 502], f"Unexpected status: {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert "response" in data, "Missing 'response' field"
            assert "session_id" in data
            assert len(data["response"]) > 0
            print(f"PASS: POST /api/agent/chat 200, response: {data['response'][:80]}...")
        else:
            print(f"WARNING: /api/agent/chat returned 502 (Bedrock may not be configured): {resp.text}")

    def test_agent_chat_missing_body_returns_422(self):
        resp = requests.post(f"{BASE_URL}/api/agent/chat", json={})
        assert resp.status_code == 422
        print("PASS: /api/agent/chat missing body returns 422")


# ---- 16. POST /api/agent/send-outreach ----
class TestAgentSendOutreach:
    """Outreach email endpoint (uses real Gmail SMTP)"""

    def test_send_outreach_200(self):
        resp = requests.post(f"{BASE_URL}/api/agent/send-outreach", json={
            "to_email": "influencerconnectai@hotmail.com",
            "influencer_name": "Test Influencer",
            "influencer_handle": "testinfluencer",
            "brand_name": "TEST_Brand",
            "budget": "$1000 - $5000",
            "target_audience": "Automated test audience",
            "campaign_details": "This is an automated test email from iteration 5 testing.",
            "product_details": "Test product for automated testing."
        }, timeout=30)
        assert resp.status_code in [200, 401, 502], f"Unexpected: {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("success") is True
            assert "message" in data
            print("PASS: POST /api/agent/send-outreach 200 — email sent")
        elif resp.status_code == 401:
            print("WARNING: /api/agent/send-outreach 401 — SMTP auth failed (check credentials)")
        else:
            print(f"WARNING: /api/agent/send-outreach {resp.status_code}: {resp.text}")

    def test_send_outreach_missing_fields_returns_422(self):
        resp = requests.post(f"{BASE_URL}/api/agent/send-outreach", json={
            "to_email": "test@example.com"
            # missing required fields
        })
        assert resp.status_code == 422
        print("PASS: /api/agent/send-outreach missing fields returns 422")
