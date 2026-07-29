import React from 'react';
import HoverVideo from './HoverVideo';

function VideoAiModal({ isOpen, onClose, post, aiResult }) {
    if (!isOpen || !post || !aiResult) return null;

    let parsedResult = aiResult;
    if (typeof aiResult === 'string') {
        let cleanResult = aiResult.trim();
        try {
            const jsonStart = cleanResult.indexOf('{');
            const jsonEnd = cleanResult.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanResult = cleanResult.substring(jsonStart, jsonEnd + 1);
            }
            parsedResult = JSON.parse(cleanResult);
        } catch (e) {
            console.error("Failed to parse AI result JSON", e);
            if (aiResult === '{"status":"queued"}') {
                return null; // Don't show modal for queued status
            }
        }
    }

    if (parsedResult.error) {
        return (
            <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>⚠️ 영상 AI 분석 오류</h2>
                        <button className="modal-close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <p style={{ color: 'var(--accent-primary)' }}>{parsedResult.error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>✨ 영상 AI 심층 분석</h2>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        {post.mediaUrl && (
                            <div style={{ width: '150px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                                <HoverVideo src={post.mediaUrl} platform={post.platform} style={{ width: '100%', height: 'auto' }} />
                            </div>
                        )}
                        <div>
                            <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{post.caption || "No caption"}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>조회수: {post.viewCount?.toLocaleString()}</p>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>✨ 3줄 요약</h4>
                        <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                            {parsedResult.summary_and_keywords?.three_line_summary?.map((line, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{line}</li>)}
                        </ul>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {parsedResult.summary_and_keywords?.keywords?.map((kw, i) => (
                                <span key={i} style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>#{kw}</span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                            🔥 후킹 분석 <span style={{ color: 'white', background: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem', marginLeft: '0.5rem' }}>점수: {parsedResult.hooking_analysis?.hook_score}점</span>
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>유형:</strong> {parsedResult.hooking_analysis?.primary_hook_type}</p>
                        <div style={{ color: 'var(--text-secondary)', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#8b5cf6' }}>시각적 훅:</strong> {parsedResult.hooking_analysis?.breakdown?.visual_hook}</div>
                            <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#3b82f6' }}>청각적 훅:</strong> {parsedResult.hooking_analysis?.breakdown?.audio_hook}</div>
                            <div><strong style={{ color: '#ec4899' }}>텍스트 훅:</strong> {parsedResult.hooking_analysis?.breakdown?.text_hook}</div>
                        </div>
                    </div>

                    {parsedResult.emotional_triggers && parsedResult.emotional_triggers.length > 0 && (
                        <div>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>💖 감정 자극 포인트</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {parsedResult.emotional_triggers.map((trigger, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                        <div style={{ minWidth: '80px', fontWeight: 'bold' }}>{trigger.emotion}</div>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${trigger.percentage}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
                                        </div>
                                        <div style={{ width: '40px', textAlign: 'right' }}>{trigger.percentage}%</div>
                                        <div style={{ flex: 2, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{trigger.reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                            📈 개선 피드백 <span style={{ color: 'white', background: 'var(--accent-success)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem', marginLeft: '0.5rem' }}>바이럴 예상 점수: {parsedResult.viral_score}점</span>
                        </h4>
                        <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                            {parsedResult.improvement_feedback?.map((fb, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{fb}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VideoAiModal;
