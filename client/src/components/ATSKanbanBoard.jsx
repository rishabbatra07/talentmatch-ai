import React, { useState, useEffect } from 'react';
import { 
  Kanban, UserCheck, MessageSquare, ArrowRight, ArrowLeft, 
  Download, Clock, MapPin, Sparkles, Filter, CheckCircle2, XCircle
} from 'lucide-react';
import WhatsAppModal from './WhatsAppModal';

export default function ATSKanbanBoard({ onQuotaUpdated }) {
  const [pipeline, setPipeline] = useState({
    APPLIED: [],
    SHORTLISTED: [],
    INTERVIEWING: [],
    OFFER_EXTENDED: [],
    REJECTED: []
  });
  const [loading, setLoading] = useState(true);
  const [activeModalCandidate, setActiveModalCandidate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPipeline = async () => {
    try {
      const res = await fetch('/api/ats/pipeline');
      const data = await res.json();
      if (data.stages) {
        setPipeline(data.stages);
      }
    } catch (err) {
      console.error('Failed to load ATS pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleStageMove = async (candidateId, nextStage) => {
    // Optimistic UI update
    const previousState = { ...pipeline };
    const updatedStages = { ...pipeline };

    let movedCandidate = null;
    for (const stageKey in updatedStages) {
      const idx = updatedStages[stageKey].findIndex(c => c.candidate_id === candidateId);
      if (idx !== -1) {
        movedCandidate = { ...updatedStages[stageKey][idx], status: nextStage };
        updatedStages[stageKey] = updatedStages[stageKey].filter(c => c.candidate_id !== candidateId);
        break;
      }
    }

    if (movedCandidate && updatedStages[nextStage]) {
      updatedStages[nextStage].push(movedCandidate);
      setPipeline(updatedStages);
    }

    try {
      const res = await fetch('/api/ats/stage-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStage
        })
      });
      if (!res.ok) {
        // Fallback to query format if needed
        await fetch(`/api/candidates/${candidateId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStage })
        });
      }
    } catch (err) {
      console.error('Stage move failed, reverting:', err);
      setPipeline(previousState);
    }
  };

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
        alert(`Resume for ${cand.name} downloaded successfully! Quota remaining: ${data.quota_remaining} downloads.`);
      } else {
        alert(data.detail || 'Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    { id: 'APPLIED', title: '📥 Applied (New)', color: '#3b82f6', next: 'SHORTLISTED', prev: null },
    { id: 'SHORTLISTED', title: '🎯 AI Shortlisted', color: '#06b6d4', next: 'INTERVIEWING', prev: 'APPLIED' },
    { id: 'INTERVIEWING', title: '🗓️ Interview Scheduled', color: '#f59e0b', next: 'OFFER_EXTENDED', prev: 'SHORTLISTED' },
    { id: 'OFFER_EXTENDED', title: '💼 Offer Extended', color: '#10b981', next: null, prev: 'INTERVIEWING' },
    { id: 'REJECTED', title: '❌ Archive / Rejected', color: '#ef4444', next: null, prev: 'APPLIED' }
  ];

  const totalCandidates = Object.values(pipeline).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 20px 40px' }}>
      {/* Top Banner & Metrics */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
          }}>
            <Kanban size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Enterprise Applicant Tracking System (ATS)
              </h2>
              <span className="badge badge-emerald">Real-Time Sync</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Manage candidate life-cycles, trigger WhatsApp invitations, and track hiring stages
            </p>
          </div>
        </div>

        {/* Quick Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '7px 12px',
            borderRadius: '10px'
          }}>
            <Filter size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search candidate in pipeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '12.5px',
                outline: 'none',
                width: '190px'
              }}
            />
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '7px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            color: '#cbd5e1'
          }}>
            Total In Pipeline: <strong>{totalCandidates}</strong>
          </div>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '14px',
        alignItems: 'start'
      }}>
        {columns.map((col) => {
          const rawCandidates = pipeline[col.id] || [];
          const candidates = searchQuery.trim()
            ? rawCandidates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : rawCandidates;

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                overflow: 'hidden',
                minHeight: '620px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                backgroundColor: 'rgba(10, 15, 29, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col.color }}></span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f1f5f9' }}>
                    {col.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  color: col.color
                }}>
                  {candidates.length}
                </span>
              </div>

              {/* Candidate Cards List */}
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {candidates.length === 0 ? (
                  <div style={{
                    padding: '30px 10px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '12px'
                  }}>
                    No candidates in this stage
                  </div>
                ) : (
                  candidates.map((cand) => (
                    <div
                      key={cand.candidate_id}
                      className="glass-panel"
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        backgroundColor: 'rgba(20, 27, 45, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                      }}
                    >
                      {/* Name & Experience */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          {cand.name}
                        </span>
                        <span style={{
                          fontSize: '10.5px',
                          color: '#06b6d4',
                          backgroundColor: 'rgba(6, 182, 212, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          {cand.years_of_experience} yrs exp
                        </span>
                      </div>

                      {/* Location & Notice */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {cand.location}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
                          <Clock size={11} /> {cand.notice_days}d notice
                        </span>
                      </div>

                      {/* Skills snippet */}
                      {cand.segments && cand.segments.skills && (
                        <div style={{
                          fontSize: '11px',
                          color: '#cbd5e1',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {cand.segments.skills.text_snippet}
                        </div>
                      )}

                      {/* Direct Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        {/* WhatsApp trigger */}
                        <button
                          onClick={() => setActiveModalCandidate(cand)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            color: '#4ade80',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Send WhatsApp Alert"
                        >
                          <MessageSquare size={12} />
                          WhatsApp
                        </button>

                        {/* Download Resume */}
                        <button
                          onClick={() => handleDownloadResume(cand)}
                          disabled={downloadingId === cand.candidate_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: '#60a5fa',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                          title="Download Full Resume"
                        >
                          <Download size={12} />
                        </button>
                      </div>

                      {/* Stage Progression Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {col.prev ? (
                          <button
                            onClick={() => handleStageMove(cand.candidate_id, col.prev)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '10.5px',
                              cursor: 'pointer'
                            }}
                          >
                            <ArrowLeft size={11} /> Back
                          </button>
                        ) : <div />}

                        {col.id !== 'REJECTED' && (
                          <button
                            onClick={() => handleStageMove(cand.candidate_id, 'REJECTED')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '10.5px',
                              cursor: 'pointer'
                            }}
                            title="Reject Candidate"
                          >
                            Reject
                          </button>
                        )}

                        {col.next && (
                          <button
                            onClick={() => handleStageMove(cand.candidate_id, col.next)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#34d399',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Next <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Modal Trigger */}
      {activeModalCandidate && (
        <WhatsAppModal
          candidate={activeModalCandidate}
          jobTitle="Engineering Opening"
          onClose={() => setActiveModalCandidate(null)}
          onDispatched={() => {
            if (onQuotaUpdated) onQuotaUpdated();
          }}
        />
      )}
    </div>
  );
}
