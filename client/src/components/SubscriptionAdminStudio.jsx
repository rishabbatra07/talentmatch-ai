import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, ShieldCheck, Zap, Download, 
  MessageSquare, Briefcase, Database, HelpCircle, ArrowUpRight, Check 
} from 'lucide-react';

export default function SubscriptionAdminStudio({ quota, onQuotaUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'
  const [upgrading, setUpgrading] = useState(false);
  const [upgradedSuccess, setUpgradedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/subscription/overview')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load subscription data:', err);
        setLoading(false);
      });
  }, []);

  const handleSimulateUpgrade = (planId) => {
    setUpgrading(true);
    setTimeout(() => {
      setSelectedPlan(planId);
      setUpgrading(false);
      setUpgradedSuccess(true);
      setTimeout(() => setUpgradedSuccess(false), 2500);
    }, 700);
  };

  if (loading || !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
        Loading Commercial Pricing & Subscription Dashboard...
      </div>
    );
  }

  const currentQ = data.current_quota;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 20px 50px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(245, 158, 11, 0.4)'
          }}>
            <CreditCard size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
                Subscription Plans, Quotas & Commercial Structure
              </h2>
              <span className="badge badge-amber">Enterprise Ready</span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Transparent commercial breakdown answering all job posting, resume database, and SLA parameters
            </p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setCurrency('INR')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: currency === 'INR' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: currency === 'INR' ? '#fbbf24' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            INR (₹)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: currency === 'USD' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: currency === 'USD' ? '#fbbf24' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Real-Time Recruiter Quota Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Active Jobs */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Active Job Postings</span>
            <Briefcase size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            {currentQ.active_jobs_posted} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {currentQ.active_jobs_limit}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#34d399' }}>
            {currentQ.jobs_remaining} job posting slots remaining
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(currentQ.active_jobs_posted / currentQ.active_jobs_limit) * 100}%`, height: '100%', backgroundColor: '#3b82f6' }} />
          </div>
        </div>

        {/* Card 2: Resume Database Downloads */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Resume DB Downloads</span>
            <Download size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            {currentQ.resume_downloads_used} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {currentQ.resume_downloads_limit}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#34d399' }}>
            {currentQ.downloads_remaining} downloads remaining this cycle
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(currentQ.resume_downloads_used / currentQ.resume_downloads_limit) * 100}%`, height: '100%', backgroundColor: '#10b981' }} />
          </div>
        </div>

        {/* Card 3: WhatsApp Alerts */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>WhatsApp Cloud Credits</span>
            <MessageSquare size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            {currentQ.whatsapp_credits_remaining} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {currentQ.whatsapp_credits_limit}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#4ade80' }}>
            Official Meta Cloud API live
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(currentQ.whatsapp_credits_remaining / currentQ.whatsapp_credits_limit) * 100}%`, height: '100%', backgroundColor: '#22c55e' }} />
          </div>
        </div>

        {/* Card 4: Current Tier */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>Active Plan</span>
            <ShieldCheck size={16} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            {currentQ.plan_name}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Auto-renewing • Priority Support 4h SLA
          </div>
          <div style={{ marginTop: 10, display: 'inline-block' }}>
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>Active Enterprise Tier</span>
          </div>
        </div>
      </div>

      {/* Subscription Pricing Tiers */}
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
        Commercial Subscription Plans & Feature Tiers
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {data.plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          const price = currency === 'INR' ? p.price_inr : p.price_usd;

          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '28px',
                borderRadius: '16px',
                border: p.is_popular 
                  ? '2px solid rgba(59, 130, 246, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: p.is_popular ? 'rgba(30, 58, 138, 0.12)' : 'rgba(15, 23, 42, 0.7)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: p.is_popular ? '0 0 30px rgba(59, 130, 246, 0.2)' : 'none'
              }}
            >
              {p.is_popular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  right: 24,
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: '20px',
                  letterSpacing: '0.04em',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)'
                }}>
                  MOST POPULAR
                </div>
              )}

              <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                {p.name}
              </h4>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                {price}
              </div>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '20px' }}>
                {p.billing_interval}
              </p>

              {/* Feature Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>{p.active_jobs_allowed}</strong> Active Job Postings</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>{p.resume_database_downloads}</strong> Resume Downloads</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>{p.recruiter_logins}</strong> Recruiter Seat Logins</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p.search_features}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p.whatsapp_notifications}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p.ats_kanban}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p.support}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSimulateUpgrade(p.id)}
                disabled={upgrading}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.12)',
                  background: isSelected 
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                    : 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isSelected ? (
                  <>
                    <Check size={16} /> Current Active Plan
                  </>
                ) : (
                  <>
                    Select Plan <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Commercial Add-ons & Maintenance Table */}
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>
        Setup, Customization & Annual Maintenance Charges (AMC)
      </h3>

      <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '10px 14px' }}>Service / Module</th>
              <th style={{ padding: '10px 14px' }}>Scope & Deliverables</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Standard Charge</th>
            </tr>
          </thead>
          <tbody>
            {data.commercial_add_ons.map((item, idx) => {
              const charge = currency === 'INR' ? item.charge_inr : item.charge_usd;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ffffff' }}>
                    {item.item}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>
                    {charge}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
