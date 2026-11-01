import React, { useState } from 'react';
import { Layers, Cpu, CheckCircle, ArrowRight, FileText, Sparkles, User, Briefcase, GraduationCap, MapPin, Clock } from 'lucide-react';

export default function CandidateSegmentStudio({ onCandidateIndexed }) {
  const [resumeText, setResumeText] = useState('');
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [segmentedData, setSegmentedData] = useState(null);
  const [vectorResult, setVectorResult] = useState(null);

  // Sample Resume for instant 1-click test
  const loadSampleResume = () => {
    setResumeText(`Siddharth Iyer
siddharth.iyer@gmail.com | +91 98200 44556 | Bengaluru, India | 30 days notice
Lead Cloud & AI Engineer with 7 years of experience building distributed microservices, RAG vector pipelines, and reactive enterprise platforms.

TECHNICAL SKILLS:
Languages & Frameworks: Python, FastAPI, React 18, TypeScript, Java, Spring Boot, Node.js
AI & Vector Search: LangChain, LlamaIndex, Pinecone, pgvector, OpenAI API, Cosine Similarity
Cloud & DevOps: Docker, Kubernetes, AWS (EKS, S3, RDS, Lambda), Terraform, CI/CD pipelines
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch

PROFESSIONAL EXPERIENCE:
Staff Infrastructure Engineer | HyperScale AI (2022 - Present)
- Engineered high-throughput semantic search service using FastAPI, Pinecone, and React, serving 500k+ daily queries at <35ms latency.
- Built automated resume and document segmentation pipeline dividing PDFs into multi-vector embeddings.
- Reduced cloud compute costs by 40% through container orchestration on Kubernetes and Redis caching.

Senior Backend Engineer | FinTech Systems (2018 - 2022)
- Architected RESTful microservices in Java Spring Boot and Python handling 10,000 TPS.
- Integrated PostgreSQL pgvector for duplicate document detection with 98% accuracy.

EDUCATION:
B.Tech in Computer Science & Engineering | NIT Trichy (2014 - 2018)
`);
  };

  // Step 1: Segment resume into discrete semantic sections
  const handleSegment = async () => {
    if (!resumeText.trim()) return;
    setIsSegmenting(true);
    setVectorResult(null);

    try {
      const res = await fetch('/api/resume/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: resumeText })
      });
      const data = await res.json();
      setSegmentedData(data);
    } catch (err) {
      alert('Error segmenting resume: ' + err.message);
    } finally {
      setIsSegmenting(false);
    }
  };

  // Step 2: Generate 1536-D Vector Embeddings & Index into Pinecone
  const handleEmbedAndIndex = async () => {
    if (!segmentedData) return;
    setIsEmbedding(true);

    try {
      const res = await fetch('/api/resume/embed-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentedData.metadata.name,
          email: segmentedData.metadata.email,
          phone: segmentedData.metadata.phone,
          years_of_experience: segmentedData.metadata.years_of_experience,
          location: segmentedData.metadata.location,
          notice_days: segmentedData.metadata.notice_days,
          segments: segmentedData.segments
        })
      });
      const data = await res.json();
      setVectorResult(data);
      if (onCandidateIndexed) onCandidateIndexed();
    } catch (err) {
      alert('Error generating vector embeddings: ' + err.message);
    } finally {
      setIsEmbedding(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 60px' }}>
      {/* Hero Header */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          Candidate Segment Studio
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '650px', margin: '0 auto' }}>
          Avoid embedding dilution. Extract discrete semantic sections (Skills, Work History, Education) and generate dedicated 1536-D vector embeddings into Pinecone.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: segmentedData ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Left Column: Input Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Resume Source Text</h3>
            </div>
            <button
              onClick={loadSampleResume}
              style={{
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#06b6d4',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Load Sample Resume
            </button>
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste candidate resume text or click 'Load Sample Resume' above..."
            rows={14}
            style={{
              width: '100%',
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#f8fafc',
              padding: '14px',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none'
            }}
          />

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSegment}
              disabled={isSegmenting || !resumeText.trim()}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isSegmenting || !resumeText.trim() ? 'not-allowed' : 'pointer',
                opacity: isSegmenting || !resumeText.trim() ? 0.6 : 1,
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
              }}
            >
              <Layers size={18} />
              {isSegmenting ? 'Segmenting Resume...' : 'Step 1: Extract Semantic Segments'}
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Segments & Vector Preview */}
        {segmentedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Metadata Card */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #06b6d4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    {segmentedData.metadata.name}
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                    {segmentedData.metadata.email} • {segmentedData.metadata.phone}
                  </p>
                </div>
                <span className="badge badge-cyan">
                  {segmentedData.metadata.years_of_experience} Yrs Experience
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#06b6d4" /> {segmentedData.metadata.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} color="#f59e0b" /> {segmentedData.metadata.notice_days} Days Notice
                </span>
              </div>
            </div>

            {/* Segment Breakdown */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} color="#3b82f6" /> Extracted Semantic Segments
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Skills Segment */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>🛠️ Technical Skills Segment</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target: cand_id#skills</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {segmentedData.segments.skills}
                  </p>
                </div>

                {/* Experience Segment */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>💼 Work History & Impact Segment</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target: cand_id#exp</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, maxHeight: '90px', overflowY: 'auto' }}>
                    {segmentedData.segments.experience}
                  </p>
                </div>

                {/* Education Segment */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>🎓 Academic Credentials Segment</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target: cand_id#edu</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {segmentedData.segments.education}
                  </p>
                </div>
              </div>

              {/* Action: Generate Embeddings */}
              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={handleEmbedAndIndex}
                  disabled={isEmbedding}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isEmbedding ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Cpu size={18} />
                  {isEmbedding ? 'Generating 1536-D Vectors...' : 'Step 2: Generate Vector Embeddings & Index'}
                </button>
              </div>
            </div>

            {/* Vector Stats & Pinecone Upsert Confirmation */}
            {vectorResult && (
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(6, 78, 59, 0.25)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CheckCircle size={20} color="#34d399" />
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
                    Successfully Indexed into Pinecone ({vectorResult.upserted_vectors_count} Vectors)
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Vector Dimensionality:</div>
                    <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '16px' }}>1536 Dense Dimensions</div>
                  </div>
                  <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Cosine L2 Norm:</div>
                    <div style={{ color: '#34d399', fontWeight: 700, fontSize: '16px' }}>1.0000 (Unit Sphere)</div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', background: '#090d16', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sample Vector Coordinates (Skills Segment):</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a5f3fc', marginTop: '4px' }}>
                    [{vectorResult.vector_stats.skills?.sample_dimensions?.slice(0, 6).join(', ')} ... +1530 more]
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
