"""Final production-readiness backend test for Influencer Connect"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = os.getenv("TEST_SESSION_TOKEN", "test_session_e2e_2025")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        print(f"PASS health: {data}")

class TestAuth:
    def test_auth_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "email" in data or "user_id" in data
        print(f"PASS auth/me: {data}")

class TestCoreAPIs:
    def test_dashboard_stats(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS dashboard/stats: {r.json()}")

    def test_campaigns(self):
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS campaigns: {len(r.json())} items")

    def test_influencers(self):
        r = requests.get(f"{BASE_URL}/api/influencers", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS influencers: {len(r.json())} items")

    def test_messages(self):
        r = requests.get(f"{BASE_URL}/api/messages", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS messages: {r.status_code}")

    def test_analytics_overview(self):
        r = requests.get(f"{BASE_URL}/api/analytics/overview", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS analytics/overview: {r.status_code}")

    def test_payments(self):
        r = requests.get(f"{BASE_URL}/api/payments", headers=HEADERS)
        assert r.status_code == 200
        print(f"PASS payments: {r.status_code}")
