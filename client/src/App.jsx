import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CandidateSegmentStudio from './components/CandidateSegmentStudio';
import RecruiterMatchStudio from './components/RecruiterMatchStudio';
import ATSKanbanBoard from './components/ATSKanbanBoard';
import NotificationCenterView from './components/NotificationCenterView';
import SubscriptionAdminStudio from './components/SubscriptionAdminStudio';
import VectorExplorerModal from './components/VectorExplorerModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('recruiter'); // 'recruiter' | 'ats' | 'notifications' | 'candidate' | 'pricing'
  const [showExplorer, setShowExplorer] = useState(false);
  const [vectorCount, setVectorCount] = useState(15);
  const [quota, setQuota] = useState(null);

  const fetchHealthAndQuota = () => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.indexed_vectors) {
          setVectorCount(data.indexed_vectors);
        }
      })
      .catch(err => console.error(err));

    fetch('/api/subscription/overview')
      .then(res => res.json())
      .then(data => {
        if (data.current_quota) {
          setQuota(data.current_quota);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchHealthAndQuota();
  }, []);

  const handleTabChange = (tab) => {
    if (tab === 'explorer') {
      setShowExplorer(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header with Navigation & Live Quotas */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        vectorCount={vectorCount}
        quota={quota}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'recruiter' && (
          <RecruiterMatchStudio
            onQuotaUpdated={fetchHealthAndQuota}
          />
        )}

        {activeTab === 'ats' && (
          <ATSKanbanBoard
            onQuotaUpdated={fetchHealthAndQuota}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenterView
            onQuotaUpdated={fetchHealthAndQuota}
          />
        )}

        {activeTab === 'candidate' && (
          <CandidateSegmentStudio
            onCandidateIndexed={() => {
              fetchHealthAndQuota();
              setTimeout(() => {
                setActiveTab('recruiter');
              }, 1200);
            }}
          />
        )}

        {activeTab === 'pricing' && (
          <SubscriptionAdminStudio
            quota={quota}
            onQuotaUpdated={fetchHealthAndQuota}
          />
        )}
      </main>

      {/* Vector Store Explorer Modal */}
      {showExplorer && (
        <VectorExplorerModal onClose={() => setShowExplorer(false)} />
      )}
    </div>
  );
}
