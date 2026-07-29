import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { socialAnalyticsApi } from '../services/api'; // Need to define this in api.js

const SearchBar = ({ onSearch, isLoading, platform }) => {
    const [username, setUsername] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Fetch suggestions when username changes
    useEffect(() => {
        if (!username.trim()) {
            setSuggestions([]);
            return;
        }
        
        const fetchSuggestions = async () => {
            try {
                // Call the new search endpoint
                const response = await fetch(`http://localhost:8080/api/analytics/${platform}/search?q=${username}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300); // debounce
        return () => clearTimeout(timer);
    }, [username, platform]);

    useEffect(() => {
        // Click outside to close dropdown
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (username.trim() && !isLoading) {
            onSearch(username.trim(), false);
        }
    };

    const handleSelectSuggestion = (suggestion) => {
        setUsername(suggestion.username);
        setShowSuggestions(false);
        if (!isLoading) {
            onSearch(suggestion.username, true);
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <form className="search-container" onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder={`Enter ${platform === 'youtube' ? 'YouTube handle/name' : 'Instagram username'}...`} 
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={isLoading}
                />
                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? <div className="loading-spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></div> : <Search size={18} />}
                    <span>Analyze</span>
                </button>
            </form>
            
            {showSuggestions && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    backgroundColor: 'rgba(25, 25, 35, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    overflow: 'hidden'
                }}>
                    {suggestions.map((s, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelectSuggestion(s)}
                            style={{
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {s.profilePictureUrl ? (
                                    <img src={s.profilePictureUrl} alt={s.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ color: '#fff', fontSize: '14px' }}>{s.username.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: '500' }}>@{s.username}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'capitalize' }}>{s.platform}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
