import React from 'react';
import { Layers, Search, Database, Sparkles, Kanban, MessageSquare, CreditCard, ShieldCheck } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, vectorCount, quota }) {
  const tabs = [
    { id: 'recruiter', label: 'RAG Recruiter Studio', icon: Search, color: '#3b82f6' },
    { id: 'ats', label: 'ATS Pipeline', icon: Kanban, color: '#10b981' },
    { id: 'notifications', label: 'WhatsApp & Email Alerts', icon: MessageSquare, color: '#22c55e' },
    { id: 'candidate', label: 'Candidate Portal', icon: Layers, color: '#06b6d4' },
    { id: 'pricing', label: 'Pricing & Admin', icon: CreditCard, color: '#f59e0b' }
  ];

  return (
    <header className="glass-panel" style={{
      position: 'sticky',
      top: 12,
      zIndex: 50,
      margin: '12px auto',
      maxWidth: '1360px',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
        }}>
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              TalentMatch <span style={{ color: '#06b6d4' }}>AI</span>
            </h1>
            <span className="badge badge-emerald pulse-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>
              Enterprise ATS & RAG
            </span>
          </div>
          <p style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Job Portal, RAG Candidate Search & Multi-Stage ATS
          </p>
        </div>
      </div>

      {/* Mode Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        padding: '3px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        gap: '4px'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive ? `linear-gradient(135deg, ${tab.color}, rgba(30, 41, 59, 0.9))` : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                boxShadow: isActive ? `0 0 14px ${tab.color}40` : 'none'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Recruiter Quota & Vector DB Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {quota && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '5px 12px',
            borderRadius: '10px',
            fontSize: '11px',
            color: '#93c5fd'
          }}>
            <span>💼 Jobs: <strong>{quota.active_jobs_posted || 3}/{quota.active_jobs_limit || 25}</strong></span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>📄 DLs: <strong>{quota.resume_downloads_used || 14}/{quota.resume_downloads_limit || 1000}</strong></span>
          </div>
        )}

        <button
          onClick={() => setActiveTab('explorer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '5px 12px',
            borderRadius: '10px',
            fontSize: '11.5px',
            color: '#34d399',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Click to view all indexed segment vectors in memory/Pinecone"
        >
          <Database size={13} />
          <span>{vectorCount || 15} Vectors</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
        </button>
      </div>
    </header>
  );
}
