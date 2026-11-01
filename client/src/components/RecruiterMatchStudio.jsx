import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, Search, CheckCircle2, AlertTriangle, HelpCircle, 
  Briefcase, ChevronRight, UserCheck, UserX, Clock, MapPin, 
  Sparkles, MessageSquare, Download, Plus, Bot, ArrowRight 
} from 'lucide-react';
import JobCreateModal from './JobCreateModal';
import WhatsAppModal from './WhatsAppModal';

export default function RecruiterMatchStudio({ onQuotaUpdated }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [noticeFilter, setNoticeFilter] = useState(60);

  // Recruiter Segment Weight Sliders (weights sum to 1.0)
  const [skillWeight, setSkillWeight] = useState(0.50);
  const [expWeight, setExpWeight] = useState(0.35);
  const [eduWeight, setEduWeight] = useState(0.15);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDossier, setExpandedDossier] = useState(null);

  // Natural Language Free-form RAG Query state
  const [ragQuery, setRagQuery] = useState('');
  const [isRagSearchActive, setIsRagSearchActive] = useState(false);
  const [ragSearching, setRagSearching] = useState(false);

  // Modals state
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeWhatsAppCand, setActiveWhatsAppCand] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // 1. Fetch jobs on load
  const loadJobs = () => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        if (data.length > 0 && !selectedJobId) {
          applyJob(data[0]);
        }
      })
      .catch(err => console.error('Error fetching jobs:', err));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const applyJob = (job) => {
    setSelectedJobId(job.id);
    setJobDescription(job.description);
    setRequiredSkills(job.required_skills);
    setResponsibilities(job.responsibilities);
    setIsRagSearchActive(false);
    triggerMatch(job.required_skills, job.responsibilities, job.description);
  };

  // 2. Fetch matches from FastAPI Backend
  const triggerMatch = async (skills = requiredSkills, resps = responsibilities, desc = jobDescription) => {
    setLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: desc,
          required_skills: skills,
          responsibilities: resps,
          skill_weight: skillWeight,
          exp_weight: expWeight,
          edu_weight: eduWeight,
          max_notice_days: noticeFilter
        })
      });
      const data = await res.json();
      setCandidates(data);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Free-Form Natural Language RAG Search
  const handleRagSearch = async (e) => {
    if (e) e.preventDefault();
    if (!ragQuery.trim()) return;

    setRagSearching(true);
    setIsRagSearchActive(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery.trim() })
      });
      const data = await res.json();
      setCandidates(data);
    } catch (err) {
      console.error('RAG query error:', err);
    } finally {
      setRagSearching(false);
    }
  };

  // 4. PERFORMANCE OPTIMIZATION WITH useMemo:
  // Dynamically recalculates overall scores when sliders move without re-querying Pinecone!
  const rankedCandidates = useMemo(() => {
    const totalW = skillWeight + expWeight + eduWeight || 1.0;
    const wSkill = skillWeight / totalW;
    const wExp = expWeight / totalW;
    const wEdu = eduWeight / totalW;

    return candidates.map(c => {
      const dynamicOverall = Math.round(
        (c.breakdown.skill_score * wSkill) +
        (c.breakdown.exp_score * wExp) +
        ((c.breakdown.edu_score || 70) * wEdu)
      );
      return {
        ...c,
        dynamicScore: dynamicOverall
      };
    }).sort((a, b) => b.dynamicScore - a.dynamicScore);
  }, [candidates, skillWeight, expWeight, eduWeight]);

  // 5. Update Candidate Status (Shortlist / Interview / Reject)
  const handleStatusUpdate = async (candidateId, newStatus) => {
    const prevCandidates = [...candidates];
    setCandidates(prev =>
      prev.map(c => c.candidate_id === candidateId ? { ...c, status: newStatus } : c)
    );

    try {
      const res = await fetch(`/api/candidates/${candidateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      if (onQuotaUpdated) onQuotaUpdated();
    } catch (err) {
      console.error('Error updating status:', err);
      setCandidates(prevCandidates);
    }
  };

  // 6. Download resume with quota tracking
  const handleDownloadResume = async (cand) => {
    setDownloadingId(cand.candidate_id);
    try {
      const res = await fetch('/api/subscription/download-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: cand.candidate_id })
      });
      const data = await res.json();
      if (res.ok) {
        if (onQuotaUpdated) onQuotaUpdated();
        alert(`Resume downloaded for ${cand.name}. Quota remaining: ${data.quota_remaining} downloads.`);
      } else {
        alert(data.detail || 'Download quota exceeded');
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 20px 60px' }}>
      {/* Natural Language Free-Form RAG Search Bar */}
      <div className="glass-panel" style={{
        padding: '18px 24px',
        marginBottom: '20px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        background: 'rgba(15, 23, 42, 0.85)'
      }}>
        <form onSubmit={handleRagSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <Bot size={22} color="#38bdf8" />
            <input
              type="text"
              placeholder="Ask RAG Search in plain English (e.g. 'Senior Full Stack Engineer with React, Python and Pinecone available in 15 days')..."
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {ragQuery && (
            <button
              type="button"
              onClick={() => {
                setRagQuery('');
                setIsRagSearchActive(false);
                const current = jobs.find(j => j.id === selectedJobId);
                if (current) applyJob(current);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}

          <button
            type="submit"
            disabled={ragSearching}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: ragSearching ? 'wait' : 'pointer',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
            }}
          >
            <Sparkles size={15} />
            {ragSearching ? 'Analyzing Embeddings...' : 'Semantic RAG Search'}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Try queries:</span>
          {[
            'React & FastAPI fullstack lead',
            'Distributed Kafka architect in Hyderabad',
            'DevOps Kubernetes engineer 15 days notice',
            'NLP & Vector Search Specialist'
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setRagQuery(chip);
                setIsRagSearchActive(true);
                setRagSearching(true);
                fetch('/api/rag/search', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: chip })
                })
                  .then(r => r.json())
                  .then(data => setCandidates(data))
                  .finally(() => setRagSearching(false));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '3px 10px',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              "{chip}"
            </button>
          ))}
        </div>
      </div>

      {/* Top Banner: Active Job Selector & Actions */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={22} color="#3b82f6" /> Recruiter Semantic Match Studio
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '12.5px' }}>
            {isRagSearchActive 
              ? `Displaying RAG results for: "${ragQuery}"`
              : 'Multi-segment vector cosine similarity matched against candidate skill and experience vectors.'}
          </p>
        </div>

        {/* Job Selector Dropdown & Post Job Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Target Role:</span>
            <select
              value={selectedJobId}
              onChange={(e) => {
                const selected = jobs.find(j => j.id === e.target.value);
                if (selected) applyJob(selected);
              }}
              style={{
                background: '#111726',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '260px'
              }}
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowJobModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(59, 130, 246, 0.35)'
            }}
          >
            <Plus size={15} /> Post New Job
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left Column: Recruiter Controls & Segment Weight Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Segment Weights Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sliders size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Segment Weights</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '18px' }}>
              Adjust weights in real-time. React <code>useMemo</code> recalculates candidate scores without repeating vector queries!
            </p>

            {/* Slider 1: Skills Weight */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#38bdf8' }}>🛠️ Tech Skills Weight</span>
                <span style={{ color: '#ffffff' }}>{Math.round(skillWeight * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={skillWeight}
                onChange={e => setSkillWeight(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Slider 2: Experience Weight */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#34d399' }}>💼 Work History & Scope</span>
                <span style={{ color: '#ffffff' }}>{Math.round(expWeight * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={expWeight}
                onChange={e => setExpWeight(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Slider 3: Education Weight */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#fbbf24' }}>🎓 Academic Credentials</span>
                <span style={{ color: '#ffffff' }}>{Math.round(eduWeight * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={eduWeight}
                onChange={e => setEduWeight(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Notice Period Filter */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Hard Filter: Max Notice Period
              </label>
              <select
                value={noticeFilter}
                onChange={(e) => {
                  setNoticeFilter(Number(e.target.value));
                  triggerMatch(requiredSkills, responsibilities, jobDescription);
                }}
                style={{
                  width: '100%',
                  background: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '8px',
                  color: '#ffffff',
                  fontSize: '12px'
                }}
              >
                <option value={15}>≤ 15 Days (Immediate)</option>
                <option value={30}>≤ 30 Days</option>
                <option value={60}>≤ 60 Days</option>
                <option value={90}>≤ 90 Days</option>
              </select>
            </div>
          </div>

          {/* Active Job Requirements Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px' }}>
              Target Job Query Segments
            </h4>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>Required Skills Segment:</div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
                {requiredSkills}
              </p>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>Responsibilities Segment:</div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
                {responsibilities}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Ranked Candidate Matches */}
        <div>
          {loading ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#38bdf8', fontWeight: 600 }}>Calculating segment-wise cosine similarity in Pinecone...</p>
            </div>
          ) : rankedCandidates.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8' }}>No candidates matched the given notice period and criteria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rankedCandidates.map((c, idx) => {
                const scoreColor = c.dynamicScore >= 80 ? '#10b981' : c.dynamicScore >= 65 ? '#06b6d4' : '#f59e0b';
                const isExpanded = expandedDossier === c.candidate_id;

                return (
                  <div key={c.candidate_id} className="glass-panel" style={{ padding: '20px' }}>
                    {/* Top Row: Candidate Overview */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Rank Badge */}
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#94a3b8'
                        }}>
                          #{idx + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>{c.name}</h3>
                            <span className={`badge ${
                              c.status === 'SHORTLISTED' ? 'badge-emerald' :
                              c.status === 'INTERVIEWING' ? 'badge-blue' :
                              c.status === 'OFFER_EXTENDED' ? 'badge-amber' :
                              c.status === 'REJECTED' ? 'badge-rose' : 'badge-indigo'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            <span>{c.years_of_experience} yrs experience</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={12} /> {c.location}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
                              <Clock size={12} /> {c.notice_days}d notice
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Dial & Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: 800, color: scoreColor }}>
                            {c.dynamicScore}%
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Match Fit
                          </div>
                        </div>

                        {/* WhatsApp Alert Button */}
                        <button
                          onClick={() => setActiveWhatsAppCand(c)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Send WhatsApp Alert"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </button>

                        {/* Download Resume Button */}
                        <button
                          onClick={() => handleDownloadResume(c)}
                          disabled={downloadingId === c.candidate_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Download Resume (Quota tracked)"
                        >
                          <Download size={13} /> Resume
                        </button>

                        {/* Shortlist Action */}
                        <button
                          onClick={() => handleStatusUpdate(c.candidate_id, 'SHORTLISTED')}
                          style={{
                            background: c.status === 'SHORTLISTED' ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                            color: c.status === 'SHORTLISTED' ? '#ffffff' : '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <UserCheck size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Segment Scores Breakdown */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                      margin: '16px 0',
                      padding: '12px 14px',
                      background: 'rgba(10, 15, 29, 0.6)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Skills Segment Match</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                          {c.breakdown.skill_score}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Experience Match</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
                          {c.breakdown.exp_score}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Education Match</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                          {c.breakdown.edu_score || 70}%
                        </div>
                      </div>
                    </div>

                    {/* Toggle AI Dossier */}
                    <div>
                      <button
                        onClick={() => setExpandedDossier(isExpanded ? null : c.candidate_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                        {isExpanded ? 'Hide AI Fit Dossier' : 'View Grounded AI Fit Dossier & Interview Guide'}
                      </button>

                      {isExpanded && c.dossier && (
                        <div style={{
                          marginTop: '14px',
                          padding: '16px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          {/* Strengths */}
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <CheckCircle2 size={14} /> Key Technical Strengths:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#cbd5e1' }}>
                              {c.dossier.key_strengths.map((s, i) => (
                                <li key={i} style={{ marginBottom: '3px' }}>{s}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Gaps */}
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <AlertTriangle size={14} /> Potential Competency Gaps:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#cbd5e1' }}>
                              {c.dossier.potential_gaps.map((g, i) => (
                                <li key={i} style={{ marginBottom: '3px' }}>{g}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Suggested Interview Questions */}
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <HelpCircle size={14} /> Suggested Grounded Technical Questions:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#cbd5e1' }}>
                              {c.dossier.suggested_questions.map((q, i) => (
                                <li key={i} style={{ marginBottom: '3px', fontStyle: 'italic' }}>"{q}"</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      {showJobModal && (
        <JobCreateModal
          onClose={() => setShowJobModal(false)}
          onJobCreated={(newJob) => {
            loadJobs();
            applyJob(newJob);
            if (onQuotaUpdated) onQuotaUpdated();
          }}
        />
      )}

      {/* WhatsApp Modal */}
      {activeWhatsAppCand && (
        <WhatsAppModal
          candidate={activeWhatsAppCand}
          jobTitle={jobs.find(j => j.id === selectedJobId)?.title || 'Engineering Role'}
          onClose={() => setActiveWhatsAppCand(null)}
          onDispatched={() => {
            if (onQuotaUpdated) onQuotaUpdated();
          }}
        />
      )}
    </div>
  );
}
