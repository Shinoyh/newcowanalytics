import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, MessageCircle, Heart, ChevronLeft, ChevronRight, Eye, Zap } from 'lucide-react';
import HoverVideo from './HoverVideo';
import { socialAnalyticsApi } from '../services/api';

const PeriodPostsList = ({ payload, selectedPostIds, onToggleSelect, onOpenVideoModal }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const listRef = useRef(null);

  // Reset page when payload changes
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

  const parseAiResult = (resultStr) => {
      if (!resultStr) return null;
      let clean = resultStr.trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
          clean = clean.substring(start, end + 1);
      }
      try { return JSON.parse(clean); } catch(e) { return null; }
  };

  const handleAnalyzeVideo = async (postId, hasAnalysis) => {
    if (hasAnalysis && onOpenVideoModal) {
        onOpenVideoModal(postId);
        return;
    }
    try {
      // Just fire and forget for single video (async background)
      const result = await socialAnalyticsApi.analyzeVideoAi(postId);
      if (result.status === 'already_completed' || (result.hooking_analysis)) {
        if (onOpenVideoModal) {
            onOpenVideoModal(postId);
        } else {
            alert("이 영상은 이미 분석이 완료되었습니다. Toast 알림창 또는 채널 하단을 확인하세요.");
        }
      } else {
        alert("개별 영상 분석이 백그라운드에서 시작되었습니다.");
      }
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("AI 영상 분석 요청에 실패했습니다.");
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
          const aiData = parseAiResult(post.aiAnalysisResult);
          const hasAnalysis = aiData && !aiData.error && aiData.status !== 'queued';

          return (
            <div key={post.platformPostId} className="period-post-card" style={{ position: 'relative' }}>
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
                
                {hasAnalysis && aiData.summary_and_keywords && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>✨ AI 3줄 요약</h4>
                        <ul style={{ paddingLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                            {aiData.summary_and_keywords.three_line_summary?.slice(0, 3).map((line, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{line}</li>)}
                        </ul>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                      onClick={() => handleAnalyzeVideo(post.id, hasAnalysis)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: hasAnalysis ? 'rgba(59, 130, 246, 0.2)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        color: hasAnalysis ? '#3b82f6' : 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        border: hasAnalysis ? '1px solid rgba(59, 130, 246, 0.5)' : 'none'
                      }}
                  >
                    <Zap size={18} />
                    {hasAnalysis ? "✨ 상세 분석 결과 열기" : "🤖 AI 족집게 분석"}
                  </button>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '46px', height: '46px', borderRadius: '8px',
                    backgroundColor: (selectedPostIds && selectedPostIds.has(post.id)) ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (selectedPostIds && selectedPostIds.has(post.id)) ? '2px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPostIds && selectedPostIds.has(post.id)}
                      onChange={() => onToggleSelect && onToggleSelect(post.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8b5cf6', margin: 0 }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodPostsList;
