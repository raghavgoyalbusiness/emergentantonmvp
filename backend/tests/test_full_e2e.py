"""Full E2E backend tests for Influencer Connect"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = "test_session_e2e_2025"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


class TestHealth:
    def test_health(self):
        # Check root or any available endpoint
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code in [200, 404, 422]  # API is reachable

class TestAuth:
    def test_auth_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "user_id" in data or "email" in data

class TestDashboard:
    def test_dashboard_stats(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)

class TestInfluencers:
    def test_get_influencers(self):
        r = requests.get(f"{BASE_URL}/api/influencers", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

class TestCampaigns:
    def test_get_campaigns(self):
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

class TestAnalytics:
    def test_analytics_overview(self):
        r = requests.get(f"{BASE_URL}/api/analytics/overview", headers=HEADERS)
        assert r.status_code == 200

class TestPayments:
    def test_payments(self):
        r = requests.get(f"{BASE_URL}/api/payments", headers=HEADERS)
        assert r.status_code == 200

class TestMessages:
    def test_get_messages(self):
        r = requests.get(f"{BASE_URL}/api/messages", headers=HEADERS)
        assert r.status_code == 200
