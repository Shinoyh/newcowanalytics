import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import GrowthSummaryCard from './components/GrowthSummaryCard';
import EngagementChart from './components/EngagementChart';
import TopHooks from './components/TopHooks';
import PeriodPostsList from './components/PeriodPostsList';
import ChannelSelectModal from './components/ChannelSelectModal';
import ChannelAiModal from './components/ChannelAiModal';
import HomeDashboard from './components/HomeDashboard';
import { socialAnalyticsApi } from './services/api';

function App() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [videoTypeFilter, setVideoTypeFilter] = useState('ALL'); // ALL, SHORT, LONG

  const [channelAiData, setChannelAiData] = useState(null);
  const [platform, setPlatform] = useState('instagram');
  const [showModal, setShowModal] = useState(false);
  const [showChannelAiModal, setShowChannelAiModal] = useState(false);
  const [searchQueryForModal, setSearchQueryForModal] = useState('');

  const handleSearch = async (username, isFromSuggestion = false) => {
    if (!username || username.trim() === '') {
        alert("검색어를 입력해주세요.");
        return;
    }
    
    if (platform === 'youtube' && !isFromSuggestion) {
        // Just trigger modal if youtube and not already selected
        setSearchQueryForModal(username);
        setShowModal(true);
        return;
    }
    
    await executeAnalyze(platform, username);
  };

  const executeAnalyze = async (selectedPlatform, username) => {
    setPlatform(selectedPlatform); // ensure platform state matches
    setShowModal(false);
    setIsLoading(true);
    setError('');
    
    try {
      const result = await socialAnalyticsApi.analyzeAccount(selectedPlatform, username);
      setData(result);
      setSelectedPeriod(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch analytics data. Please try again or check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = data && data.recentPosts ? data.recentPosts.filter(p => {
      if (videoTypeFilter === 'ALL') return true;
      return p.videoType === videoTypeFilter;
  }) : [];

  return (
    <div className="app-container">
      <main className="main-content">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <h1 onClick={() => setData(null)} style={{ cursor: 'pointer' }}>NewCow Analytics</h1>
              <p>Professional B2B Social Media Intelligence</p>
          </div>
          {data && (
              <button 
                  onClick={() => setData(null)} 
                  className="toggle-btn"
                  style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>HOME</span>
              </button>
          )}
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${platform === 'instagram' ? 'active' : ''}`}
              onClick={() => { setPlatform('instagram'); setData(null); }}
            >
              Instagram
            </button>
            <button 
              className={`toggle-btn ${platform === 'youtube' ? 'active' : ''}`}
              onClick={() => { setPlatform('youtube'); setData(null); }}
            >
              YouTube
            </button>
          </div>
        </div>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} platform={platform} />

        {isLoading && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 17, 26, 0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                <div className="loading-spinner" style={{ width: '4rem', height: '4rem', borderWidth: '4px', marginBottom: '1.5rem' }}></div>
                <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 600 }}>데이터 딥 다이빙 중...</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>계정의 모든 데이터를 정밀 분석하고 있습니다.</p>
            </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {isAiLoading && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 17, 26, 0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                <div className="loading-spinner" style={{ width: '4rem', height: '4rem', borderWidth: '4px', marginBottom: '1.5rem', borderTopColor: '#10b981' }}></div>
                <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 600 }}>AI 분석 중...</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>최대 30초 정도 소요될 수 있습니다.</p>
            </div>
        )}

        {!data && !isLoading && !error && (
            <HomeDashboard 
                onSelectAccount={executeAnalyze} 
                platform={platform} 
                onAiAnalysisRequest={async (plat, username) => {
                    setIsAiLoading(true);
                    try {
                        let result = await socialAnalyticsApi.analyzeChannelAi(plat, username);
                        if (typeof result === 'string') {
                            try { result = JSON.parse(result); } catch(e) {}
                        }
                        result._meta = { platform: plat, username };
                        setChannelAiData(result);
                        setShowChannelAiModal(true);
                    } catch (error) {
                        alert("채널 총평 분석에 실패했습니다.");
                    } finally {
                        setIsAiLoading(false);
                    }
                }}
            />
        )}

        {data && data.recentPosts && (
          <>
            <div className="dashboard-grid">
              <div>
                <GrowthSummaryCard 
                  growthRate={data.growthRate} 
                  totalPosts={filteredPosts.length} 
                />
                <div className="glass-card" style={{ marginTop: '1.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {data.profilePictureUrl && (
                        <img 
                            src={data.profilePictureUrl} 
                            alt="Profile" 
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} 
                        />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 className="stat-label">Account Details</h3>
                      <div style={{ marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.username}</p>
                      </div>
                      <div style={{ marginTop: '0.2rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{data.platform}</p>
                      </div>
                    </div>
                  </div>
                  <button 
                      onClick={async () => {
                          if (channelAiData && channelAiData._meta?.username === data.username) {
                              setShowChannelAiModal(true);
                              return;
                          }
                          setIsAiLoading(true);
                          try {
                              let result = await socialAnalyticsApi.analyzeChannelAi(data.platform, data.username);
                              if (typeof result === 'string') {
                                  try { result = JSON.parse(result); } catch(e) {}
                              }
                              result._meta = { platform: data.platform, username: data.username };
                              setChannelAiData(result);
                              setShowChannelAiModal(true);
                          } catch (error) {
                              alert("채널 총평 분석에 실패했습니다.");
                          } finally {
                              setIsAiLoading(false);
                          }
                      }}
                      style={{
                          width: '100%',
                          padding: '0.8rem 1.2rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                  >
                      ✨ AI 채널 총평 분석
                  </button>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px' }}>
                    <button className={`toggle-btn ${videoTypeFilter === 'ALL' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('ALL')}>전체</button>
                    <button className={`toggle-btn ${videoTypeFilter === 'SHORT' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('SHORT')}>숏츠/릴스</button>
                    <button className={`toggle-btn ${videoTypeFilter === 'LONG' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('LONG')}>롱폼</button>
                </div>
                <EngagementChart data={filteredPosts} onChartClick={setSelectedPeriod} />
              </div>
            </div>
            
            <TopHooks posts={filteredPosts} />

            {selectedPeriod && <PeriodPostsList payload={selectedPeriod} />}
          </>
        )}
        
        {data && filteredPosts.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>No recent posts found for this filter.</p>
          </div>
        )}
      </main>

      {showModal && (
          <ChannelSelectModal 
              query={searchQueryForModal} 
              platform={platform} 
              onClose={() => setShowModal(false)}
              onSelect={(username) => executeAnalyze(platform, username)}
          />
      )}
        <ChannelAiModal 
            isOpen={showChannelAiModal} 
            onClose={() => setShowChannelAiModal(false)} 
            data={channelAiData}
            onRefresh={channelAiData && channelAiData._meta ? async () => {
                setShowChannelAiModal(false);
                setIsAiLoading(true);
                try {
                    let result = await socialAnalyticsApi.analyzeChannelAi(channelAiData._meta.platform, channelAiData._meta.username, true);
                    if (typeof result === 'string') {
                        try { result = JSON.parse(result); } catch(e) {}
                    }
                    result._meta = channelAiData._meta;
                    setChannelAiData(result);
                    setShowChannelAiModal(true);
                } catch (error) {
                    alert("최신화 분석에 실패했습니다.");
                    setShowChannelAiModal(true);
                } finally {
                    setIsAiLoading(false);
                }
            } : null}
        />
    </div>
  );
}

export default App;
