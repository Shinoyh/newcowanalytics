import React, { useState, useEffect } from 'react';
import { socialAnalyticsApi } from '../services/api';

const ChannelSelectModal = ({ query, platform, onClose, onSelect }) => {
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChannels = async () => {
            setIsLoading(true);
            try {
                const results = await socialAnalyticsApi.searchLiveChannels(platform, query);
                setChannels(results);
            } catch (err) {
                setError("Failed to search channels.");
            } finally {
                setIsLoading(false);
            }
        };

        if (query) {
            fetchChannels();
        }
    }, [query, platform]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '90%', maxWidth: '500px',
                maxHeight: '80vh', overflowY: 'auto',
                padding: '2rem',
                position: 'relative'
            }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    ✕
                </button>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>"{query}" 관련 채널 선택</h2>
                
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <div className="loading-spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></div>
                    </div>
                )}
                {error && <p style={{ color: 'var(--text-danger)' }}>{error}</p>}
                
                {!isLoading && channels.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>검색 결과가 없습니다.</p>
                )}

                {!isLoading && channels.map((channel, idx) => (
                    <div 
                        key={idx}
                        onClick={() => onSelect(channel.username)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '15px',
                            padding: '15px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            borderRadius: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <img 
                            src={channel.profilePictureUrl || 'https://via.placeholder.com/50'} 
                            alt={channel.username}
                            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{channel.username}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{channel.platform}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChannelSelectModal;
