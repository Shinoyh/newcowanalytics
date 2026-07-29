import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, MessageCircle, Heart, ChevronLeft, ChevronRight, Eye, Zap } from 'lucide-react';
import HoverVideo from './HoverVideo';
import { socialAnalyticsApi } from '../services/api';

const PeriodPostsList = ({ payload }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const listRef = useRef(null);
  
  const [analyzingPostId, setAnalyzingPostId] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState({});

  // Reset page and scroll into view when payload changes
  useEffect(() => {
    setCurrentPage(1);
    if (listRef.current) {
      setTimeout(() => {
        listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [payload]);

  if (!payload || !payload.posts || payload.posts.length === 0) return null;

  // Sort posts by viewCount (조회수) or engagement descending
  const sortedPosts = [...payload.posts].sort((a, b) => (b.viewCount || b.engagement || 0) - (a.viewCount || a.engagement || 0));
  
  // Pagination logic
  const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPosts = sortedPosts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handleAnalyzeVideo = async (postId) => {
    if (analyzingPostId === postId || aiAnalysisResults[postId]) return;
    
    setAnalyzingPostId(postId);
    try {
      const result = await socialAnalyticsApi.analyzeVideoAi(postId);
      setAiAnalysisResults(prev => ({ ...prev, [postId]: result }));
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("AI 영상 분석에 실패했습니다.");
    } finally {
      setAnalyzingPostId(null);
    }
  };

  return (
    <div ref={listRef} className="period-posts-container glass-card" style={{ marginTop: '1.5rem' }}>
      <div className="chart-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            상세 포스트 분석
          </h2>
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            선택된 기간: {payload.fullDate} ({sortedPosts.length}개의 포스트)
          </p>
        </div>
        
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '0.9rem', margin: '0 0.5rem' }}>
              {currentPage} / {totalPages}
            </span>
            <button 
              className="page-btn" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      
      <div className="period-posts-list">
        {currentPosts.map((post, index) => {
          const overallRank = startIndex + index + 1;
          return (
            <div key={post.platformPostId} className="period-post-card">
              <div className="post-rank">#{overallRank}</div>
              <div className="post-content">
                <div className="post-stats">
                  <span className="stat-item highlight">
                    <Eye size={14} /> {post.viewCount?.toLocaleString()}
                  </span>
                  <span className="stat-item">
                    <Heart size={14} color="#ec4899" /> {post.likeCount?.toLocaleString()}
                  </span>
                  <span className="stat-item">
                    <MessageCircle size={14} color="#eab308" /> {post.commentsCount?.toLocaleString()}
                  </span>
                  <span className="stat-item">
                    <TrendingUp size={14} color="#f97316" /> {post.engagement?.toLocaleString()}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(post.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {post.mediaUrl && (
                  <div style={{ marginTop: '0.5rem', borderRadius: '8px', overflow: 'hidden' }}>
                    <HoverVideo src={post.mediaUrl} platform={post.platform} style={{ width: '100%', maxHeight: '400px' }} />
                  </div>
                )}
                <div className="post-caption" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                  {post.caption || "No caption provided"}
                </div>
                
                <button 
                    onClick={() => handleAnalyzeVideo(post.id)}
                    disabled={analyzingPostId === post.id}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: analyzingPostId === post.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: analyzingPostId === post.id ? 0.7 : 1,
                      transition: 'opacity 0.2s'
                    }}
                >
                  {analyzingPostId === post.id ? (
                      <>
                        <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                        AI 분석 중... (최대 30초 소요)
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodPostsList;
