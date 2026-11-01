import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, CheckCheck, Clock, Send, Sparkles, Filter, RefreshCw } from 'lucide-react';
import WhatsAppModal from './WhatsAppModal';

export default function NotificationCenterView({ onQuotaUpdated }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterChannel, setFilterChannel] = useState('ALL');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/notifications/history');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load notifications history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterChannel === 'ALL') return true;
    return l.channel === filterChannel;
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 20px 40px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
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
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)'
          }}>
            <MessageSquare size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                WhatsApp & Email Candidate Communication Gateway
              </h2>
              <span className="badge badge-emerald">Meta Cloud API Live</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Automated interview scheduling, offer delivery, and applicant status tracking with double-tick receipts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Send size={15} /> Compose New Alert
          </button>

          <button
            onClick={fetchLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['ALL', 'WHATSAPP', 'EMAIL'].map((ch) => (
          <button
            key={ch}
            onClick={() => setFilterChannel(ch)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: filterChannel === ch ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.08)',
              background: filterChannel === ch ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              color: filterChannel === ch ? '#4ade80' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {ch === 'ALL' ? 'All Channels' : ch}
          </button>
        ))}
      </div>

      {/* Dispatched Logs Table */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '10px 12px' }}>Timestamp</th>
              <th style={{ padding: '10px 12px' }}>Channel</th>
              <th style={{ padding: '10px 12px' }}>Candidate Name</th>
              <th style={{ padding: '10px 12px' }}>Recipient Contact</th>
              <th style={{ padding: '10px 12px' }}>Job Opening</th>
              <th style={{ padding: '10px 12px' }}>Message Preview</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Delivery Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No notification logs found. Click "Compose New Alert" to simulate a live WhatsApp dispatch.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: log.channel === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: log.channel === 'WHATSAPP' ? '#4ade80' : '#60a5fa'
                    }}>
                      {log.channel === 'WHATSAPP' ? <MessageSquare size={12} /> : <Mail size={12} />}
                      {log.channel}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#ffffff' }}>
                    {log.candidate_name}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                    {log.recipient}
                  </td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>
                    {log.job_title}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.message}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#34d399',
                      fontSize: '11.5px',
                      fontWeight: 600
                    }}>
                      <CheckCheck size={14} color="#53bdeb" /> {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <WhatsAppModal
          candidate={{ candidate_id: 'cand_aditi_sen', name: 'Aditi Sen', phone: '+91 98450 11223', email: 'aditi.sen@gmail.com' }}
          jobTitle="Lead Full Stack Engineer"
          onClose={() => setShowModal(false)}
          onDispatched={() => {
            fetchLogs();
            if (onQuotaUpdated) onQuotaUpdated();
          }}
        />
      )}
    </div>
  );
}
