import React from 'react';
import { Eye, Heart, MessageCircle } from 'lucide-react';

function CompletedAiListModal({ posts = [], onClose, onOpenResultModal }) {
    // Filter posts that have valid AI analysis result
    const completedPosts = posts.filter(post => {
        if (!post.aiAnalysisResult) return false;
        try {
            let clean = post.aiAnalysisResult.trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                clean = clean.substring(start, end + 1);
            }
            const aiData = JSON.parse(clean);
            return aiData && !aiData.error && aiData.status !== 'queued';
        } catch(e) {
            return false;
        }
    });

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ✨ AI 분석 완료된 영상 목록 ({completedPosts.length}개)
                    </h3>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.4rem', padding: '0 0.2rem', lineHeight: '1' }}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                    {completedPosts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            아직 AI 분석이 완료된 영상이 없습니다.
                        </div>
                    ) : (
                        completedPosts.map(post => {
                            const captionStr = post.caption || "No caption provided";
                            const title = captionStr.length > 50 ? captionStr.substring(0, 50) + '...' : captionStr;
                            
                            return (
                                <div 
                                    key={post.id}
                                    onClick={() => {
                                        onClose();
                                        onOpenResultModal(post.id);
                                    }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: '1px solid var(--accent-success)',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                        {title}
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Eye size={14} /> {post.viewCount?.toLocaleString()}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Heart size={14} color="#ec4899" /> {post.likeCount?.toLocaleString()}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <MessageCircle size={14} color="#eab308" /> {post.commentsCount?.toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <div style={{ color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                        분석 완료! ✨ (클릭하여 족집게 요약 보기)
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default CompletedAiListModal;
