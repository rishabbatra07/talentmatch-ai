import os
import sys
import datetime

# Ensure current server directory is on sys.path for cloud deployment runners (Render, Railway, etc.)
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from segmenter import segment_resume, segment_job_description
from embeddings import vector_store, compute_semantic_vector, EMBEDDING_DIM
from matcher import match_job_against_candidates, seed_sample_candidates, semantic_rag_candidate_search

app = FastAPI(
    title="TalentMatch AI — Segment-Wise RAG Platform",
    description="Resume segmentation, multi-vector embeddings, ATS pipeline, and recruiter-to-candidate semantic matching."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to seed candidates
@app.on_event("startup")
def on_startup():
    seed_sample_candidates()
    print("🚀 Seeded initial candidate segment vectors into Pinecone-compatible store.")

# Request models
class ResumeTextRequest(BaseModel):
    raw_text: str

class IngestSegmentedResumeRequest(BaseModel):
    candidate_id: Optional[str] = None
    name: str
    email: str
    phone: str
    years_of_experience: int
    location: str
    notice_days: int
    segments: Dict[str, str]

class MatchRequest(BaseModel):
    job_description: str
    required_skills: str
    responsibilities: str
    skill_weight: float = 0.5
    exp_weight: float = 0.35
    edu_weight: float = 0.15
    max_notice_days: Optional[int] = None

class RagSearchRequest(BaseModel):
    query: str
    top_k: int = 10

class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class CreateJobRequest(BaseModel):
    title: str
    location: str
    min_experience: int
    required_skills: str
    responsibilities: str
    description: str
    salary_range: Optional[str] = "₹18 LPA - ₹30 LPA"
    max_notice_days: Optional[int] = 45

class DispatchNotificationRequest(BaseModel):
    candidate_id: str
    candidate_name: str
    channel: str # 'WHATSAPP' | 'EMAIL'
    template_type: str # 'INTERVIEW_INVITE' | 'OFFER_LETTER' | 'SHORTLIST_ALERT' | 'REJECTION'
    recipient: str # phone number or email
    job_title: str
    custom_message: Optional[str] = None

class DownloadResumeRequest(BaseModel):
    candidate_id: str

# In-Memory Store for Jobs
active_jobs: List[Dict[str, Any]] = [
    {
        "id": "job_fullstack",
        "title": "Lead Full Stack Engineer (React + FastAPI + AI)",
        "location": "Bengaluru (Hybrid)",
        "min_experience": 5,
        "required_skills": "React, TypeScript, Python, FastAPI, Microservices, PostgreSQL, Vector Search, Pinecone, Docker",
        "responsibilities": "Lead architecture of AI search features, build responsive real-time dashboards with React memoization, optimize API latency under 50ms, mentor engineering team.",
        "description": "Looking for a seasoned Full Stack Engineer with strong React and Python/FastAPI skills to spearhead our AI intelligence platform.",
        "salary_range": "₹28 LPA - ₹40 LPA",
        "max_notice_days": 30,
        "posted_at": "2026-10-24"
    },
    {
        "id": "job_backend_architect",
        "title": "Principal Backend & Distributed Systems Architect",
        "location": "Hyderabad / Remote",
        "min_experience": 7,
        "required_skills": "Java 17, Spring Boot, Spring AI, Apache Kafka, Event-driven architecture, PostgreSQL, pgvector, Kubernetes, High Throughput TPS",
        "responsibilities": "Architect high-throughput transactional engines, scale distributed message brokers with Kafka, integrate vector similarity search for real-time anomaly detection.",
        "description": "Enterprise FinTech seeking a Principal Backend Architect to design scalable, zero-downtime microservices handling 20,000+ transactions per second.",
        "salary_range": "₹38 LPA - ₹55 LPA",
        "max_notice_days": 45,
        "posted_at": "2026-10-20"
    },
    {
        "id": "job_frontend_lead",
        "title": "Senior Frontend Engineer (React Design Systems)",
        "location": "Pune / Bengaluru",
        "min_experience": 4,
        "required_skills": "React 18, Next.js, TypeScript, CSS Architecture, Design Tokens, Webpack/Vite, UI Performance Optimization, useMemo, Responsive UX",
        "responsibilities": "Own our core design system, optimize frontend render cycles and cumulative layout shift, deliver 60fps micro-animations, collaborate directly with product and design.",
        "description": "Seeking an exceptional UI/UX and Frontend Specialist to craft state-of-the-art interactive dashboards and accessible web applications.",
        "salary_range": "₹20 LPA - ₹32 LPA",
        "max_notice_days": 15,
        "posted_at": "2026-10-27"
    }
]

# In-Memory Store for Dispatched Notifications
notification_logs: List[Dict[str, Any]] = [
    {
        "id": "notif_init_1",
        "timestamp": "2026-10-31 16:30",
        "candidate_id": "cand_kavya_nambiar",
        "candidate_name": "Kavya Nambiar",
        "channel": "WHATSAPP",
        "recipient": "+91 99001 55667",
        "job_title": "Senior Frontend Engineer",
        "status": "DELIVERED_READ",
        "message": "Hi Kavya! TalentMatch AI has shortlisted your profile for the Senior Frontend Engineer role. Please select your preferred interview slot: https://talentmatch.ai/meet/kavya"
    },
    {
        "id": "notif_init_2",
        "timestamp": "2026-11-01 09:15",
        "candidate_id": "cand_rohan_sharma",
        "candidate_name": "Rohan Sharma",
        "channel": "EMAIL",
        "recipient": "rohan.sharma@cloudops.net",
        "job_title": "Lead DevOps Engineer",
        "status": "DELIVERED",
        "message": "Dear Rohan, Congratulations! We are thrilled to extend a formal offer letter for the Lead DevOps Engineer position. Please review the attached contract package."
    }
]

# Recruiter Account & Quota State
recruiter_quota = {
    "plan_name": "Growth Tier (Pro)",
    "plan_price_monthly_inr": 24999,
    "plan_price_monthly_usd": 299,
    "active_jobs_limit": 25,
    "resume_downloads_limit": 1000,
    "resume_downloads_used": 14,
    "whatsapp_credits_limit": 500,
    "whatsapp_credits_remaining": 418,
    "downloaded_candidate_ids": ["cand_aditi_sen", "cand_kavya_nambiar"]
}

# ----------------- Core API Endpoints -----------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "vector_dimension": EMBEDDING_DIM,
        "indexed_vectors": len(vector_store.vectors)
    }

@app.post("/api/resume/segment")
def segment_resume_endpoint(req: ResumeTextRequest):
    if not req.raw_text or not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    parsed = segment_resume(req.raw_text)
    return parsed

@app.post("/api/resume/embed-and-save")
def embed_and_save_endpoint(req: IngestSegmentedResumeRequest):
    cid = req.candidate_id or f"cand_{req.name.lower().replace(' ', '_')}"
    vectors_to_upsert = []
    vector_stats = {}

    for segment_name, segment_content in req.segments.items():
        if not segment_content or not segment_content.strip():
            continue

        vec = compute_semantic_vector(segment_content)
        vec_id = f"{cid}#{segment_name.lower()}"

        vectors_to_upsert.append({
            "id": vec_id,
            "values": vec,
            "metadata": {
                "candidate_id": cid,
                "name": req.name,
                "email": req.email,
                "phone": req.phone,
                "years_of_experience": req.years_of_experience,
                "location": req.location,
                "notice_days": req.notice_days,
                "status": "APPLIED",
                "segment": segment_name.upper(),
                "text": segment_content
            }
        })

        vector_stats[segment_name] = {
            "vector_id": vec_id,
            "dimension": len(vec),
            "sample_dimensions": [round(v, 4) for v in vec[:8]],
            "token_count": len(segment_content.split())
        }

    count = vector_store.upsert(vectors_to_upsert)

    return {
        "status": "success",
        "candidate_id": cid,
        "upserted_vectors_count": count,
        "vector_stats": vector_stats
    }

@app.get("/api/candidates")
def get_candidates():
    candidates = vector_store.all_candidates()
    return candidates

@app.post("/api/match")
def match_job(req: MatchRequest):
    matches = match_job_against_candidates(
        job_description=req.job_description,
        required_skills=req.required_skills,
        responsibilities=req.responsibilities,
        skill_weight=req.skill_weight,
        exp_weight=req.exp_weight,
        edu_weight=req.edu_weight,
        max_notice_days=req.max_notice_days
    )
    return matches

@app.post("/api/rag/search")
def rag_search_endpoint(req: RagSearchRequest):
    """
    Recruiter Natural Language RAG Query:
    Searches candidate vectors using free-form natural language intent.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    return semantic_rag_candidate_search(req.query, top_k=req.top_k)

# ----------------- ATS Pipeline Endpoints -----------------

@app.get("/api/ats/pipeline")
def get_ats_pipeline():
    """
    Returns candidates categorized by ATS stages:
    APPLIED, SHORTLISTED, INTERVIEWING, OFFER_EXTENDED, REJECTED
    """
    candidates = vector_store.all_candidates()
    stages = {
        "APPLIED": [],
        "SHORTLISTED": [],
        "INTERVIEWING": [],
        "OFFER_EXTENDED": [],
        "REJECTED": []
    }
    for c in candidates:
        st = c.get("status", "APPLIED")
        if st not in stages:
            stages[st] = []
        stages[st].append(c)

    return {
        "stages": stages,
        "total_active_candidates": len(candidates),
        "stage_counts": {k: len(v) for k, v in stages.items()}
    }

@app.patch("/api/candidates/{candidate_id}/status")
@app.post("/api/ats/stage-update")
def update_candidate_status(candidate_id: str, req: StatusUpdateRequest):
    valid_statuses = ["APPLIED", "SHORTLISTED", "INTERVIEWING", "OFFER_EXTENDED", "REJECTED"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    
    success = vector_store.update_status(candidate_id, req.status)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "status": "success",
        "candidate_id": candidate_id,
        "new_status": req.status,
        "notes": req.notes
    }

# ----------------- Job Management Endpoints -----------------

@app.get("/api/jobs")
@app.get("/api/jobs/seed")
def list_jobs():
    return active_jobs

@app.post("/api/jobs/create")
def create_job(req: CreateJobRequest):
    if len(active_jobs) >= recruiter_quota["active_jobs_limit"]:
        raise HTTPException(
            status_code=403,
            detail=f"Active job posting limit reached ({recruiter_quota['active_jobs_limit']}). Please upgrade your plan."
        )

    job_id = f"job_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    new_job = {
        "id": job_id,
        "title": req.title,
        "location": req.location,
        "min_experience": req.min_experience,
        "required_skills": req.required_skills,
        "responsibilities": req.responsibilities,
        "description": req.description,
        "salary_range": req.salary_range,
        "max_notice_days": req.max_notice_days,
        "posted_at": datetime.date.today().isoformat()
    }
    active_jobs.insert(0, new_job)
    return {"status": "success", "job": new_job, "total_active_jobs": len(active_jobs)}

# ----------------- Subscription & Commercials Endpoints -----------------

@app.get("/api/subscription/overview")
def get_subscription_overview():
    """
    Returns full commercial breakdown addressing all 11 client requirements:
    Subscription tiers, active jobs, resume download limits, WhatsApp credits,
    customization charges, and annual maintenance fees.
    """
    plans = [
        {
            "id": "starter",
            "name": "Starter Plan",
            "price_inr": "₹7,999 / mo",
            "price_usd": "$99 / mo",
            "billing_interval": "Billed monthly or ₹79,990 / yr",
            "active_jobs_allowed": 5,
            "resume_database_downloads": "100 / mo",
            "search_features": "Keyword & Boolean Search, Basic Filter",
            "recruiter_logins": 2,
            "whatsapp_notifications": "Add-on pack (₹0.48 / alert)",
            "email_notifications": "1,000 automated emails / mo",
            "ats_kanban": "Basic 3-Stage Pipeline",
            "support": "Email Support (24-48 hr SLA)",
            "is_popular": False
        },
        {
            "id": "growth",
            "name": "Growth / Pro Plan",
            "price_inr": "₹24,999 / mo",
            "price_usd": "$299 / mo",
            "billing_interval": "Billed monthly or ₹2,49,990 / yr (Save 17%)",
            "active_jobs_allowed": 25,
            "resume_database_downloads": "1,000 / mo",
            "search_features": "RAG 1536-D Semantic Vector Search, Segment Weight Sliders, Fit Dossiers",
            "recruiter_logins": 10,
            "whatsapp_notifications": "500 WhatsApp Messages included / mo",
            "email_notifications": "Unlimited automated emails",
            "ats_kanban": "Full 5-Stage Kanban with One-Click Progression",
            "support": "Priority WhatsApp & Phone Support (4 hr SLA)",
            "is_popular": True
        },
        {
            "id": "enterprise",
            "name": "Enterprise Custom",
            "price_inr": "₹59,999 / mo",
            "price_usd": "$799 / mo",
            "billing_interval": "Custom annual agreement",
            "active_jobs_allowed": "Unlimited",
            "resume_database_downloads": "Unlimited Views & Downloads",
            "search_features": "Custom Fine-Tuned Vector Models, Multi-Branch Taxonomy, Cross-Match RAG",
            "recruiter_logins": "Unlimited (SSO & Role-Based Access Control)",
            "whatsapp_notifications": "Dedicated Official WhatsApp Business API Gateway",
            "email_notifications": "Unlimited with Custom Domain White-labeling",
            "ats_kanban": "Custom Stage Workflows + Webhooks into Workday / BambooHR",
            "support": "Dedicated Account Manager & 99.95% Uptime SLA",
            "is_popular": False
        }
    ]

    commercial_add_ons = [
        {
            "item": "One-Time Portal Setup & Brand Customization",
            "description": "Custom logo, corporate domain setup, company theme styling, candidate portal white-labeling.",
            "charge_inr": "₹45,000 one-time",
            "charge_usd": "$550 one-time"
        },
        {
            "item": "Annual Maintenance & Upgrades (AMC)",
            "description": "Regular security patches, vector model retraining, server health monitoring, priority bug fixes.",
            "charge_inr": "18% of annual software license value per year",
            "charge_usd": "18% / year"
        },
        {
            "item": "WhatsApp Messaging Credit Packs",
            "description": "Prepaid conversational & template WhatsApp message bundles directly to candidate phones.",
            "charge_inr": "₹2,400 per 5,000 messages (₹0.48 / msg)",
            "charge_usd": "$30 per 5,000 messages"
        }
    ]

    return {
        "current_quota": {
            **recruiter_quota,
            "active_jobs_posted": len(active_jobs),
            "jobs_remaining": recruiter_quota["active_jobs_limit"] - len(active_jobs),
            "downloads_remaining": recruiter_quota["resume_downloads_limit"] - recruiter_quota["resume_downloads_used"]
        },
        "plans": plans,
        "commercial_add_ons": commercial_add_ons
    }

@app.post("/api/subscription/download-resume")
def download_candidate_resume(req: DownloadResumeRequest):
    """
    Tracks and decrements recruiter resume download quota.
    """
    cid = req.candidate_id
    if cid not in recruiter_quota["downloaded_candidate_ids"]:
        if recruiter_quota["resume_downloads_used"] >= recruiter_quota["resume_downloads_limit"]:
            raise HTTPException(status_code=403, detail="Monthly resume download limit reached. Please upgrade quota.")
        recruiter_quota["resume_downloads_used"] += 1
        recruiter_quota["downloaded_candidate_ids"].append(cid)

    # Find candidate data
    candidates = vector_store.all_candidates()
    cand = next((c for c in candidates if c["candidate_id"] == cid), None)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {
        "status": "success",
        "candidate": cand,
        "quota_remaining": recruiter_quota["resume_downloads_limit"] - recruiter_quota["resume_downloads_used"],
        "download_url": f"/api/resumes/{cid}.pdf"
    }

# ----------------- WhatsApp & Email Alerts Endpoints -----------------

@app.post("/api/notifications/dispatch")
def dispatch_notification(req: DispatchNotificationRequest):
    """
    Dispatches automated WhatsApp or Email alert to candidate.
    """
    if req.channel == "WHATSAPP":
        if recruiter_quota["whatsapp_credits_remaining"] <= 0:
            raise HTTPException(status_code=403, detail="WhatsApp messaging credits exhausted. Please top up.")
        recruiter_quota["whatsapp_credits_remaining"] -= 1

    notif_id = f"notif_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Message composition
    if req.custom_message:
        message_body = req.custom_message
    elif req.template_type == "INTERVIEW_INVITE":
        message_body = f"Hello {req.candidate_name}, you have been selected for an interview for the {req.job_title} position. Please select a time slot here: https://talentmatch.ai/interview-slot"
    elif req.template_type == "OFFER_LETTER":
        message_body = f"Congratulations {req.candidate_name}! TalentMatch AI is pleased to extend an offer for {req.job_title}. Access your offer package: https://talentmatch.ai/offer-letter"
    elif req.template_type == "SHORTLIST_ALERT":
        message_body = f"Dear {req.candidate_name}, your profile has been successfully AI-shortlisted for {req.job_title}."
    else:
        message_body = f"Update regarding your application for {req.job_title}."

    log_entry = {
        "id": notif_id,
        "timestamp": timestamp,
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "channel": req.channel,
        "recipient": req.recipient,
        "job_title": req.job_title,
        "status": "DELIVERED_READ" if req.channel == "WHATSAPP" else "DELIVERED",
        "message": message_body
    }
    notification_logs.insert(0, log_entry)

    return {
        "status": "success",
        "notification": log_entry,
        "whatsapp_credits_remaining": recruiter_quota["whatsapp_credits_remaining"]
    }

@app.get("/api/notifications/history")
def get_notification_history():
    return {
        "logs": notification_logs,
        "total_dispatched": len(notification_logs)
    }

# ----------------- Static Frontend Mount -----------------
# Serve the compiled React SPA if dist/ exists
client_dist = os.path.join(os.path.dirname(__file__), "..", "client", "dist")
if os.path.exists(client_dist):
    app.mount("/", StaticFiles(directory=client_dist, html=True), name="static")
