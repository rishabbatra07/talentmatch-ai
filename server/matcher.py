from typing import List, Dict, Any, Optional
from embeddings import vector_store, compute_semantic_vector

def match_job_against_candidates(
    job_description: str,
    required_skills: str,
    responsibilities: str,
    skill_weight: float = 0.5,
    exp_weight: float = 0.35,
    edu_weight: float = 0.15,
    max_notice_days: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Segment-wise Multi-Vector Match:
    1. Embeds required_skills -> queries 'SKILLS' segment in vector store.
    2. Embeds responsibilities -> queries 'EXPERIENCE' segment in vector store.
    3. Combines scores using recruiter weights.
    4. Generates an AI Candidate Fit Dossier (strengths, gaps, interview questions).
    """
    # 1. Embed Job Segments
    skill_query_vec = compute_semantic_vector(required_skills)
    exp_query_vec = compute_semantic_vector(responsibilities)

    # 2. Query Pinecone-compatible store for each segment
    filter_skill = {"segment": "SKILLS"}
    filter_exp = {"segment": "EXPERIENCE"}
    if max_notice_days:
        filter_skill["notice_days"] = {"$lte": max_notice_days}

    skill_matches = vector_store.query(skill_query_vec, top_k=50, filter_dict=filter_skill)
    exp_matches = vector_store.query(exp_query_vec, top_k=50, filter_dict=filter_exp)

    # Map candidate_id -> segment scores
    candidate_scores: Dict[str, Dict[str, Any]] = {}

    for sm in skill_matches:
        cid = sm["metadata"]["candidate_id"]
        if cid not in candidate_scores:
            candidate_scores[cid] = {
                "candidate_id": cid,
                "name": sm["metadata"].get("name", "Unknown"),
                "years_of_experience": sm["metadata"].get("years_of_experience", 0),
                "location": sm["metadata"].get("location", "Unknown"),
                "notice_days": sm["metadata"].get("notice_days", 30),
                "status": sm["metadata"].get("status", "APPLIED"),
                "skills_text": sm["metadata"].get("text", ""),
                "skill_score": round(sm["score"] * 100, 1),
                "exp_score": 50.0,
                "edu_score": 75.0,
                "exp_text": ""
            }
        else:
            candidate_scores[cid]["skill_score"] = round(sm["score"] * 100, 1)

    for em in exp_matches:
        cid = em["metadata"]["candidate_id"]
        if cid in candidate_scores:
            candidate_scores[cid]["exp_score"] = round(em["score"] * 100, 1)
            candidate_scores[cid]["exp_text"] = em["metadata"].get("text", "")
        else:
            candidate_scores[cid] = {
                "candidate_id": cid,
                "name": em["metadata"].get("name", "Unknown"),
                "years_of_experience": em["metadata"].get("years_of_experience", 0),
                "location": em["metadata"].get("location", "Unknown"),
                "notice_days": em["metadata"].get("notice_days", 30),
                "status": em["metadata"].get("status", "APPLIED"),
                "skills_text": "",
                "skill_score": 50.0,
                "exp_score": round(em["score"] * 100, 1),
                "edu_score": 75.0,
                "exp_text": em["metadata"].get("text", "")
            }

    # Normalize weights so they sum to 1.0
    total_w = skill_weight + exp_weight + edu_weight
    if total_w < 1e-6:
        total_w = 1.0
    w_skill = skill_weight / total_w
    w_exp = exp_weight / total_w
    w_edu = edu_weight / total_w

    ranked = []
    for cid, data in candidate_scores.items():
        # Dynamic overall weighted score
        final_score = round(
            (data["skill_score"] * w_skill) +
            (data["exp_score"] * w_exp) +
            (data["edu_score"] * w_edu),
            1
        )

        dossier = generate_candidate_dossier(data, required_skills, responsibilities)

        ranked.append({
            "candidate_id": cid,
            "name": data["name"],
            "years_of_experience": data["years_of_experience"],
            "location": data["location"],
            "notice_days": data["notice_days"],
            "status": data["status"],
            "match_percentage": final_score,
            "breakdown": {
                "skill_score": data["skill_score"],
                "exp_score": data["exp_score"],
                "edu_score": data["edu_score"],
            },
            "dossier": dossier
        })

    # Sort descending by match percentage
    ranked.sort(key=lambda x: x["match_percentage"], reverse=True)
    return ranked

def generate_candidate_dossier(candidate: Dict[str, Any], required_skills: str, responsibilities: str) -> Dict[str, Any]:
    """
    Grounded evaluation synthesizing strengths, gaps, and targeted technical interview questions.
    """
    skills_text = candidate.get("skills_text", "").lower()
    exp_text = candidate.get("exp_text", "").lower()
    name = candidate.get("name", "Candidate")
    exp_years = candidate.get("years_of_experience", 0)

    strengths = []
    gaps = []
    questions = []

    # Detect skills overlap
    keywords = ["python", "fastapi", "react", "java", "spring boot", "postgresql", "docker", "kubernetes", "aws", "pinecone", "redis", "kafka", "graphql", "typescript", "microservices"]
    matched_skills = [kw for kw in keywords if kw in skills_text]

    if matched_skills:
        strengths.append(f"Demonstrated core proficiency in {', '.join(matched_skills[:4])}.")
    if exp_years >= 5:
        strengths.append(f"Strong industry seniority ({exp_years}+ years) capable of leading architecture.")
    else:
        strengths.append("High hands-on agility and modern stack execution.")

    if "distributed" in exp_text or "scale" in exp_text or "microservices" in exp_text:
        strengths.append("Direct hands-on experience designing high-throughput distributed systems.")

    # Check potential gaps against job
    if "cloud" in required_skills.lower() and not any(c in skills_text for c in ["aws", "azure", "gcp", "docker"]):
        gaps.append("Limited documented cloud infrastructure or container orchestration experience.")
    if "kafka" in required_skills.lower() and "kafka" not in skills_text:
        gaps.append("Job emphasizes event-driven streaming (Kafka), not explicitly verified in resume.")
    if exp_years < 3 and "senior" in required_skills.lower():
        gaps.append(f"Years of experience ({exp_years} yrs) is below standard Senior benchmark.")

    if not gaps:
        gaps.append("No immediate technical blockers identified; verify scale and deployment ownership.")

    # Targeted technical interview questions
    if "fastapi" in matched_skills or "python" in matched_skills:
        questions.append("Can you walk through how you manage asynchronous event loops and thread pooling in FastAPI under concurrent I/O pressure?")
    elif "react" in matched_skills:
        questions.append("How do you prevent referential inequality re-renders when passing complex objects through nested hooks in React?")
    else:
        questions.append("What architectural trade-offs have you made when refactoring monolithic endpoints into decoupled services?")

    if "pinecone" in matched_skills or "vector" in matched_skills or "ai" in matched_skills:
        questions.append("How do you handle vector drift and index latency when performing real-time approximate nearest neighbor (ANN) search at scale?")
    else:
        questions.append(f"How did you monitor latency, error budgets, and database connection pooling in your past production apps?")

    return {
        "key_strengths": strengths[:3],
        "potential_gaps": gaps[:2],
        "suggested_questions": questions[:2]
    }

def seed_sample_candidates():
    """
    Populates vector store with 3 rich candidate profiles across distinct tech domains.
    """
    from segmenter import segment_resume
    from embeddings import compute_semantic_vector

    sample_resumes = [
        """
        Aditi Sen
        aditi.sen@gmail.com | +91 98450 11223 | Bengaluru, India | 15 days notice
        Senior Full Stack Engineer with 6 years of experience building resilient microservices and reactive web applications.
        
        TECHNICAL SKILLS:
        Languages & Frameworks: React, TypeScript, Python, FastAPI, Node.js, GraphQL
        Databases & Storage: PostgreSQL, Redis, MongoDB, Pinecone Vector DB
        DevOps & Cloud: Docker, Kubernetes, AWS (ECS, S3, RDS, Lambda), GitHub Actions, CI/CD
        Architecture: REST API design, Microservices, Event-driven architecture, RAG pipelines
        
        PROFESSIONAL EXPERIENCE:
        Lead Frontend & Backend Engineer | CloudScale Systems (2021 - Present)
        - Architected an AI-powered enterprise search tool utilizing FastAPI, React, and Pinecone vector store, reducing search latency by 45%.
        - Designed custom React dashboard with memoized virtualized lists rendering 50,000+ data rows at 60fps.
        - Deployed scalable Docker containers on AWS EKS serving 2M+ monthly active API requests.
        
        Software Engineer | DataWeave Labs (2018 - 2021)
        - Developed RESTful microservices in Python and Node.js for automated data extraction pipelines.
        - Improved database query performance by 60% through PostgreSQL indexing and Redis caching.
        
        EDUCATION:
        Bachelor of Engineering in Information Technology | PES University, Bangalore (2014 - 2018)
        """,
        """
        Vikramaditya Roy
        vikram.roy@outlook.com | +91 98112 33445 | Hyderabad, India | 30 days notice
        AI & Distributed Systems Backend Architect with 8+ years specializing in Java, Spring Boot, and high-throughput data processing.
        
        TECHNICAL SKILLS:
        Backend & Distributed Systems: Java 17, Spring Boot, Spring Cloud, Spring AI, Python
        Messaging & Streaming: Apache Kafka, RabbitMQ, gRPC
        Databases: PostgreSQL (pgvector), Apache Cassandra, Elasticsearch
        Infrastructure: Docker, Kubernetes, Terraform, GCP (Google Cloud Platform)
        
        PROFESSIONAL EXPERIENCE:
        Principal Backend Architect | FinTech Wave (2020 - Present)
        - Engineered an event-driven payment processing engine in Spring Boot and Kafka processing 15,000 TPS with zero data loss.
        - Integrated semantic similarity scoring using pgvector and embeddings to detect duplicate fraud transactions.
        - Led migration from monolithic architecture to 12 isolated microservices with zero downtime.
        
        Senior Java Developer | Infosys Finacle (2016 - 2020)
        - Built core banking transaction modules using Spring Framework and Oracle DB.
        - Enforced strict Spring Security OAuth2/JWT role-based access control across 50+ banking APIs.
        
        EDUCATION:
        Master of Technology in Computer Science | IIT Hyderabad (2014 - 2016)
        """,
        """
        Kavya Nambiar
        kavya.nambiar@tech.io | +91 99001 55667 | Pune, India | Immediate Joiner (0 days notice)
        Frontend & UI/UX Specialist with 4 years of experience building delightful, accessible, high-performance web products.
        
        TECHNICAL SKILLS:
        Frontend Core: React 18, Next.js, TypeScript, Tailwind CSS, Vanilla CSS, Webpack, Vite
        State Management: Redux Toolkit, Zustand, React Context, TanStack Query
        Testing & Performance: Jest, Cypress, Lighthouse Performance Optimization, Framer Motion
        Tooling: Git, Figma, Docker basics, REST APIs, GraphQL
        
        PROFESSIONAL EXPERIENCE:
        Senior UI Engineer | Studio Nova (2022 - Present)
        - Built complex design systems and responsive web portals with custom design tokens, dark mode, and fluid micro-animations.
        - Implemented React useMemo and useCallback memoization strategies, cutting cumulative layout shift (CLS) to 0.01.
        - Collaborated closely with product designers to ship 15+ production feature releases on schedule.
        
        Frontend Developer | PixelCraft Solutions (2020 - 2022)
        - Developed client portals using React and Tailwind CSS, increasing user engagement metrics by 35%.
        
        EDUCATION:
        B.Tech in Computer Science | Pune Institute of Computer Technology (2016 - 2020)
        """,
        """
        Rohan Sharma
        rohan.sharma@cloudops.net | +91 97234 88990 | Gurugram, India | 15 days notice
        DevOps & Cloud Infrastructure Lead with 7+ years of experience scaling Kubernetes clusters and CI/CD pipelines.
        
        TECHNICAL SKILLS:
        Cloud Platforms: AWS (EKS, ECS, Lambda, IAM, CloudFront), GCP, Azure
        Container & Orchestration: Kubernetes, Docker, Helm, ArgoCD, Terraform, Ansible
        Observability & CI/CD: Prometheus, Grafana, Datadog, GitHub Actions, GitLab CI
        Scripting & Security: Python, Bash, Linux Kernel tuning, HashiCorp Vault
        
        PROFESSIONAL EXPERIENCE:
        Lead DevOps Engineer | ScaleGrid Technologies (2021 - Present)
        - Managed 40+ multi-region AWS EKS clusters hosting 150+ microservices with 99.99% uptime SLA.
        - Automated zero-downtime blue/green deployments using ArgoCD and Helm charts.
        - Slashed cloud infrastructure cost by 38% via EC2 Spot instance automation and Karpenter autoscaling.
        
        Cloud Systems Engineer | Wipro Digital (2017 - 2021)
        - Built automated infrastructure provisioning scripts with Terraform and Ansible.
        
        EDUCATION:
        B.Tech in Electronics & Communication | NIT Kurukshetra (2013 - 2017)
        """,
        """
        Priya Murthy
        priya.murthy@aimail.com | +91 98860 77112 | Bengaluru, India | 30 days notice
        Applied AI & Machine Learning Engineer with 5 years specializing in NLP, Vector Databases, and LLM orchestration.
        
        TECHNICAL SKILLS:
        AI & ML: Python, PyTorch, Hugging Face Transformers, LangChain, LlamaIndex, OpenAI APIs
        Vector Stores & Search: Pinecone, Weaviate, Qdrant, ChromaDB, Cosine Similarity, ANN
        Backend & Data: FastAPI, PostgreSQL, Redis, Celery, Docker, MLflow
        Data Processing: Pandas, NumPy, Scikit-learn, Ray, Apache Spark
        
        PROFESSIONAL EXPERIENCE:
        Senior Machine Learning Engineer | CogniSearch AI (2022 - Present)
        - Designed and deployed enterprise RAG pipeline serving semantic search across 5M+ technical documents.
        - Tuned embedding chunking strategies and multi-vector representations, improving retrieval recall by 34%.
        - Built low-latency FastAPI inference microservices containerized with Docker on GPU instances.
        
        Data Scientist | Mu Sigma (2019 - 2022)
        - Built statistical forecasting and NLP classification models for Fortune 500 retail clients.
        
        EDUCATION:
        M.Sc in Data Science & Machine Learning | IISc Bangalore (2017 - 2019)
        """
    ]

    # Assign initial diverse ATS statuses for demo realism
    status_map = {
        "Aditi Sen": "APPLIED",
        "Vikramaditya Roy": "SHORTLISTED",
        "Kavya Nambiar": "INTERVIEWING",
        "Rohan Sharma": "OFFER_EXTENDED",
        "Priya Murthy": "SHORTLISTED"
    }

    for resume_text in sample_resumes:
        parsed = segment_resume(resume_text)
        meta = parsed["metadata"]
        cid = "cand_" + meta["name"].lower().replace(" ", "_")
        segments = parsed["segments"]
        cand_status = status_map.get(meta["name"], "APPLIED")

        # Ingest Skills Segment
        skills_vec = compute_semantic_vector(segments["skills"])
        # Ingest Experience Segment
        exp_vec = compute_semantic_vector(segments["experience"])
        # Ingest Education Segment
        edu_vec = compute_semantic_vector(segments["education"])

        vector_store.upsert([
            {
                "id": f"{cid}#skills",
                "values": skills_vec,
                "metadata": {
                    "candidate_id": cid,
                    "name": meta["name"],
                    "email": meta.get("email", ""),
                    "phone": meta.get("phone", ""),
                    "years_of_experience": meta["years_of_experience"],
                    "location": meta["location"],
                    "notice_days": meta["notice_days"],
                    "status": cand_status,
                    "segment": "SKILLS",
                    "text": segments["skills"]
                }
            },
            {
                "id": f"{cid}#exp",
                "values": exp_vec,
                "metadata": {
                    "candidate_id": cid,
                    "name": meta["name"],
                    "email": meta.get("email", ""),
                    "phone": meta.get("phone", ""),
                    "years_of_experience": meta["years_of_experience"],
                    "location": meta["location"],
                    "notice_days": meta["notice_days"],
                    "status": cand_status,
                    "segment": "EXPERIENCE",
                    "text": segments["experience"]
                }
            },
            {
                "id": f"{cid}#edu",
                "values": edu_vec,
                "metadata": {
                    "candidate_id": cid,
                    "name": meta["name"],
                    "email": meta.get("email", ""),
                    "phone": meta.get("phone", ""),
                    "years_of_experience": meta["years_of_experience"],
                    "location": meta["location"],
                    "notice_days": meta["notice_days"],
                    "status": cand_status,
                    "segment": "EDUCATION",
                    "text": segments["education"]
                }
            }
        ])

def semantic_rag_candidate_search(query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Free-form natural language RAG semantic search across candidate profiles.
    Example: 'Senior React developer with FastAPI and microservices experience'
    """
    from embeddings import compute_semantic_vector, vector_store
    
    query_vec = compute_semantic_vector(query_text)
    
    # Query both SKILLS and EXPERIENCE segments
    skill_hits = vector_store.query(query_vec, top_k=50, filter_dict={"segment": "SKILLS"})
    exp_hits = vector_store.query(query_vec, top_k=50, filter_dict={"segment": "EXPERIENCE"})
    
    candidate_scores: Dict[str, Dict[str, Any]] = {}
    
    for hit in skill_hits:
        cid = hit["metadata"]["candidate_id"]
        if cid not in candidate_scores:
            candidate_scores[cid] = {
                "candidate_id": cid,
                "name": hit["metadata"].get("name", "Unknown"),
                "email": hit["metadata"].get("email", ""),
                "phone": hit["metadata"].get("phone", ""),
                "years_of_experience": hit["metadata"].get("years_of_experience", 0),
                "location": hit["metadata"].get("location", "Unknown"),
                "notice_days": hit["metadata"].get("notice_days", 30),
                "status": hit["metadata"].get("status", "APPLIED"),
                "skill_score": round(hit["score"] * 100, 1),
                "exp_score": 50.0,
                "skills_text": hit["metadata"].get("text", ""),
                "exp_text": ""
            }
        else:
            candidate_scores[cid]["skill_score"] = round(hit["score"] * 100, 1)

    for hit in exp_hits:
        cid = hit["metadata"]["candidate_id"]
        if cid in candidate_scores:
            candidate_scores[cid]["exp_score"] = round(hit["score"] * 100, 1)
            candidate_scores[cid]["exp_text"] = hit["metadata"].get("text", "")
        else:
            candidate_scores[cid] = {
                "candidate_id": cid,
                "name": hit["metadata"].get("name", "Unknown"),
                "email": hit["metadata"].get("email", ""),
                "phone": hit["metadata"].get("phone", ""),
                "years_of_experience": hit["metadata"].get("years_of_experience", 0),
                "location": hit["metadata"].get("location", "Unknown"),
                "notice_days": hit["metadata"].get("notice_days", 30),
                "status": hit["metadata"].get("status", "APPLIED"),
                "skill_score": 50.0,
                "exp_score": round(hit["score"] * 100, 1),
                "skills_text": "",
                "exp_text": hit["metadata"].get("text", "")
            }

    results = []
    for cid, cand in candidate_scores.items():
        composite_score = round(0.6 * cand["skill_score"] + 0.4 * cand["exp_score"], 1)
        dossier = generate_candidate_dossier(cand, query_text, query_text)
        results.append({
            "candidate_id": cid,
            "name": cand["name"],
            "email": cand["email"],
            "phone": cand["phone"],
            "years_of_experience": cand["years_of_experience"],
            "location": cand["location"],
            "notice_days": cand["notice_days"],
            "status": cand["status"],
            "match_percentage": composite_score,
            "breakdown": {
                "skill_score": cand["skill_score"],
                "exp_score": cand["exp_score"]
            },
            "dossier": dossier
        })

    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return results[:top_k]

