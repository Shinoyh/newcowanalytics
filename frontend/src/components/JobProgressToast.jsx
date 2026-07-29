import React, { useState, useEffect } from 'react';
import { socialAnalyticsApi } from '../services/api';

function JobProgressToast({ onOpenResultModal, isChannelAiLoading, onActiveJobsChange, onJobComplete, posts = [] }) {
    const [jobStatuses, setJobStatuses] = useState({});
    const [isClosed, setIsClosed] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const prevActiveCount = React.useRef(0);
    const prevChannelAiLoading = React.useRef(false);
    
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const statuses = await socialAnalyticsApi.getAiJobStatus();
                
                // Detect newly completed jobs
                if (onJobComplete) {
                    Object.entries(statuses).forEach(([postId, status]) => {
                        if (status === 'COMPLETED' && jobStatuses[postId] !== 'COMPLETED') {
                            onJobComplete(postId);
                        }
                    });
                }

                setJobStatuses(statuses);
            } catch (err) {
                console.error("Failed to fetch job statuses", err);
            }
        };

        const interval = setInterval(fetchStatus, 2000);
        fetchStatus(); // initial fetch
        return () => clearInterval(interval);
    }, [jobStatuses, onJobComplete]);

    const activeJobs = Object.entries(jobStatuses).filter(([_, status]) => 
        status !== 'NONE' && status !== 'cleared'
    );
    const hasRunningJobs = activeJobs.some(j => j[1] !== 'COMPLETED' && j[1] !== 'FAILED' && j[1] !== 'already_completed');

    useEffect(() => {
        if (onActiveJobsChange) {
            onActiveJobsChange(hasRunningJobs || isChannelAiLoading);
        }
    }, [hasRunningJobs, isChannelAiLoading, onActiveJobsChange]);

    useEffect(() => {
        if (activeJobs.length > prevActiveCount.current || (isChannelAiLoading && !prevChannelAiLoading.current)) {
            setIsClosed(false);
            setIsMinimized(false);
        }
        prevActiveCount.current = activeJobs.length;
        prevChannelAiLoading.current = isChannelAiLoading;
    }, [activeJobs.length, isChannelAiLoading]);

    if ((activeJobs.length === 0 && !isChannelAiLoading) || isClosed) return null;

    const getStatusText = (status) => {
        switch (status) {
            case 'WAITING': return '대기 중... ⏳';
            case 'DOWNLOADING': return '다운로드 중... 📥';
            case 'WAITING_ANALYZE': return 'AI 분석 대기 중... 🤖';
            case 'ANALYZING': return 'AI 심층 분석 중... 🧠';
            case 'COMPLETED': return '분석 완료! ✨ (클릭하여 확인)';
            case 'FAILED': return '오류 발생 ❌ (클릭하여 원인 보기)';
            case 'already_completed': return '이미 분석 완료됨 ✨ (클릭하여 확인)';
            case 'queued': return '큐 대기 중... ⏳';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        if (status === 'COMPLETED' || status === 'already_completed') return 'var(--accent-success)';
        if (status === 'FAILED') return '#ef4444';
        return 'var(--text-secondary)';
    };

    const handleJobClick = (postIdStr, status) => {
        if (status === 'COMPLETED' || status === 'already_completed' || status === 'FAILED') {
            if (onOpenResultModal) {
                onOpenResultModal(parseInt(postIdStr, 10));
            }
            socialAnalyticsApi.clearAiJobStatus(postIdStr).then(() => {
                setJobStatuses(prev => {
                    const next = { ...prev };
                    delete next[postIdStr];
                    return next;
                });
            });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            width: '320px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', display: activeJobs.some(j => j[1] !== 'COMPLETED' && j[1] !== 'FAILED') ? 'block' : 'none' }}></div>
                    AI 작업 진행 상황
                </h4>
                <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.4rem', padding: '0 0.4rem', lineHeight: '1' }}
                    >
                        {isMinimized ? '+' : '−'}
                    </button>
                    <button 
                        onClick={() => {
                            setIsClosed(true);
                            // Clear finished jobs from backend so they don't reappear
                            activeJobs.forEach(([postIdStr, status]) => {
                                if (status === 'COMPLETED' || status === 'FAILED' || status === 'already_completed') {
                                    socialAnalyticsApi.clearAiJobStatus(postIdStr);
                                }
                            });
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.2rem', lineHeight: '1' }}
                    >
                        &times;
                    </button>
                </div>
            </div>
            
            {!isMinimized && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {activeJobs.map(([postIdStr, status]) => {
                    const post = posts.find(p => p.id?.toString() === postIdStr.toString());
                    const captionStr = post && post.caption ? post.caption : '';
                    const title = captionStr 
                        ? (captionStr.length > 35 ? captionStr.substring(0, 35) + '...' : captionStr) 
                        : `Post ID: ${postIdStr}`;
                    return (
                        <div 
                            key={postIdStr}
                            onClick={() => handleJobClick(postIdStr, status)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '0.6rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                cursor: (status === 'COMPLETED' || status === 'already_completed' || status === 'FAILED') ? 'pointer' : 'default',
                                border: (status === 'COMPLETED' || status === 'already_completed') ? '1px solid var(--accent-success)' : (status === 'FAILED' ? '1px solid #ef4444' : '1px solid transparent'),
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                            </div>
                            <div style={{ color: getStatusColor(status) }}>
                                {getStatusText(status)}
                            </div>
                        </div>
                    );
                })}
                
                {isChannelAiLoading && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        border: '1px solid transparent'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>채널 총평 분석</div>
                        <div style={{ color: 'var(--accent-primary)' }}>
                            AI 분석 진행 중... 🧠
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
}

export default JobProgressToast;
