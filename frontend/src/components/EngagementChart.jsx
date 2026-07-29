import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const EngagementChart = ({ data, onChartClick }) => {
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const processedData = useMemo(() => {
        // 1. Filter by date range
        let filteredData = [...data].reverse(); // from oldest to newest
        
        if (startDate) {
            const start = new Date(startDate).getTime();
            filteredData = filteredData.filter(d => new Date(d.timestamp).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(endDate).getTime() + 86400000; // include the end day fully
            filteredData = filteredData.filter(d => new Date(d.timestamp).getTime() <= end);
        }

        if (filteredData.length === 0) return [];

        // 2. Aggregate data based on viewMode
        if (viewMode === 'daily') {
            return filteredData.map(post => {
                const d = new Date(post.timestamp);
                return {
                    label: `${d.getMonth() + 1}/${d.getDate()}`,
                    fullDate: d.toLocaleDateString(),
                    engagement: post.engagement,
                    likes: post.likeCount,
                    comments: post.commentsCount,
                    count: 1,
                    posts: [post]
                };
            });
        }

        // Grouping logic for weekly/monthly
        const groups = {};

        filteredData.forEach(post => {
            const d = new Date(post.timestamp);
            let key = '';
            let label = '';
            let fullDate = '';

            if (viewMode === 'weekly') {
                // Get week number (rough approximation for grouping)
                const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                key = `${d.getFullYear()}-W${weekNum}`;
                label = `W${weekNum}`;
                fullDate = `${d.getFullYear()} Week ${weekNum}`;
            } else if (viewMode === 'monthly') {
                key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                label = `${d.getMonth() + 1}월`;
                fullDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            }

            if (!groups[key]) {
                groups[key] = { label, fullDate, totalEngagement: 0, totalLikes: 0, totalComments: 0, count: 0, posts: [] };
            }
            
            groups[key].totalEngagement += post.engagement;
            groups[key].totalLikes += post.likeCount;
            groups[key].totalComments += post.commentsCount;
            groups[key].count += 1;
            groups[key].posts.push(post);
        });

        // Calculate averages
        return Object.values(groups).map(g => ({
            label: g.label,
            fullDate: g.fullDate,
            engagement: Math.round(g.totalEngagement / g.count),
            likes: Math.round(g.totalLikes / g.count),
            comments: Math.round(g.totalComments / g.count),
            count: g.count,
            posts: g.posts
        }));

    }, [data, viewMode, startDate, endDate]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const pointData = payload[0].payload;
            return (
                <div style={{
                    background: 'rgba(26, 29, 45, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    color: '#fff',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#a0aec0' }}>{pointData.fullDate}</p>
                    {viewMode !== 'daily' && (
                        <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#a0aec0' }}>
                            Posts in period: {pointData.count}
                        </p>
                    )}
                    <p style={{ margin: '8px 0', fontSize: '1.2rem', color: '#3b82f6' }}>
                        {viewMode === 'daily' ? 'Engagement:' : 'Avg Engagement:'} <strong>{pointData.engagement.toLocaleString()}</strong>
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>Likes: {pointData.likes.toLocaleString()}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>Comments: {pointData.comments.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="chart-header">
                <h3 className="stat-label">Engagement Trend</h3>
                <div className="chart-controls">
                    <div className="date-picker-group">
                        <input 
                            type="date" 
                            className="date-input" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                        />
                        <span style={{ color: '#a0aec0' }}>~</span>
                        <input 
                            type="date" 
                            className="date-input" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                        />
                    </div>
                    <div className="toggle-group">
                        <button 
                            className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
                            onClick={() => setViewMode('daily')}
                        >
                            일간
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                            onClick={() => setViewMode('weekly')}
                        >
                            주간
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                            onClick={() => setViewMode('monthly')}
                        >
                            월간
                        </button>
                    </div>
                </div>
            </div>

            <div className="chart-container" style={{ flex: 1, minHeight: '350px' }}>
                {processedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                            data={processedData} 
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                            onClick={(e) => {
                                if (e && e.activePayload && onChartClick) {
                                    onChartClick(e.activePayload[0].payload);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <defs>
                                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="label" 
                                stroke="#a0aec0" 
                                tick={{ fill: '#a0aec0', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis 
                                stroke="#a0aec0" 
                                tick={{ fill: '#a0aec0', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="engagement" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorEngagement)" 
                                activeDot={{ 
                                    r: 6, 
                                    fill: '#3b82f6', 
                                    stroke: '#fff', 
                                    strokeWidth: 2,
                                    onClick: (e, payload) => {
                                        if (payload && payload.payload && onChartClick) {
                                            onChartClick(payload.payload);
                                        }
                                    }
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                        선택한 기간에 데이터가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngagementChart;
