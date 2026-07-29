import React, { useState, useEffect } from 'react';
import { socialAnalyticsApi } from '../services/api';
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis } from 'recharts';

const HomeDashboard = ({ onSelectAccount, platform, onAiAnalysisRequest }) => {
    const [recentAccounts, setRecentAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshingAccount, setRefreshingAccount] = useState(null);

    const fetchRecent = async () => {
        try {
            const data = await socialAnalyticsApi.getRecentSearches();
            setRecentAccounts(data);
        } catch (err) {
            console.error("Failed to fetch recent searches", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecent();
    }, []);

    const handleRefresh = async (e, username) => {
        e.stopPropagation();
        if (refreshingAccount) return;
        setRefreshingAccount(username);
        try {
            // Re-analyze to fetch new data
            await socialAnalyticsApi.analyzeAccount(platform, username);
            // Re-fetch dashboard data
            await fetchRecent();
        } catch (err) {
            console.error("Failed to refresh account", err);
        } finally {
            setRefreshingAccount(null);
        }
    };

    const handlePinToggle = async (e, username) => {
        e.stopPropagation();
        try {
            await socialAnalyticsApi.togglePin(platform, username);
            await fetchRecent();
        } catch (err) {
            console.error("Failed to toggle pin", err);
        }
    };

    const handleDelete = async (e, username) => {
        e.stopPropagation();
        if (window.confirm(`${username} 계정을 분석 목록에서 삭제하시겠습니까?`)) {
            try {
                await socialAnalyticsApi.deleteAccount(platform, username);
                await fetchRecent();
            } catch (err) {
                console.error("Failed to delete account", err);
                alert("계정 삭제에 실패했습니다.");
            }
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loading-spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }}></div>
            </div>
        );
    }

    const platformAccounts = recentAccounts.filter(acc => acc.platform.toLowerCase() === platform);
    
    // Sort so pinned are first
    const pinnedAccounts = platformAccounts.filter(acc => acc.pinned).slice(0, 4);
    const unpinnedAccounts = platformAccounts.filter(acc => !acc.pinned);
    
    // If less than 4 pinned, fill the rest with unpinned up to 4 total for the cards
    const cardAccounts = [...pinnedAccounts];
    let i = 0;
    while (cardAccounts.length < 4 && i < unpinnedAccounts.length) {
        cardAccounts.push(unpinnedAccounts[i]);
        i++;
    }
    
    // The rest go to the history list
    const historyAccounts = unpinnedAccounts.slice(i);

    if (platformAccounts.length === 0) {
        return (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
                <h2>환영합니다!</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>상단 검색창에 {platform === 'youtube' ? '유튜브 채널명을' : '인스타그램 아이디를'} 검색하여 분석을 시작해보세요.</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>최근 분석한 계정</h2>
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {cardAccounts.map((account, idx) => {
                    // Calculate medians for the visual ReferenceLine
                    const rawPosts = account.recentPosts || [];
                    let pastMedian = 0;
                    let recentMedian = 0;
                    
                    if (rawPosts.length >= 2) {
                        const mid = Math.floor(rawPosts.length / 2);
                        // rawPosts is New -> Old. So recent is 0..mid, past is mid..end
                        const recentHalf = rawPosts.slice(0, mid).map(p => p.engagement).sort((a,b) => a - b);
                        const pastHalf = rawPosts.slice(mid).map(p => p.engagement).sort((a,b) => a - b);
                        
                        pastMedian = pastHalf.length % 2 === 0 
                            ? (pastHalf[pastHalf.length/2 - 1] + pastHalf[pastHalf.length/2]) / 2 
                            : pastHalf[Math.floor(pastHalf.length/2)];
                            
                        recentMedian = recentHalf.length % 2 === 0 
                            ? (recentHalf[recentHalf.length/2 - 1] + recentHalf[recentHalf.length/2]) / 2 
                            : recentHalf[Math.floor(recentHalf.length/2)];
                    }

                    // Create mini chart data (reverse to chronological: Past -> Recent)
                    const midIndex = Math.floor(rawPosts.length / 2);
                    const chartData = [...rawPosts].reverse().map((p, i) => {
                        const isPast = i < midIndex;
                        return {
                            name: `Post ${i}`,
                            engagement: p.engagement,
                            pastMedianLine: isPast ? pastMedian : null,
                            recentMedianLine: !isPast ? recentMedian : null
                        };
                    });

                    return (
                        <div 
                            key={idx} 
                            className="glass-card" 
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '1.5rem', position: 'relative' }}
                            onClick={() => onSelectAccount(account.platform.toLowerCase(), account.username)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={(e) => handleRefresh(e, account.username)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                                    title="새로고침"
                                >
                                    {refreshingAccount === account.username ? (
                                        <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                                    ) : (
                                        "🔄"
                                    )}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAiAnalysisRequest(account.platform.toLowerCase(), account.username); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', marginLeft: '0.2rem' }}
                                    title="AI 채널 총평 분석"
                                >
                                    ✨
                                </button>
                                <button 
                                    onClick={(e) => handlePinToggle(e, account.username)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', opacity: account.pinned ? 1 : 0.5 }}
                                    title={account.pinned ? "고정 해제" : "고정하기"}
                                >
                                    📌
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, account.username)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.2rem', marginLeft: '0.2rem', lineHeight: '1' }}
                                    title="삭제하기"
                                >
                                    &times;
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingRight: '8.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {account.profilePictureUrl && (
                                        <img src={account.profilePictureUrl} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                    )}
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{account.username}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                            {account.platform}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>최근 성장률</div>
                                    <div style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: 'bold', 
                                        color: account.growthRate >= 0 ? 'var(--text-success)' : 'var(--text-danger)' 
                                    }} title="과거 절반 대비 최근 절반의 중앙값 변화율">
                                        {account.growthRate >= 0 ? '+' : ''}{account.growthRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ height: '80px', width: '100%', marginTop: '1rem', position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <XAxis dataKey="name" hide />
                                        <YAxis hide />
                                        <Line 
                                            type="monotone" 
                                            dataKey="engagement" 
                                            stroke={account.growthRate >= 0 ? '#10b981' : '#ef4444'} 
                                            strokeWidth={1.5} 
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                        <Line 
                                            type="step" 
                                            dataKey="pastMedianLine" 
                                            stroke="rgba(255,255,255,0.7)" 
                                            strokeWidth={2} 
                                            strokeDasharray="5 5"
                                            dot={false}
                                            isAnimationActive={false}
                                            connectNulls={false}
                                        />
                                        <Line 
                                            type="step" 
                                            dataKey="recentMedianLine" 
                                            stroke="rgba(255,255,255,0.9)" 
                                            strokeWidth={2} 
                                            strokeDasharray="5 5"
                                            dot={false}
                                            isAnimationActive={false}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {historyAccounts.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>이전 검색 기록</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {historyAccounts.map((account, idx) => (
                            <div 
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            >
                                <span style={{ cursor: 'pointer' }} onClick={() => onSelectAccount(account.platform.toLowerCase(), account.username)}>
                                    {account.username} <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '0.3rem' }}>({account.platform})</span>
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAiAnalysisRequest(account.platform.toLowerCase(), account.username); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginLeft: '0.3rem' }}
                                    title="AI 채널 총평 분석"
                                >
                                    ✨
                                </button>
                                <button 
                                    onClick={(e) => handlePinToggle(e, account.username)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', opacity: account.pinned ? 1 : 0.3 }}
                                    title="고정하기"
                                >
                                    📌
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, account.username)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0', marginLeft: '0.3rem', fontSize: '1.2rem', lineHeight: '1' }}
                                    title="삭제하기"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeDashboard;
