import React, { useState } from 'react';
import { TrendingUp, MessageCircle, Heart, Award, Eye, Zap } from 'lucide-react';
import HoverVideo from './HoverVideo';
import { socialAnalyticsApi } from '../services/api';

const TopHooks = ({ posts }) => {
  const [analyzingPostId, setAnalyzingPostId] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState({});
  const [cooldowns, setCooldowns] = useState({});

  React.useEffect(() => {
    if (posts && posts.length > 0) {
      const initialResults = {};
      posts.forEach(post => {
        if (post.aiAnalysisResult) {
          try {
            initialResults[post.id] = typeof post.aiAnalysisResult === 'string' 
              ? JSON.parse(post.aiAnalysisResult) 
              : post.aiAnalysisResult;
          } catch(e) {}
        }
      });
      setAiAnalysisResults(prev => ({ ...prev, ...initialResults }));
    }
  }, [posts]);

  if (!posts || posts.length === 0) return null;

  // 정렬: 조회수(viewCount) 기준 내림차순 후 상위 3개 추출
  const sortedPosts = [...posts].sort((a, b) => (b.viewCount || b.engagement || 0) - (a.viewCount || a.engagement || 0));
  const topHooks = sortedPosts.slice(0, 3);

  const handleAnalyzeVideo = async (postId) => {
    if (analyzingPostId === postId || cooldowns[postId]) return;
    
    setAnalyzingPostId(postId);
    try {
      const isRetry = !!aiAnalysisResults[postId];
      let result = await socialAnalyticsApi.analyzeVideoAi(postId, isRetry);
      if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch (e) { console.error("JSON parse error:", e); }
      }
      setAiAnalysisResults(prev => ({ ...prev, [postId]: result }));
      
      setCooldowns(prev => ({ ...prev, [postId]: true }));
      setTimeout(() => {
        setCooldowns(prev => ({ ...prev, [postId]: false }));
      }, 5000);
      
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("AI 영상 분석에 실패했습니다.");
    } finally {
      setAnalyzingPostId(null);
    }
  };

  return (
    <div className="top-hooks-container glass-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Award className="accent-icon" size={24} color="var(--accent-primary)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Top Hooks (최고 반응형 콘텐츠)</h2>
      </div>

      {analyzingPostId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 17, 26, 0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div className="loading-spinner" style={{ width: '4rem', height: '4rem', borderWidth: '4px', marginBottom: '1.5rem', borderTopColor: '#8b5cf6' }}></div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 600 }}>개별 영상 AI 분석 중...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>영상의 프레임과 사운드를 분석하느라 최대 30초 정도 소요될 수 있습니다.</p>
        </div>
      )}
      
      <div className="top-hooks-grid">
        {topHooks.map((post, index) => (
          <div key={post.platformPostId} className="hook-card">
            <div className="hook-rank">#{index + 1}</div>
            {post.mediaUrl && (
              <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                <HoverVideo src={post.mediaUrl} platform={post.platform} style={{ width: '100%', height: '200px' }} />
              </div>
            )}
            <div className="hook-stats">
              <span className="stat-item highlight">
                <Eye size={16} /> {post.viewCount?.toLocaleString()}
              </span>
              <span className="stat-item">
                <Heart size={16} color="#ec4899" /> {post.likeCount?.toLocaleString()}
              </span>
              <span className="stat-item">
                <MessageCircle size={16} color="#eab308" /> {post.commentsCount?.toLocaleString()}
              </span>
              <span className="stat-item">
                <TrendingUp size={16} color="#f97316" /> {post.engagement?.toLocaleString()}
              </span>
            </div>
            <div className="hook-caption" style={{ marginBottom: '1rem' }}>
              {post.caption || "No caption provided"}
            </div>
            
            <button 
                onClick={() => handleAnalyzeVideo(post.id)}
                disabled={analyzingPostId === post.id || cooldowns[post.id]}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: (analyzingPostId === post.id || cooldowns[post.id]) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (analyzingPostId === post.id || cooldowns[post.id]) ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
            >
              {analyzingPostId === post.id ? (
                  <>
                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                    AI 분석 중... (최대 30초 소요)
                  </>
              ) : cooldowns[post.id] ? (
                  <>
                    <Zap size={18} />
                    잠시 후 다시 분석 가능
                  </>
              ) : aiAnalysisResults[post.id] ? (
                  <>
                    <Zap size={18} />
                    🔄 AI 다시 분석하기
                  </>
              ) : (
                  <>
                    <Zap size={18} />
                    🤖 AI 족집게 분석
                  </>
              )}
            </button>

            {aiAnalysisResults[post.id] && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.9rem' }}>
                {aiAnalysisResults[post.id].error ? (
                  <div style={{ color: 'var(--text-danger)', textAlign: 'center', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>⚠️ 분석 실패</h4>
                    <p>{aiAnalysisResults[post.id].error}</p>
                    {aiAnalysisResults[post.id].error.includes("UNAVAILABLE") && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>현재 구글 서버 트래픽이 많아 지연 중입니다. 잠시 후 시도해주세요.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>✨ 3줄 요약</h4>
                <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  {aiAnalysisResults[post.id].summary_and_keywords?.three_line_summary?.map((line, i) => <li key={i}>{line}</li>)}
                </ul>

                <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>🔥 후킹 분석 (점수: {aiAnalysisResults[post.id].hooking_analysis?.hook_score}점)</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>유형:</strong> {aiAnalysisResults[post.id].hooking_analysis?.primary_hook_type}</p>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                  <div style={{ marginBottom: '0.3rem' }}><strong>시각:</strong> {aiAnalysisResults[post.id].hooking_analysis?.breakdown?.visual_hook}</div>
                  <div style={{ marginBottom: '0.3rem' }}><strong>청각:</strong> {aiAnalysisResults[post.id].hooking_analysis?.breakdown?.audio_hook}</div>
                  <div><strong>텍스트:</strong> {aiAnalysisResults[post.id].hooking_analysis?.breakdown?.text_hook}</div>
                </div>

                <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>📈 개선 피드백</h4>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                  {aiAnalysisResults[post.id].improvement_feedback?.map((fb, i) => <li key={i}>{fb}</li>)}
                </ul>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopHooks;
