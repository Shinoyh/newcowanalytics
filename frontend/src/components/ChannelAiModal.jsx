import React from 'react';

function ChannelAiModal({ isOpen, onClose, data, onRefresh }) {
    if (!isOpen || !data) return null;

    // Handle potential error from API rate limit or other issues
    if (data.error) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>⚠️ AI 분석 오류</h2>
                        <button className="modal-close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="error-msg">
                            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>AI 분석 중 오류가 발생했습니다.</p>
                            <p style={{ fontSize: '0.9rem' }}>{data.error}</p>
                            {data.error.includes("UNAVAILABLE") && (
                                <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                    현재 AI 서버(Gemini)에 요청이 폭주하여 일시적으로 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>✨ 채널 AI 총평 리포트</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {onRefresh && (
                            <button onClick={onRefresh} style={{
                                padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--accent-primary)',
                                backgroundColor: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer',
                                fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                            >
                                🔄 최신화
                            </button>
                        )}
                        <button className="modal-close-btn" onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>📈 성장 추세</h4>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.growth_trend}</p>
                        </div>
                        
                        <div>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>📝 분석 요약</h4>
                            <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>{data.analysis_summary}</p>
                        </div>
                        
                        <div>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>🎯 핵심 요인 (Key Drivers)</h4>
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {data.key_drivers?.map((driver, idx) => (
                                    <li key={idx} style={{ 
                                        padding: '0.8rem', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem',
                                        borderLeft: '4px solid var(--accent-primary)'
                                    }}>
                                        {driver}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>💡 전략 제안</h4>
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {data.strategic_advice?.map((advice, idx) => (
                                    <li key={idx} style={{ 
                                        padding: '0.8rem', 
                                        background: 'rgba(16, 185, 129, 0.05)', 
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem',
                                        borderLeft: '4px solid var(--accent-success)'
                                    }}>
                                        {advice}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChannelAiModal;
