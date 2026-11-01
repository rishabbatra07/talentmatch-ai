# TalentMatch AI — Segment-Wise RAG Platform

An enterprise-grade, high-performance **Recruiter-to-Candidate Job Matching Platform** built with:
- **Frontend:** React 18 SPA (Vite) with real-time `useMemo` multi-segment re-ranking & optimistic UI updates.
- **Backend:** Python + FastAPI with async endpoints, Pydantic validation, and CORS middleware.
- **Vector Database:** Pinecone-compatible 1536-dimensional dense vector store with cosine similarity and metadata filtering.

---

## 🌟 Why Segment-Wise Embeddings? (The Core Innovation)
Traditional naive RAG embeds an entire 3-page resume into a single vector, leading to **"Vector Dilution"** where deep technical expertise gets watered down by hobbies or education.

**TalentMatch AI breaks resumes and jobs into discrete semantic segments:**
1. **`SKILLS` Segment:** Languages, frameworks, cloud tools, databases.
2. **`EXPERIENCE` Segment:** Roles, architecture impact, throughput, scale.
3. **`EDUCATION` Segment:** Academic credentials and degrees.
4. **`METADATA` Payload:** Location, notice days, candidate contact info.

Recruiters can use **interactive weight sliders** in the dashboard to balance Skill fit vs Experience fit. React's **`useMemo`** re-calculates overall scores at 60fps in client memory without re-querying the vector database!

---

## 🚀 How to Run Locally

### 1. Start the FastAPI Backend
```bash
cd server
python3 -m uvicorn main:app --reload --port 8000
```
* API Documentation / Swagger: `http://localhost:8000/docs`

### 2. Start the React Frontend
```bash
cd client
npm run dev
```
* Web Dashboard: `http://localhost:5173`

---

## 📂 Project Structure

```
talentmatch-ai/
├── server/
│   ├── main.py          # FastAPI application & API endpoints
│   ├── segmenter.py     # Regex/heuristic semantic section parser
│   ├── embeddings.py    # 1536-D Vector generation & Pinecone-compatible store
│   └── matcher.py       # Segment-to-segment RAG search & candidate dossier engine
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx                # Mode switcher & vector count indicator
    │   │   ├── CandidateSegmentStudio.jsx# Resume segmenter & 1536-D vector visualizer
    │   │   ├── RecruiterMatchStudio.jsx  # Sliders, useMemo re-scoring, AI dossiers
    │   │   └── VectorExplorerModal.jsx   # Vector DB inspector
    │   ├── App.jsx                       # State orchestration
    │   └── index.css                     # Dark glassmorphism & design tokens
    ├── package.json
    └── vite.config.js                    # Proxy configured to localhost:8000
```
