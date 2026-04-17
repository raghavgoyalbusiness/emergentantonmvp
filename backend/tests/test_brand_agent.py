"""Tests for Brand Agent endpoints: /api/agent/chat and /api/agent/send-outreach"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

HEADERS = {"Content-Type": "application/json"}


class TestAgentChat:
    """Tests for /api/agent/chat"""

    def test_chat_returns_200_with_response(self):
        """Chat endpoint should return 200 with a response field"""
        payload = {
            "message": "Find top 3 beauty influencers from the US for a skincare brand.",
            "session_id": "test-session-brand-agent-001"
        }
        resp = requests.post(f"{BASE_URL}/api/agent/chat", json=payload, headers=HEADERS, timeout=60)
        print(f"Chat status: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        assert "response" in data, f"Missing 'response' key: {data}"
        assert len(data["response"]) > 10, "Response too short"
        print(f"Response preview: {data['response'][:200]}")

    def test_chat_response_contains_influencer_format(self):
        """Response should contain **N. Name (@handle)** format or structured influencer data"""
        payload = {
            "message": "List 2 fitness micro-influencers on Instagram with their email contacts.",
            "session_id": "test-session-brand-agent-002"
        }
        resp = requests.post(f"{BASE_URL}/api/agent/chat", json=payload, headers=HEADERS, timeout=60)
        assert resp.status_code == 200
        data = resp.json()
        response_text = data.get("response", "")
        # Check for common patterns: numbered lists or @handle mentions
        has_handle = "@" in response_text
        has_number = any(f"**{i}." in response_text or f"{i}." in response_text for i in range(1, 6))
        print(f"Has @handle: {has_handle}, Has numbered: {has_number}")
        print(f"Full response (first 500): {response_text[:500]}")
        assert has_handle or has_number, f"Response doesn't look like influencer data: {response_text[:300]}"


class TestSendOutreach:
    """Tests for /api/agent/send-outreach"""

    def test_send_outreach_to_test_email(self):
        """Should send email to to_email field and return success"""
        payload = {
            "to_email": "techmaster@socialcurrent.in",
            "influencer_name": "Test Influencer",
            "influencer_handle": "testinfluencer",
            "brand_name": "Test Brand",
            "budget": "$1000-$2000",
            "target_audience": "Young adults 18-30",
            "campaign_details": "2 Instagram posts showcasing the product",
            "product_details": "Organic skincare serum"
        }
        resp = requests.post(f"{BASE_URL}/api/agent/send-outreach", json=payload, headers=HEADERS, timeout=30)
        print(f"Outreach status: {resp.status_code}")
        print(f"Outreach response: {resp.text[:300]}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        assert data.get("success"), f"Expected success=True: {data}"
        assert "techmaster@socialcurrent.in" in data.get("message", ""), f"Email not in message: {data}"

    def test_send_outreach_missing_fields_returns_error(self):
        """Missing required fields should return 422 or 4xx"""
        payload = {"to_email": "techmaster@socialcurrent.in"}  # missing required fields
        resp = requests.post(f"{BASE_URL}/api/agent/send-outreach", json=payload, headers=HEADERS, timeout=15)
        print(f"Missing fields status: {resp.status_code}")
        assert resp.status_code in [400, 422], f"Expected 4xx for missing fields, got {resp.status_code}"
