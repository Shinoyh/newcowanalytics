import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import GrowthSummaryCard from './components/GrowthSummaryCard';
import EngagementChart from './components/EngagementChart';
import TopHooks from './components/TopHooks';
import PeriodPostsList from './components/PeriodPostsList';
import ChannelSelectModal from './components/ChannelSelectModal';
import ChannelAiModal from './components/ChannelAiModal';
import HomeDashboard from './components/HomeDashboard';
import JobProgressToast from './components/JobProgressToast';
import VideoAiModal from './components/VideoAiModal';
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

  // Video AI Modal state
  const [videoModalPost, setVideoModalPost] = useState(null);
  const [videoModalResult, setVideoModalResult] = useState(null);

  // Batch analysis state
  const [selectedPostIds, setSelectedPostIds] = useState(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isAnyJobActive, setIsAnyJobActive] = useState(false);

  useEffect(() => {
      setSelectedPostIds(new Set());
  }, [data]);

  const handleToggleSelect = (postId) => {
    setSelectedPostIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBatchAnalyze = async () => {
    if (selectedPostIds.size === 0) return;
    setIsBatchLoading(true);
    try {
      const postIds = Array.from(selectedPostIds);
      await socialAnalyticsApi.batchAnalyzeVideos(postIds);
      alert(`${postIds.length}개의 영상 일괄 분석이 큐에 등록되었습니다.`);
      setSelectedPostIds(new Set());
    } catch (error) {
      console.error("Batch analyze failed", error);
      alert("일괄 분석 요청에 실패했습니다.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleOpenVideoModal = async (postId) => {
      // Find the post object (use loose equality because p.id might be a string from backend)
      const post = data?.recentPosts?.find(p => p.id == postId);
      if (!post) {
          alert("영상을 찾을 수 없습니다.");
          return;
      }
      try {
          const result = await socialAnalyticsApi.analyzeVideoAi(postId);
          if (result.status === 'queued') {
              alert("아직 큐 대기 중이거나 처리 중입니다.");
              return;
          }
          setVideoModalPost(post);
          setVideoModalResult(result);
      } catch (err) {
          console.error("Failed to fetch video AI result", err);
          alert("AI 분석 결과를 가져오는데 실패했습니다.");
      }
  };

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
                                  try { 
                                      const jsonStart = result.indexOf('{');
                                      const jsonEnd = result.lastIndexOf('}');
                                      if (jsonStart !== -1 && jsonEnd !== -1) {
                                          result = JSON.parse(result.substring(jsonStart, jsonEnd + 1));
                                      } else {
                                          result = JSON.parse(result); 
                                      }
                                  } catch(e) {}
                              }
                              if (typeof result === 'object' && result !== null) {
                                  result._meta = { platform: data.platform, username: data.username };
                              }
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px', alignItems: 'center' }}>
                    <button 
                        onClick={() => executeAnalyze(data.platform, data.username)}
                        style={{
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.9rem', 
                            borderRadius: '20px', 
                            border: '1px solid var(--accent-primary)',
                            backgroundColor: 'transparent',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.2s'
                        }}
                        title="최신 채널 데이터(영상, 조회수 등)를 소셜 플랫폼에서 다시 가져옵니다."
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    >
                        🔄 데이터 갱신
                    </button>
                    <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                    <button className={`toggle-btn ${videoTypeFilter === 'ALL' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('ALL')}>전체</button>
                    <button className={`toggle-btn ${videoTypeFilter === 'SHORT' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('SHORT')}>숏츠/릴스</button>
                    <button className={`toggle-btn ${videoTypeFilter === 'LONG' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={() => setVideoTypeFilter('LONG')}>롱폼</button>
                </div>
                <EngagementChart data={filteredPosts} onChartClick={setSelectedPeriod} />
              </div>
            </div>
            
            <TopHooks 
                posts={filteredPosts} 
                selectedPostIds={selectedPostIds} 
                onToggleSelect={handleToggleSelect}
                onOpenVideoModal={handleOpenVideoModal} 
            />

            {selectedPeriod && (
                <PeriodPostsList 
                    payload={selectedPeriod} 
                    selectedPostIds={selectedPostIds} 
                    onToggleSelect={handleToggleSelect}
                    onOpenVideoModal={handleOpenVideoModal}
                />
            )}
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
                        try { 
                            const jsonStart = result.indexOf('{');
                            const jsonEnd = result.lastIndexOf('}');
                            if (jsonStart !== -1 && jsonEnd !== -1) {
                                result = JSON.parse(result.substring(jsonStart, jsonEnd + 1));
                            } else {
                                result = JSON.parse(result); 
                            }
                        } catch(e) {}
                    }
                    if (typeof result === 'object' && result !== null) {
                        result._meta = channelAiData._meta;
                    }
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
        <JobProgressToast 
            onOpenResultModal={handleOpenVideoModal} 
            isChannelAiLoading={isAiLoading} 
            onActiveJobsChange={setIsAnyJobActive}
        />

        {selectedPostIds.size > 0 && (
            <div style={{
              position: 'fixed',
              top: '50%',
              right: '20px',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(59, 130, 246, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '1.2rem',
              borderRadius: '20px',
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              zIndex: 9998
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>
                선택됨<br/>{selectedPostIds.size}개
              </span>
              <button 
                onClick={handleBatchAnalyze}
                disabled={isBatchLoading || isAnyJobActive}
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'white',
                  color: (isBatchLoading || isAnyJobActive) ? '#9ca3af' : '#3b82f6',
                  fontWeight: 'bold',
                  cursor: (isBatchLoading || isAnyJobActive) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                <span style={{ fontSize: '0.85rem' }}>일괄 분석</span>
              </button>
            </div>
        )}

        <VideoAiModal 
            isOpen={!!videoModalResult} 
            onClose={() => { setVideoModalResult(null); setVideoModalPost(null); }} 
            post={videoModalPost} 
            aiResult={videoModalResult} 
        />
    </div>
  );
}

export default App;
