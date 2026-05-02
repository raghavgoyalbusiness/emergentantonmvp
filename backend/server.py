from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests as req
import json
import random
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---- REQUEST MODELS ----

class SessionExchange(BaseModel):
    session_id: str

class CampaignCreate(BaseModel):
    name: str
    brand_name: str
    product_type: str
    target_audience: str
    campaign_goal: str
    budget_min: float
    budget_max: float
    platforms: List[str]
    brand_tone: str

class CampaignStageUpdate(BaseModel):
    stage: str

class InfluencerListUpdate(BaseModel):
    influencer_ids: List[str]

class OutreachGenerateRequest(BaseModel):
    campaign_id: str
    influencer_id: str

class BriefGenerateRequest(BaseModel):
    campaign_id: str

class ScoreRequest(BaseModel):
    campaign_id: str
    influencer_ids: Optional[List[str]] = None

class CheckoutRequest(BaseModel):
    campaign_id: str
    influencer_id: str
    origin_url: str

class MessageSend(BaseModel):
    influencer_name: str
    platform: str
    content: str
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None

class OutreachUpdate(BaseModel):
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    dm_script: Optional[str] = None

class AgentChatRequest(BaseModel):
    message: str
    session_id: str

class AgentChatResponse(BaseModel):
    response: str
    session_id: str

class OutreachEmailRequest(BaseModel):
    to_email: str
    influencer_name: str
    influencer_handle: str
    brand_name: str
    budget: str
    target_audience: str
    campaign_details: str
    product_details: str

# ---- AUTH HELPERS ----

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return user_doc

# ---- AUTH ROUTES ----

@api_router.post("/auth/session")
async def exchange_session(body: SessionExchange, response: Response):
    try:
        r = req.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
            timeout=10
        )
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session")
        data = r.json()
    except req.RequestException as e:
        logger.error(f"Auth exchange error: {e}")
        raise HTTPException(status_code=500, detail="Auth service unavailable")

    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"email": data["email"]},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        # Demo seeding disabled — users start with a clean dashboard

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ---- DASHBOARD ROUTES ----

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    user_id = user["user_id"]
    total_campaigns = await db.campaigns.count_documents({"user_id": user_id})
    active_campaigns = await db.campaigns.count_documents({
        "user_id": user_id,
        "stage": {"$in": ["Live", "Outreach", "Accepted", "Content Review"]}
    })
    pending_approvals = await db.campaigns.count_documents({
        "user_id": user_id,
        "stage": {"$in": ["Brief", "Content Review"]}
    })
    campaigns = await db.campaigns.find(
        {"user_id": user_id}, {"_id": 0, "selected_influencers": 1}
    ).to_list(100)
    all_inf_ids = []
    for c in campaigns:
        all_inf_ids.extend(c.get("selected_influencers", []))

    payments = await db.payment_transactions.find(
        {"user_id": user_id, "payment_status": "paid"}, {"_id": 0, "total_amount": 1}
    ).to_list(100)
    total_spend = sum(p.get("total_amount", 0) for p in payments)

    return {
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "pending_approvals": pending_approvals,
        "total_spend": total_spend,
        "campaign_health_score": min(98, 55 + active_campaigns * 8),
        "total_influencers": len(set(all_inf_ids)),
        "avg_engagement": 4.8
    }

# ---- CAMPAIGN ROUTES ----

@api_router.get("/campaigns")
async def list_campaigns(user=Depends(get_current_user)):
    campaigns = await db.campaigns.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return campaigns

@api_router.post("/campaigns")
async def create_campaign(body: CampaignCreate, user=Depends(get_current_user)):
    campaign_id = f"campaign_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "campaign_id": campaign_id,
        "user_id": user["user_id"],
        "name": body.name,
        "brand_name": body.brand_name,
        "product_type": body.product_type,
        "target_audience": body.target_audience,
        "campaign_goal": body.campaign_goal,
        "budget_min": body.budget_min,
        "budget_max": body.budget_max,
        "platforms": body.platforms,
        "brand_tone": body.brand_tone,
        "stage": "Brief",
        "ai_criteria": None,
        "brief_content": None,
        "selected_influencers": [],
        "created_at": now,
        "updated_at": now
    }
    await db.campaigns.insert_one(doc)

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"criteria-{campaign_id}",
            system_message="You are an expert influencer marketing strategist. Always respond with valid JSON only."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        prompt = f"""Generate influencer selection criteria for this brand brief. Return ONLY valid JSON.
Brand Brief:
- Product: {body.product_type}
- Target Audience: {body.target_audience}
- Campaign Goal: {body.campaign_goal}
- Budget: ${body.budget_min} - ${body.budget_max}
- Platforms: {', '.join(body.platforms)}
- Brand Tone: {body.brand_tone}

Return JSON in this exact format:
{{
  "niche_keywords": ["keyword1", "keyword2", "keyword3"],
  "follower_range": {{"min": 50000, "max": 500000}},
  "min_engagement_rate": 3.5,
  "location_preference": "US, UK, Canada",
  "content_style": "authentic, lifestyle-focused",
  "platform_priority": ["Instagram", "TikTok"]
}}"""
        response_text = await chat.send_message(UserMessage(text=prompt))
        response_text = response_text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        ai_criteria = json.loads(response_text)
        await db.campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {"ai_criteria": ai_criteria, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        doc["ai_criteria"] = ai_criteria
    except Exception as e:
        logger.error(f"AI criteria generation failed: {e}")

    doc.pop("_id", None)
    return doc

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user=Depends(get_current_user)):
    doc = await db.campaigns.find_one(
        {"campaign_id": campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return doc

@api_router.patch("/campaigns/{campaign_id}/stage")
async def update_campaign_stage(campaign_id: str, body: CampaignStageUpdate, user=Depends(get_current_user)):
    valid_stages = ["Brief", "Outreach", "Accepted", "Live", "Content Review", "Paid", "Reported"]
    if body.stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {body.stage}")
    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id, "user_id": user["user_id"]},
        {"$set": {"stage": body.stage, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    doc = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    return doc

@api_router.patch("/campaigns/{campaign_id}/influencers")
async def update_campaign_influencers(campaign_id: str, body: InfluencerListUpdate, user=Depends(get_current_user)):
    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id, "user_id": user["user_id"]},
        {"$set": {"selected_influencers": body.influencer_ids, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Influencers updated", "count": len(body.influencer_ids)}

# ---- INFLUENCER ROUTES ----

@api_router.get("/influencers")
async def list_influencers(platform: Optional[str] = None, niche: Optional[str] = None):
    query = {}
    if platform:
        query["platform"] = platform
    if niche:
        query["niche"] = {"$regex": niche, "$options": "i"}
    influencers = await db.influencers.find(query, {"_id": 0}).to_list(200)
    return influencers

@api_router.get("/influencers/{influencer_id}")
async def get_influencer(influencer_id: str):
    doc = await db.influencers.find_one({"influencer_id": influencer_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return doc

# ---- AI ROUTES ----

@api_router.post("/ai/score-influencers")
async def score_influencers(body: ScoreRequest, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"campaign_id": body.campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if body.influencer_ids:
        influencers = await db.influencers.find(
            {"influencer_id": {"$in": body.influencer_ids}}, {"_id": 0}
        ).to_list(50)
    else:
        influencers = await db.influencers.find({}, {"_id": 0}).to_list(50)

    if not influencers:
        return []

    inf_list = "\n".join([
        f"ID: {inf['influencer_id']}, Name: {inf['name']}, Platform: {inf['platform']}, "
        f"Followers: {inf['followers']:,}, Engagement: {inf['engagement_rate']}%, "
        f"Niche: {inf['niche']}, Location: {inf['location']}"
        for inf in influencers
    ])

    prompt = f"""Score these influencers for this brand campaign. Return ONLY a valid JSON array.

Brand Campaign:
- Product: {campaign['product_type']}
- Target Audience: {campaign['target_audience']}
- Goal: {campaign['campaign_goal']}
- Platforms: {', '.join(campaign['platforms'])}
- Tone: {campaign['brand_tone']}
- Budget: ${campaign['budget_min']} - ${campaign['budget_max']}

Influencers:
{inf_list}

Score 0-100 based on: niche alignment (30%), audience match (25%), engagement health (20%), brand tone fit (15%), platform alignment (10%).

Return ONLY this JSON array (absolutely no other text):
[
  {{"influencer_id": "id", "match_score": 87, "reason": "One sentence explaining the specific match"}}
]"""

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"scoring-{uuid.uuid4().hex[:8]}",
            system_message="You are an expert influencer marketing analyst. Always respond with valid JSON only, no markdown."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response_text = await chat.send_message(UserMessage(text=prompt))
        response_text = response_text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        scores = json.loads(response_text)
        score_map = {s["influencer_id"]: s for s in scores}
        results = []
        for inf in influencers:
            inf_copy = dict(inf)
            if inf["influencer_id"] in score_map:
                inf_copy["match_score"] = score_map[inf["influencer_id"]]["match_score"]
                inf_copy["match_reason"] = score_map[inf["influencer_id"]]["reason"]
            else:
                inf_copy["match_score"] = 50
                inf_copy["match_reason"] = "General alignment with campaign goals"
            results.append(inf_copy)
        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return results[:20]
    except Exception as e:
        logger.error(f"AI scoring failed: {e}")
        results = []
        for i, inf in enumerate(influencers[:20]):
            inf_copy = dict(inf)
            inf_copy["match_score"] = max(42, 96 - i * 3)
            inf_copy["match_reason"] = f"Strong {inf['niche']} presence aligns with {campaign['product_type']} campaign objectives"
            results.append(inf_copy)
        return results

@api_router.post("/ai/generate-outreach")
async def generate_outreach(body: OutreachGenerateRequest, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"campaign_id": body.campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    influencer = await db.influencers.find_one({"influencer_id": body.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    prompt = f"""Generate personalized outreach for this influencer collaboration. Return ONLY valid JSON.

Influencer:
- Name: {influencer['name']} (@{influencer['handle']})
- Platform: {influencer['platform']}, Followers: {influencer['followers']:,}
- Niche: {influencer['niche']}
- Bio: {influencer['bio']}
- Recent Content: {', '.join(influencer.get('recent_posts', [])[:3])}
- Past Brands: {', '.join(influencer.get('past_brands', [])[:3])}

Brand Campaign:
- Brand: {campaign['brand_name']}
- Product: {campaign['product_type']}
- Goal: {campaign['campaign_goal']}
- Tone: {campaign['brand_tone']}
- Budget: ${campaign['budget_min']} - ${campaign['budget_max']}

Generate warm, specific, personalized outreach. Email max 180 words. DM max 90 words.
Return ONLY this JSON:
{{
  "subject": "Compelling subject line",
  "email": "Full personalized email body (150-180 words)",
  "dm": "Casual DM script (70-90 words)"
}}"""

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"outreach-{uuid.uuid4().hex[:8]}",
            system_message="You are an expert influencer marketing copywriter. Write compelling, personalized outreach. Always respond with valid JSON only."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response_text = await chat.send_message(UserMessage(text=prompt))
        response_text = response_text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        result = json.loads(response_text)

        outreach_id = f"out_{uuid.uuid4().hex[:12]}"
        await db.outreach.insert_one({
            "outreach_id": outreach_id,
            "campaign_id": body.campaign_id,
            "influencer_id": body.influencer_id,
            "status": "Draft",
            "email_subject": result.get("subject", ""),
            "email_body": result.get("email", ""),
            "dm_script": result.get("dm", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        result["outreach_id"] = outreach_id
        return result
    except Exception as e:
        logger.error(f"Outreach generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate outreach copy")

@api_router.post("/ai/generate-brief")
async def generate_brief(body: BriefGenerateRequest, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"campaign_id": body.campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    brand_lower = campaign['brand_name'].lower().replace(" ", "")
    prompt = f"""Generate a comprehensive influencer campaign brief. Return ONLY valid JSON.

Campaign:
- Brand: {campaign['brand_name']}
- Product: {campaign['product_type']}
- Target Audience: {campaign['target_audience']}
- Goal: {campaign['campaign_goal']}
- Budget: ${campaign['budget_min']} - ${campaign['budget_max']}
- Platforms: {', '.join(campaign['platforms'])}
- Tone: {campaign['brand_tone']}

Return ONLY this JSON:
{{
  "deliverables": ["2 Instagram feed posts", "4 Instagram Stories", "1 Reel (30-60 sec)"],
  "deadline": "Content due 14 days from brief acceptance",
  "content_guidelines": ["Showcase product in natural lighting", "Include personal testimonial", "Tag @{brand_lower}"],
  "hashtags": ["#{brand_lower}", "#sponsored", "#ad"],
  "dos": ["Be authentic and genuine", "Show product in actual use", "Highlight key benefits naturally"],
  "donts": ["No competitor brand mentions", "No political statements", "No explicit content"],
  "usage_rights": "Brand retains right to repurpose content for 12 months across owned channels",
  "payment_terms": "50% on brief acceptance, 50% on content approval within 5 business days",
  "revision_policy": "Up to 2 rounds of revisions included at no charge",
  "approval_process": "All content requires brand approval 48 hours before posting"
}}"""

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"brief-{uuid.uuid4().hex[:8]}",
            system_message="You are an expert influencer campaign manager. Create detailed, clear briefs. Always respond with valid JSON only."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response_text = await chat.send_message(UserMessage(text=prompt))
        response_text = response_text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        brief = json.loads(response_text)
        await db.campaigns.update_one(
            {"campaign_id": body.campaign_id},
            {"$set": {"brief_content": json.dumps(brief), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return brief
    except Exception as e:
        logger.error(f"Brief generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate brief")

# ---- PAYMENT ROUTES ----

@api_router.post("/payments/create-checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"campaign_id": body.campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    influencer = await db.influencers.find_one({"influencer_id": body.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    creator_fee = float(influencer.get("fee_per_post", 500.0))
    platform_fee = round(creator_fee * 0.15, 2)
    total_amount = round(creator_fee + platform_fee, 2)

    success_url = f"{body.origin_url}/payments?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/payments"

    stripe_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

    checkout_req = CheckoutSessionRequest(
        amount=total_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "campaign_id": body.campaign_id,
            "influencer_id": body.influencer_id,
            "user_id": user["user_id"],
            "creator_fee": str(creator_fee),
            "platform_fee": str(platform_fee)
        }
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    txn_id = f"txn_{uuid.uuid4().hex[:12]}"
    await db.payment_transactions.insert_one({
        "transaction_id": txn_id,
        "campaign_id": body.campaign_id,
        "campaign_name": campaign.get("name", ""),
        "influencer_id": body.influencer_id,
        "influencer_name": influencer.get("name", ""),
        "user_id": user["user_id"],
        "amount": creator_fee,
        "platform_fee": platform_fee,
        "total_amount": total_amount,
        "currency": "usd",
        "session_id": session.session_id,
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "url": session.url,
        "session_id": session.session_id,
        "creator_fee": creator_fee,
        "platform_fee": platform_fee,
        "total_amount": total_amount
    }

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(get_current_user)):
    stripe_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if existing and existing.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        if status.payment_status == "paid":
            await db.campaigns.update_one(
                {"campaign_id": existing["campaign_id"]},
                {"$set": {"stage": "Paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "transaction": txn
    }

@api_router.get("/payments")
async def list_payments(user=Depends(get_current_user)):
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return payments

# ---- SUBSCRIPTION PLANS ----

SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter",
        "price": 299.00,
        "currency": "usd",
        "description": "Perfect for small brands",
        "features": ["Up to 3 active campaigns", "20 creator searches/mo", "Basic analytics", "Email outreach"],
    },
    "growth": {
        "name": "Growth",
        "price": 599.00,
        "currency": "usd",
        "description": "Most popular for growing brands",
        "features": ["Up to 10 active campaigns", "Unlimited creator searches", "Full analytics + ROAS", "AI outreach + briefs", "Stripe escrow payments"],
    },
    "scale": {
        "name": "Scale",
        "price": 1299.00,
        "currency": "usd",
        "description": "For agencies & power users",
        "features": ["Unlimited campaigns", "White-label reports", "Priority AI processing", "Dedicated account manager", "API access"],
    },
}

class SubscribeRequest(BaseModel):
    plan_id: str
    origin_url: str

@api_router.get("/user/subscription")
async def get_subscription(user=Depends(get_current_user)):
    # VIP test account — always treated as active Scale subscriber
    if user.get("email", "").lower() == "kunaldebroy8240@gmail.com":
        return {
            "has_subscription": True,
            "plan": "scale",
            "plan_name": "Scale",
            "started_at": None,
        }
    sub = await db.subscriptions.find_one(
        {"user_id": user["user_id"], "payment_status": "active"}, {"_id": 0}
    )
    return {
        "has_subscription": sub is not None,
        "plan": sub.get("plan_id") if sub else None,
        "plan_name": SUBSCRIPTION_PLANS.get(sub.get("plan_id", ""), {}).get("name") if sub else None,
        "started_at": sub.get("started_at") if sub else None,
    }

@api_router.post("/payments/subscribe")
async def subscribe(body: SubscribeRequest, request: Request, user=Depends(get_current_user)):
    plan = SUBSCRIPTION_PLANS.get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")

    stripe_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

    success_url = f"{body.origin_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}&plan={body.plan_id}"
    cancel_url = f"{body.origin_url}/subscription"

    checkout_req = CheckoutSessionRequest(
        amount=plan["price"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "email": user.get("email", ""),
            "plan_id": body.plan_id,
            "type": "subscription",
        },
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Record pending transaction
    await db.payment_transactions.insert_one({
        "transaction_id": f"sub_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "email": user.get("email", ""),
        "plan_id": body.plan_id,
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": plan["currency"],
        "payment_status": "pending",
        "type": "subscription",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/subscribe/status/{session_id}")
async def subscription_payment_status(session_id: str, user=Depends(get_current_user)):
    stripe_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if status.payment_status == "paid" and txn.get("payment_status") != "active":
        plan_id = txn.get("plan_id", "starter")
        now = datetime.now(timezone.utc).isoformat()

        # Update transaction to active
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "active", "status": "complete", "updated_at": now}}
        )

        # Upsert subscription record
        await db.subscriptions.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "user_id": user["user_id"],
                "plan_id": plan_id,
                "plan_name": SUBSCRIPTION_PLANS.get(plan_id, {}).get("name", plan_id),
                "payment_status": "active",
                "session_id": session_id,
                "started_at": now,
                "updated_at": now,
            }},
            upsert=True
        )

    return {
        "payment_status": status.payment_status,
        "plan_id": txn.get("plan_id"),
        "plan_name": txn.get("plan_name"),
    }

@api_router.get("/payments/plans")
async def list_plans():
    return [{"id": k, **v} for k, v in SUBSCRIPTION_PLANS.items()]

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        if event.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "active" if event.metadata.get("type") == "subscription" else "paid",
                          "status": "complete",
                          "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            # Activate subscription if subscription type
            if event.metadata.get("type") == "subscription":
                plan_id = event.metadata.get("plan_id", "starter")
                user_id = event.metadata.get("user_id")
                if user_id:
                    now = datetime.now(timezone.utc).isoformat()
                    await db.subscriptions.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "user_id": user_id,
                            "plan_id": plan_id,
                            "plan_name": SUBSCRIPTION_PLANS.get(plan_id, {}).get("name", plan_id),
                            "payment_status": "active",
                            "session_id": event.session_id,
                            "started_at": now,
                            "updated_at": now,
                        }},
                        upsert=True
                    )
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"received": True}

# ---- ANALYTICS ROUTES ----

@api_router.get("/analytics/campaign/{campaign_id}")
async def campaign_analytics(campaign_id: str, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"campaign_id": campaign_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    rng = random.Random(campaign_id)
    reach = rng.randint(60000, 480000)
    impressions = int(reach * rng.uniform(1.8, 3.2))
    clicks = int(reach * rng.uniform(0.025, 0.075))
    conversions = int(clicks * rng.uniform(0.06, 0.18))
    spend = campaign.get("budget_min", 1000)
    roas = round((conversions * 48) / max(spend, 1), 2)

    creators = []
    for inf_id in campaign.get("selected_influencers", [])[:5]:
        inf = await db.influencers.find_one({"influencer_id": inf_id}, {"_id": 0})
        if inf:
            r_rng = random.Random(inf_id)
            creators.append({
                "influencer_id": inf_id,
                "name": inf["name"],
                "handle": inf["handle"],
                "platform": inf["platform"],
                "reach": r_rng.randint(20000, 150000),
                "engagement_rate": round(r_rng.uniform(3.5, 9.5), 1),
                "conversions": r_rng.randint(20, 200),
                "cost": round(inf.get("fee_per_post", 500), 2)
            })

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign["name"],
        "reach": reach,
        "impressions": impressions,
        "clicks": clicks,
        "conversions": conversions,
        "engagement_rate": round(rng.uniform(3.5, 7.2), 1),
        "spend": spend,
        "roas": roas,
        "cost_per_click": round(spend / max(clicks, 1), 2),
        "cost_per_conversion": round(spend / max(conversions, 1), 2),
        "weekly_trend": [
            {"week": "Wk 1", "reach": int(reach * 0.18), "conversions": int(conversions * 0.14)},
            {"week": "Wk 2", "reach": int(reach * 0.32), "conversions": int(conversions * 0.28)},
            {"week": "Wk 3", "reach": int(reach * 0.31), "conversions": int(conversions * 0.36)},
            {"week": "Wk 4", "reach": int(reach * 0.19), "conversions": int(conversions * 0.22)},
        ],
        "creator_breakdown": creators
    }

@api_router.get("/analytics/overview")
async def analytics_overview(user=Depends(get_current_user)):
    campaigns = await db.campaigns.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    rng = random.Random(user["user_id"])
    total_reach = sum(rng.randint(60000, 300000) for _ in campaigns) if campaigns else 0
    total_conversions = sum(rng.randint(80, 600) for _ in campaigns) if campaigns else 0
    total_spend = sum(c.get("budget_min", 1000) for c in campaigns)
    return {
        "total_campaigns": len(campaigns),
        "total_reach": total_reach,
        "total_conversions": total_conversions,
        "total_spend": total_spend,
        "avg_roas": round((total_conversions * 48) / max(total_spend, 1), 2),
        "avg_engagement_rate": 5.1,
        "top_platform": "TikTok",
        "monthly_trend": [
            {"month": "Oct", "reach": 128000, "conversions": 360},
            {"month": "Nov", "reach": 195000, "conversions": 540},
            {"month": "Dec", "reach": 267000, "conversions": 810},
            {"month": "Jan", "reach": 224000, "conversions": 680},
            {"month": "Feb", "reach": 312000, "conversions": 980},
        ]
    }

# ---- MESSAGES ROUTES ----

@api_router.get("/messages")
async def list_messages(user=Depends(get_current_user)):
    messages = await db.messages.find({"user_id": user["user_id"]}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return messages

@api_router.post("/messages")
async def send_message(body: MessageSend, user=Depends(get_current_user)):
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    doc = {
        "message_id": msg_id,
        "user_id": user["user_id"],
        "campaign_id": body.campaign_id,
        "influencer_id": body.influencer_id,
        "influencer_name": body.influencer_name,
        "platform": body.platform,
        "content": body.content,
        "direction": "outbound",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_read": True
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user=Depends(get_current_user)):
    await db.messages.update_one({"message_id": message_id}, {"$set": {"is_read": True}})
    return {"message": "Marked as read"}

# ---- OUTREACH ROUTES ----

@api_router.get("/outreach")
async def list_outreach(campaign_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if campaign_id:
        camp = await db.campaigns.find_one(
            {"campaign_id": campaign_id, "user_id": user["user_id"]}, {"_id": 0}
        )
        if not camp:
            raise HTTPException(status_code=404, detail="Campaign not found")
        query["campaign_id"] = campaign_id
    outreach_list = await db.outreach.find(query, {"_id": 0}).to_list(100)
    return outreach_list

@api_router.patch("/outreach/{outreach_id}")
async def update_outreach(outreach_id: str, body: OutreachUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.outreach.update_one({"outreach_id": outreach_id}, {"$set": updates})
    doc = await db.outreach.find_one({"outreach_id": outreach_id}, {"_id": 0})
    return doc

@api_router.patch("/outreach/{outreach_id}/send")
async def mark_outreach_sent(outreach_id: str, user=Depends(get_current_user)):
    await db.outreach.update_one(
        {"outreach_id": outreach_id},
        {"$set": {"status": "Sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Outreach marked as sent"}

# ---- BRAND AGENT (AWS Bedrock) ----

def _get_bedrock_client():
    """Create a boto3 bedrock-agent-runtime client using env credentials."""
    return boto3.client(
        service_name="bedrock-agent-runtime",
        region_name=os.environ.get("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        config=BotoConfig(
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=60,
            read_timeout=120,
        ),
    )

def _extract_agent_response(completion_stream) -> str:
    """Read the event stream from invoke_agent and return the full text."""
    text = ""
    for event in completion_stream:
        if "chunk" in event:
            chunk_bytes = event["chunk"].get("bytes", b"")
            text += chunk_bytes.decode("utf-8")
    return text

@api_router.post("/agent/chat")
async def agent_chat(body: AgentChatRequest):
    agent_id    = os.environ.get("BEDROCK_AGENT_ID", "")
    alias_id    = os.environ.get("BEDROCK_AGENT_ALIAS_ID", "")

    if not agent_id or not alias_id:
        raise HTTPException(status_code=500, detail="Bedrock agent not configured")

    try:
        bedrock = _get_bedrock_client()
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: bedrock.invoke_agent(
                agentId=agent_id,
                agentAliasId=alias_id,
                sessionId=body.session_id,
                inputText=body.message,
                enableTrace=False,
                endSession=False,
            )
        )
        text = _extract_agent_response(response.get("completion", []))
        return AgentChatResponse(response=text, session_id=body.session_id)

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "Unknown")
        msg  = e.response.get("Error", {}).get("Message", str(e))
        logger.error(f"Bedrock ClientError [{code}]: {msg}")
        raise HTTPException(status_code=502, detail=f"Bedrock error ({code}): {msg}")
    except Exception as e:
        logger.error(f"Bedrock unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/agent/send-outreach")
async def send_outreach(body: OutreachEmailRequest):
    smtp_email    = os.environ.get("SMTP_EMAIL", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=500, detail="Email service not configured")

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{{font-family:Georgia,'Times New Roman',serif;background:#f5f7fa;margin:0;padding:20px;color:#333}}
  .wrapper{{max-width:600px;margin:0 auto}}
  .card{{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}}
  .hdr{{background:#0A0F2E;padding:32px;text-align:center}}
  .logo{{font-family:Georgia,serif;font-size:22px;color:#00D4C8;font-weight:bold;margin:0}}
  .logo-sub{{color:rgba(255,255,255,.45);font-size:12px;margin:6px 0 0}}
  .body{{padding:32px}}
  p{{font-size:14px;line-height:1.75;color:#444;margin:0 0 16px}}
  .block{{background:#f0fffe;border-left:3px solid #00D4C8;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:14px}}
  .blabel{{font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:#00a896;font-weight:bold;margin-bottom:5px}}
  .bval{{font-size:14px;color:#1a1a2e;line-height:1.55}}
  .cta{{text-align:center;margin:28px 0}}
  .btn{{display:inline-block;background:#00D4C8;color:#0A0F2E;padding:13px 30px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:14px;font-family:Georgia,serif}}
  .footer{{background:#f5f7fa;padding:18px 32px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee}}
  a{{color:#00a896}}
</style>
</head>
<body>
<div class="wrapper"><div class="card">
  <div class="hdr">
    <p class="logo">InfluencerConnect</p>
    <p class="logo-sub">AI-Powered Brand Partnership Platform</p>
  </div>
  <div class="body">
    <p>Hi <strong>{body.influencer_name}</strong>,</p>
    <p>I hope this message finds you well! I'm reaching out on behalf of <strong>{body.brand_name}</strong> through <strong>InfluencerConnect</strong> — an AI-powered platform connecting premium brands with top creators.</p>
    <p>We've identified you as a strong match for an upcoming campaign and would love to explore a collaboration.</p>
    <div class="block">
      <div class="blabel">Brand &amp; Product</div>
      <div class="bval"><strong>{body.brand_name}</strong> — {body.product_details}</div>
    </div>
    <div class="block">
      <div class="blabel">Campaign Details</div>
      <div class="bval">{body.campaign_details}</div>
    </div>
    <div class="block">
      <div class="blabel">Target Audience</div>
      <div class="bval">{body.target_audience}</div>
    </div>
    <div class="block">
      <div class="blabel">Budget Range</div>
      <div class="bval">{body.budget}</div>
    </div>
    <div class="cta">
      <a href="mailto:{smtp_email}" class="btn">Reply to Discuss &rarr;</a>
    </div>
    <p>We believe this could be a great fit. Please reply to this email with any questions or to express your interest.</p>
    <p>Looking forward to connecting!<br><br>
    <strong>InfluencerConnect Team</strong><br>
    <a href="mailto:influencerconnectai@hotmail.com">influencerconnectai@hotmail.com</a><br>
    <em style="font-size:12px;color:#888">To reply, please contact us directly at: influencerconnectai@hotmail.com</em></p>
  </div>
  <div class="footer">
    Sent via InfluencerConnect AI on behalf of {body.brand_name}. Reply "unsubscribe" to opt out.
  </div>
</div></div>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Brand Partnership Opportunity — {body.brand_name} x @{body.influencer_handle}"
        msg["From"]    = f"InfluencerConnect <{smtp_email}>"
        msg["To"]      = body.to_email
        msg["Reply-To"] = "influencerconnectai@hotmail.com"
        msg.attach(MIMEText(html_body, "html"))

        loop = asyncio.get_event_loop()
        def _send():
            pwd = smtp_password.replace(" ", "")
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(smtp_email, pwd)
                srv.sendmail(smtp_email, body.to_email, msg.as_string())
        await loop.run_in_executor(None, _send)
        return {"success": True, "message": f"Outreach email sent to {body.to_email}"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="Email authentication failed — check SMTP credentials.")
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=502, detail=f"SMTP error: {str(e)}")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ---- SEED HELPERS ----

async def _seed_user_campaigns(user_id: str):
    """Seed demo campaigns for a new user."""
    existing = await db.campaigns.count_documents({"user_id": user_id})
    if existing > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    demo_campaigns = [
        {
            "campaign_id": f"campaign_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": "Summer Glow Collection",
            "brand_name": "Lumina Beauty",
            "product_type": "Organic skincare and glow serums",
            "target_audience": "Women 25-35, health-conscious, interested in clean beauty",
            "campaign_goal": "Brand awareness and product trials",
            "budget_min": 5000.0, "budget_max": 15000.0,
            "platforms": ["Instagram", "TikTok"],
            "brand_tone": "Clean, natural, empowering",
            "stage": "Live",
            "selected_influencers": ["inf_006", "inf_016", "inf_003"],
            "ai_criteria": {"niche_keywords": ["skincare", "beauty", "wellness"], "follower_range": {"min": 50000, "max": 500000}, "min_engagement_rate": 5.0, "content_style": "authentic, educational"},
            "brief_content": None, "created_at": now, "updated_at": now
        },
        {
            "campaign_id": f"campaign_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": "TechGear Pro Q2",
            "brand_name": "NexTech",
            "product_type": "Wireless earbuds and smart accessories",
            "target_audience": "Tech enthusiasts 20-40, early adopters",
            "campaign_goal": "Product reviews and launch",
            "budget_min": 8000.0, "budget_max": 25000.0,
            "platforms": ["YouTube", "Instagram"],
            "brand_tone": "Technical, innovative, sleek",
            "stage": "Outreach",
            "selected_influencers": ["inf_002", "inf_012"],
            "ai_criteria": {"niche_keywords": ["tech", "gadgets", "audio"], "follower_range": {"min": 75000, "max": 300000}, "min_engagement_rate": 4.5, "content_style": "in-depth reviews, technical"},
            "brief_content": None, "created_at": now, "updated_at": now
        },
        {
            "campaign_id": f"campaign_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": "EcoEssentials Launch",
            "brand_name": "GreenRoot",
            "product_type": "Zero-waste home cleaning products",
            "target_audience": "Eco-conscious consumers 22-40",
            "campaign_goal": "Brand launch and awareness",
            "budget_min": 3000.0, "budget_max": 10000.0,
            "platforms": ["Instagram", "TikTok"],
            "brand_tone": "Earthy, authentic, mission-driven",
            "stage": "Brief",
            "selected_influencers": [],
            "ai_criteria": None,
            "brief_content": None, "created_at": now, "updated_at": now
        },
        {
            "campaign_id": f"campaign_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": "FitFuel Summer Push",
            "brand_name": "FitFuel",
            "product_type": "Plant-based protein supplements",
            "target_audience": "Fitness enthusiasts 18-35, active lifestyle",
            "campaign_goal": "Drive product trials and subscriptions",
            "budget_min": 6000.0, "budget_max": 20000.0,
            "platforms": ["TikTok", "Instagram"],
            "brand_tone": "Energetic, scientific, inclusive",
            "stage": "Content Review",
            "selected_influencers": ["inf_003", "inf_014", "inf_015"],
            "ai_criteria": {"niche_keywords": ["fitness", "nutrition", "protein"], "follower_range": {"min": 80000, "max": 400000}, "min_engagement_rate": 6.0, "content_style": "motivating, authentic"},
            "brief_content": None, "created_at": now, "updated_at": now
        }
    ]
    await db.campaigns.insert_many(demo_campaigns)

@api_router.post("/seed")
async def seed_demo_data():
    """Seed global influencer data."""
    existing = await db.influencers.count_documents({})
    if existing > 0:
        return {"message": "Already seeded", "influencers": existing}

    profile_pics = [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&q=85&w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1587403655231-b1734312903f?crop=entropy&cs=srgb&fm=jpg&q=85&w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1611082832745-efab49a266d4?crop=entropy&cs=srgb&fm=jpg&q=85&w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1759350075177-eeb89d507990?crop=entropy&cs=srgb&fm=jpg&q=85&w=400&h=400&fit=crop",
    ]

    influencers = [
        {"influencer_id": "inf_001", "name": "Emma Reynolds", "handle": "emmastyle", "platform": "Instagram", "followers": 145000, "engagement_rate": 5.2, "avg_views": 12000, "niche": "Fashion & Lifestyle", "location": "New York, USA", "bio": "Fashion enthusiast & lifestyle curator. Daily style inspiration and mindful living.", "profile_pic": profile_pics[0], "email": "emma@emmastyle.com", "recent_posts": ["Summer outfit hauls", "Sustainable fashion brands", "NYC style guide"], "past_brands": ["Zara", "H&M", "Revolve"], "fee_per_post": 1200.0},
        {"influencer_id": "inf_002", "name": "Marcus Chen", "handle": "techwithmarcus", "platform": "YouTube", "followers": 89000, "engagement_rate": 6.8, "avg_views": 45000, "niche": "Tech Reviews", "location": "San Francisco, USA", "bio": "Deep-dive tech reviews. No fluff. Just honest takes on the latest gadgets.", "profile_pic": profile_pics[1], "email": "marcus@techwithmarcus.com", "recent_posts": ["iPhone review", "Best budget laptops 2025", "AI tools comparison"], "past_brands": ["Anker", "Logitech", "NordVPN"], "fee_per_post": 1800.0},
        {"influencer_id": "inf_003", "name": "Priya Kapoor", "handle": "priyafitness", "platform": "TikTok", "followers": 234000, "engagement_rate": 8.4, "avg_views": 89000, "niche": "Fitness & Wellness", "location": "London, UK", "bio": "Certified PT. Making fitness accessible for everyone. Plant-based. Real progress.", "profile_pic": profile_pics[2], "email": "priya@priyafitness.co", "recent_posts": ["5-min morning routine", "Plant protein recipes", "Beginner HIIT workout"], "past_brands": ["MyProtein", "Gymshark", "Huel"], "fee_per_post": 2400.0},
        {"influencer_id": "inf_004", "name": "Jake Harrison", "handle": "sustainablejake", "platform": "Instagram", "followers": 67000, "engagement_rate": 7.1, "avg_views": 8500, "niche": "Eco & Sustainability", "location": "Portland, USA", "bio": "Zero-waste living. Climate activist. Proving sustainability is affordable.", "profile_pic": profile_pics[3], "email": "jake@sustainablejake.com", "recent_posts": ["Zero-waste kitchen swaps", "Sustainable brand spotlight", "Thrift flip lookbook"], "past_brands": ["Patagonia", "Pela Case", "Grove Collaborative"], "fee_per_post": 650.0},
        {"influencer_id": "inf_005", "name": "Sofia Martinez", "handle": "sofiafoodie", "platform": "Instagram", "followers": 178000, "engagement_rate": 6.3, "avg_views": 15000, "niche": "Food & Cooking", "location": "Miami, USA", "bio": "Food photographer & recipe developer. Restaurant-quality dishes at home.", "profile_pic": profile_pics[0], "email": "sofia@sofiafoodie.com", "recent_posts": ["Easy summer pasta", "Viral TikTok recipes tested", "Best Miami restaurants"], "past_brands": ["HelloFresh", "Rao's", "KitchenAid"], "fee_per_post": 1500.0},
        {"influencer_id": "inf_006", "name": "Natalie Woods", "handle": "beautybynatalie", "platform": "TikTok", "followers": 312000, "engagement_rate": 9.2, "avg_views": 124000, "niche": "Beauty & Skincare", "location": "Los Angeles, USA", "bio": "Skincare obsessed. Honest reviews, tutorials & routines. No paid reviews without disclosure.", "profile_pic": profile_pics[1], "email": "natalie@beautybynatalie.com", "recent_posts": ["Get ready with me", "Skincare routine for oily skin", "Drugstore vs high-end test"], "past_brands": ["Cetaphil", "The Ordinary", "e.l.f"], "fee_per_post": 3200.0},
        {"influencer_id": "inf_007", "name": "Tyler Brooks", "handle": "traveltales", "platform": "YouTube", "followers": 156000, "engagement_rate": 5.9, "avg_views": 67000, "niche": "Travel", "location": "Austin, USA", "bio": "Budget travel. 60+ countries. Solo adventures & hidden gems only.", "profile_pic": profile_pics[2], "email": "tyler@traveltales.co", "recent_posts": ["$50/day in Tokyo", "Southeast Asia solo guide", "Hidden gems in Portugal"], "past_brands": ["Booking.com", "Away", "Airbnb"], "fee_per_post": 2100.0},
        {"influencer_id": "inf_008", "name": "Julia Kim", "handle": "homecooking_julia", "platform": "Instagram", "followers": 98000, "engagement_rate": 7.6, "avg_views": 10000, "niche": "Home Cooking", "location": "Seattle, USA", "bio": "Korean-American food blogger. Bringing comfort food traditions into modern kitchens.", "profile_pic": profile_pics[3], "email": "julia@homecookingjulia.com", "recent_posts": ["Easy bibimbap recipe", "Korean pantry essentials", "Meal prep Sunday"], "past_brands": ["Kikkoman", "OXO", "Le Creuset"], "fee_per_post": 950.0},
        {"influencer_id": "inf_009", "name": "Leo Fernandez", "handle": "financewithleo", "platform": "TikTok", "followers": 445000, "engagement_rate": 7.8, "avg_views": 178000, "niche": "Personal Finance", "location": "Chicago, USA", "bio": "Making money boring (but effective). Personal finance for millennials.", "profile_pic": profile_pics[0], "email": "leo@financewithleo.com", "recent_posts": ["How to start investing $100", "Side hustles that work", "Credit score improvement"], "past_brands": ["Robinhood", "Credit Karma", "Acorns"], "fee_per_post": 4200.0},
        {"influencer_id": "inf_010", "name": "Rachel Green", "handle": "mindfulrachel", "platform": "Instagram", "followers": 76000, "engagement_rate": 8.9, "avg_views": 9000, "niche": "Mental Health & Wellness", "location": "Denver, USA", "bio": "Licensed therapist. Anxiety & burnout recovery. Making mental health conversation normal.", "profile_pic": profile_pics[1], "email": "rachel@mindfulrachel.com", "recent_posts": ["Anxiety management tips", "Signs of burnout", "Self-care Sunday routines"], "past_brands": ["Calm", "Headspace", "BetterHelp"], "fee_per_post": 780.0},
        {"influencer_id": "inf_011", "name": "Danielle White", "handle": "fashionforward_d", "platform": "TikTok", "followers": 387000, "engagement_rate": 8.1, "avg_views": 145000, "niche": "Fashion", "location": "Paris, France", "bio": "Personal stylist turned content creator. French-inspired everyday style.", "profile_pic": profile_pics[2], "email": "danielle@fashionforward.fr", "recent_posts": ["Capsule wardrobe 2025", "Parisian chic on a budget", "How to style basics"], "past_brands": ["ASOS", "Sézane", "Vestiaire Collective"], "fee_per_post": 3800.0},
        {"influencer_id": "inf_012", "name": "Chris Kumar", "handle": "christechreviews", "platform": "YouTube", "followers": 134000, "engagement_rate": 5.4, "avg_views": 52000, "niche": "Tech & Gadgets", "location": "Toronto, Canada", "bio": "Unboxing & reviewing every gadget so you don't have to. 4K, honest, nerdy.", "profile_pic": profile_pics[3], "email": "chris@christechreviews.ca", "recent_posts": ["Samsung Galaxy S25 review", "Best earbuds under $100", "Smart home setup guide"], "past_brands": ["Samsung", "Sony", "Bose"], "fee_per_post": 1900.0},
        {"influencer_id": "inf_013", "name": "Maya Johnson", "handle": "mayaphotography", "platform": "Instagram", "followers": 112000, "engagement_rate": 6.7, "avg_views": 11000, "niche": "Photography & Art", "location": "Brooklyn, USA", "bio": "Documentary photographer. Teaching you to see the extraordinary in ordinary.", "profile_pic": profile_pics[0], "email": "maya@mayajohnsonphoto.com", "recent_posts": ["Film photography guide", "Best cameras for beginners", "Brooklyn street photography"], "past_brands": ["Canon", "Lightroom", "Artifact Uprising"], "fee_per_post": 1100.0},
        {"influencer_id": "inf_014", "name": "Ethan Liu", "handle": "ethanrunning", "platform": "TikTok", "followers": 267000, "engagement_rate": 9.6, "avg_views": 112000, "niche": "Running & Fitness", "location": "Boston, USA", "bio": "Marathon runner. Running coach. Turning beginners into finishers. Sub-3hr marathoner.", "profile_pic": profile_pics[1], "email": "ethan@ethanrunning.com", "recent_posts": ["Training plan for first 5K", "Best running shoes 2025", "Marathon race day tips"], "past_brands": ["Nike", "Garmin", "GU Energy"], "fee_per_post": 2600.0},
        {"influencer_id": "inf_015", "name": "Isabella Brown", "handle": "vegancooking", "platform": "Instagram", "followers": 93000, "engagement_rate": 8.2, "avg_views": 10500, "niche": "Vegan & Plant-Based", "location": "Melbourne, Australia", "bio": "Plant-based chef. Proving vegan food is anything but boring. 500+ original recipes.", "profile_pic": profile_pics[2], "email": "isabella@vegancooking.au", "recent_posts": ["High-protein vegan meals", "Vegan cheese making", "30-min plant-based dinners"], "past_brands": ["Oatly", "Beyond Meat", "Vitamix"], "fee_per_post": 920.0},
        {"influencer_id": "inf_016", "name": "Chloe Davis", "handle": "chloebeauty", "platform": "TikTok", "followers": 521000, "engagement_rate": 10.1, "avg_views": 210000, "niche": "Beauty & Makeup", "location": "Nashville, USA", "bio": "Makeup artist & educator. Making beauty inclusive for all skin tones. BIPOC beauty advocate.", "profile_pic": profile_pics[3], "email": "chloe@chloebeauty.com", "recent_posts": ["Full glam on dark skin", "Drugstore gems 2025", "No-foundation tutorial"], "past_brands": ["Fenty Beauty", "MAC", "Morphe"], "fee_per_post": 5200.0},
        {"influencer_id": "inf_017", "name": "Ryan Park", "handle": "ryanlifestyle", "platform": "Instagram", "followers": 167000, "engagement_rate": 6.1, "avg_views": 14500, "niche": "Lifestyle & Motivation", "location": "San Diego, USA", "bio": "Entrepreneur. Fitness. Mental health advocate. Building a better version every day.", "profile_pic": profile_pics[0], "email": "ryan@ryanpark.co", "recent_posts": ["Morning routine for entrepreneurs", "How I stay motivated", "Investment in yourself"], "past_brands": ["Athletic Greens", "MVMT Watches", "Whoop"], "fee_per_post": 1650.0},
        {"influencer_id": "inf_018", "name": "Ashley Morgan", "handle": "momlifeblog", "platform": "Instagram", "followers": 89000, "engagement_rate": 7.4, "avg_views": 9200, "niche": "Parenting & Family", "location": "Atlanta, USA", "bio": "Mom of 3. Real talk about motherhood without filters.", "profile_pic": profile_pics[1], "email": "ashley@momlifeblog.com", "recent_posts": ["School lunch ideas", "Family budget tips", "Toddler activity ideas"], "past_brands": ["Target", "Honest Company", "KiwiCo"], "fee_per_post": 870.0},
        {"influencer_id": "inf_019", "name": "Noah Taylor", "handle": "musicwithnoah", "platform": "YouTube", "followers": 178000, "engagement_rate": 7.3, "avg_views": 78000, "niche": "Music & Entertainment", "location": "Nashville, USA", "bio": "Indie singer-songwriter. Music producer. Teaching music theory to 500K+ students.", "profile_pic": profile_pics[2], "email": "noah@musicwithnoah.com", "recent_posts": ["Music theory for beginners", "Home studio setup 2025", "Behind the scenes recording"], "past_brands": ["Fender", "Focusrite", "Spotify"], "fee_per_post": 1700.0},
        {"influencer_id": "inf_020", "name": "Zack Peterson", "handle": "gamingwithzack", "platform": "YouTube", "followers": 203000, "engagement_rate": 8.7, "avg_views": 87000, "niche": "Gaming", "location": "Minneapolis, USA", "bio": "Variety streamer. Story-driven RPGs, indie darlings & the occasional rage-quit.", "profile_pic": profile_pics[3], "email": "zack@gamingwithzack.com", "recent_posts": ["Best RPGs 2025", "Gaming setup under $500", "Baldur's Gate 3 review"], "past_brands": ["Razer", "SteelSeries", "G Fuel"], "fee_per_post": 2000.0},
    ]
    await db.influencers.insert_many(influencers)

    messages = [
        {"message_id": "msg_demo_001", "campaign_id": None, "influencer_id": "inf_006", "influencer_name": "Natalie Woods", "platform": "Instagram DM", "content": "Hi! I love the Lumina Beauty concept. I'd be thrilled to collaborate! Can you share more details about the campaign brief?", "direction": "inbound", "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(), "is_read": False},
        {"message_id": "msg_demo_002", "campaign_id": None, "influencer_id": "inf_002", "influencer_name": "Marcus Chen", "platform": "Email", "content": "Thanks for reaching out about NexTech! The product sounds interesting. What's the timeline and are we looking at long-form or shorts?", "direction": "inbound", "timestamp": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(), "is_read": False},
        {"message_id": "msg_demo_003", "campaign_id": None, "influencer_id": "inf_016", "influencer_name": "Chloe Davis", "platform": "Instagram DM", "content": "Just received the products! Starting to film content this weekend. Can we hop on a quick call to align on key messaging?", "direction": "inbound", "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(), "is_read": True},
        {"message_id": "msg_demo_004", "campaign_id": None, "influencer_id": "inf_003", "influencer_name": "Priya Kapoor", "platform": "Email", "content": "Content is ready for review! I've done a 60-second taste test reel and a comparison carousel. Let me know if any edits needed.", "direction": "inbound", "timestamp": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(), "is_read": True},
        {"message_id": "msg_demo_005", "campaign_id": None, "influencer_id": "inf_014", "influencer_name": "Ethan Liu", "platform": "TikTok DM", "content": "Loved the brief! My audience is super aligned with plant-based nutrition. I can have first draft content ready within 5 days of approval.", "direction": "inbound", "timestamp": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(), "is_read": True},
    ]
    existing_msgs = await db.messages.count_documents({})
    if existing_msgs == 0:
        await db.messages.insert_many(messages)

    return {"message": "Seeded successfully", "influencers": len(influencers), "messages": len(messages)}

# ---- STARTUP ----

@app.on_event("startup")
async def startup_event():
    # Auto-seed influencers on startup
    existing = await db.influencers.count_documents({})
    if existing == 0:
        logger.info("Auto-seeding influencer data...")
        await seed_demo_data()

# ---- APP SETUP ----

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
