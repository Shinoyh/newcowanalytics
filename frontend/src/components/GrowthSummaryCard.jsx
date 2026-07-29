import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GrowthSummaryCard = ({ growthRate, totalPosts }) => {
    const isPositive = growthRate > 0;
    const isNeutral = growthRate === 0;

    return (
        <div className="glass-card summary-card">
            <h3 className="stat-label">Engagement Growth Rate</h3>
            <div className="stat-value">
                {isPositive ? '+' : ''}{growthRate.toFixed(1)}%
            </div>
            
            <div className={isNeutral ? 'text-secondary' : (isPositive ? 'growth-positive' : 'growth-negative')}>
                {isPositive && <TrendingUp size={16} />}
                {isNeutral && <Minus size={16} />}
                {!isPositive && !isNeutral && <TrendingDown size={16} />}
                <span>
                    {isNeutral 
                        ? 'No change detected' 
                        : `${isPositive ? 'Increase' : 'Decrease'} compared to past posts`}
                </span>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
                <p className="stat-label">Total Posts Analyzed</p>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{totalPosts}</div>
            </div>
        </div>
    );
};

export default GrowthSummaryCard;
