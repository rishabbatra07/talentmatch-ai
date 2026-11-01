import React, { useState } from 'react';
import { X, MessageSquare, Mail, Send, CheckCheck, Sparkles, Smartphone, Check } from 'lucide-react';

export default function WhatsAppModal({ candidate, jobTitle, onClose, onDispatched }) {
  const [channel, setChannel] = useState('WHATSAPP'); // 'WHATSAPP' | 'EMAIL'
  const [template, setTemplate] = useState('INTERVIEW_INVITE');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  const candidateName = candidate?.name || 'Candidate';
  const recipient = channel === 'WHATSAPP' 
    ? (candidate?.phone || '+91 98450 11223') 
    : (candidate?.email || 'candidate@example.com');
  const role = jobTitle || 'Lead Full Stack Engineer';

  const defaultTemplates = {
    INTERVIEW_INVITE: `Hi ${candidateName}! 👋 TalentMatch AI shortlisted your profile for the ${role} opening. We'd love to schedule a 30-min technical conversation. Please choose your slot: https://talentmatch.ai/slot/${candidate?.candidate_id || 'preview'}`,
    SHORTLIST_ALERT: `Hello ${candidateName}, your resume has achieved a 92% semantic match score for ${role}. Our hiring team is reviewing your application dossier.`,
    OFFER_LETTER: `Congratulations ${candidateName}! 🎉 We are delighted to extend a formal offer letter for the ${role} position. View your CTC breakdown and offer letter: https://talentmatch.ai/offer/${candidate?.candidate_id || 'preview'}`,
    CUSTOM: customText || `Hello ${candidateName}, following up regarding your application for ${role}.`
  };

  const currentMessage = template === 'CUSTOM' ? customText : defaultTemplates[template];

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate?.candidate_id || 'cand_preview',
          candidate_name: candidateName,
          channel: channel,
          template_type: template,
          recipient: recipient,
          job_title: role,
          custom_message: currentMessage
        })
      });

      if (res.ok) {
        setDispatchedSuccess(true);
        if (onDispatched) onDispatched();
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err) {
      console.error('Dispatch error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94a3b8'
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: channel === 'WHATSAPP' 
              ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {channel === 'WHATSAPP' ? <MessageSquare size={22} color="#ffffff" /> : <Mail size={22} color="#ffffff" />}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
              Candidate Direct Notification Center
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Instant automated messaging via Official WhatsApp API or Corporate Email Gateway
            </p>
          </div>
        </div>

        {/* Channel Switcher */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <button
            onClick={() => setChannel('WHATSAPP')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: channel === 'WHATSAPP' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
              background: channel === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              color: channel === 'WHATSAPP' ? '#4ade80' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={16} />
            Official WhatsApp API (418 Credits left)
          </button>

          <button
            onClick={() => setChannel('EMAIL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: channel === 'EMAIL' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
              background: channel === 'EMAIL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              color: channel === 'EMAIL' ? '#60a5fa' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Mail size={16} />
            Email Notification Gateway (Unlimited)
          </button>
        </div>

        {/* Two Column Layout: Controls Left, Phone/Email Preview Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px' }}>
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Recipient {channel === 'WHATSAPP' ? 'Phone Number' : 'Email Address'}
              </label>
              <input
                type="text"
                readOnly
                value={recipient}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Notification Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="INTERVIEW_INVITE">🗓️ Technical Interview Invitation</option>
                <option value="SHORTLIST_ALERT">🎯 AI Shortlist Confirmation</option>
                <option value="OFFER_LETTER">💼 Formal Offer Letter & CTC Package</option>
                <option value="CUSTOM">✏️ Custom Message</option>
              </select>
            </div>

            {template === 'CUSTOM' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Custom Message Content
                </label>
                <textarea
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type your personalized message to the applicant..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '13px',
                    resize: 'none'
                  }}
                />
              </div>
            )}

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '11.5px',
              color: '#94a3b8'
            }}>
              <p>⚡ <strong>Delivery SLA:</strong> Messages triggered through WhatsApp Business Cloud API have an average 98.4% open rate within 15 minutes.</p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || dispatchedSuccess}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                borderRadius: '8px',
                border: 'none',
                background: dispatchedSuccess 
                  ? '#10b981' 
                  : (channel === 'WHATSAPP' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #3b82f6, #2563eb)'),
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: (sending || dispatchedSuccess) ? 'default' : 'pointer',
                boxShadow: channel === 'WHATSAPP' ? '0 0 16px rgba(34, 197, 94, 0.4)' : '0 0 16px rgba(59, 130, 246, 0.4)',
                marginTop: 'auto'
              }}
            >
              {dispatchedSuccess ? (
                <>
                  <Check size={18} />
                  Message Dispatched Successfully!
                </>
              ) : sending ? (
                'Connecting to Gateway...'
              ) : (
                <>
                  <Send size={16} />
                  Send {channel === 'WHATSAPP' ? 'WhatsApp Message' : 'Email Alert'}
                </>
              )}
            </button>
          </div>

          {/* Smartphone / Email Live Preview Column */}
          <div style={{
            backgroundColor: '#090d16',
            borderRadius: '16px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            {/* Header bar */}
            <div style={{
              backgroundColor: channel === 'WHATSAPP' ? '#075e54' : '#1e293b',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700
              }}>
                {candidateName.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  {candidateName}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                  {channel === 'WHATSAPP' ? 'Online • WhatsApp Verified' : recipient}
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div style={{
              flex: 1,
              padding: '18px',
              backgroundColor: channel === 'WHATSAPP' ? '#0b141a' : '#0f172a',
              backgroundImage: channel === 'WHATSAPP' ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)' : 'none',
              backgroundSize: '16px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                backgroundColor: channel === 'WHATSAPP' ? '#005c4b' : 'rgba(30, 41, 59, 0.85)',
                color: '#e9edef',
                borderRadius: '10px 10px 0 10px',
                padding: '12px 14px',
                fontSize: '12.5px',
                lineHeight: 1.5,
                maxWidth: '92%',
                alignSelf: 'flex-end',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {currentMessage}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                  marginTop: '6px',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.6)'
                }}>
                  <span>Just now</span>
                  {channel === 'WHATSAPP' && <CheckCheck size={14} color="#53bdeb" />}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              Simulated {channel === 'WHATSAPP' ? 'WhatsApp Business End-to-End Encrypted' : 'Authenticated TLS SMTP'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
