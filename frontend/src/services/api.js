import axios from 'axios';

// UUID 생성 및 관리 (localStorage)
const getOrCreateUserId = () => {
    let userId = localStorage.getItem('newcow_user_id');
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('newcow_user_id', userId);
    }
    return userId;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/analytics',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터를 통해 모든 요청에 X-User-Id 헤더 추가
api.interceptors.request.use((config) => {
    const userId = getOrCreateUserId();
    config.headers['X-User-Id'] = userId;
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const socialAnalyticsApi = {
    // Fetches and updates latest data
    analyzeAccount: async (platform, username) => {
        const response = await api.get(`/${platform}/analyze/${username}`);
        return response.data;
    },
    
    // Retrieves existing data from DB without updating
    getAccountData: async (platform, username) => {
        const response = await api.get(`/${platform}/data/${username}`);
        return response.data;
    },

    // Get recent searches across platforms
    getRecentSearches: async () => {
        const response = await api.get(`/recent`);
        return response.data;
    },

    // Search live channels from YouTube API
    searchLiveChannels: async (platform, query) => {
        const response = await api.get(`/${platform}/search-live?q=${query}`);
        return response.data;
    },

    // Toggle Pin status
    togglePin: async (platform, username) => {
        const response = await api.post(`/account/${platform}/${username}/pin`);
        return response.data;
    },

    // Delete account
    deleteAccount: async (platform, username) => {
        const response = await api.delete(`/account/${platform}/${username}`);
        return response.data;
    },

    // AI Analyze Video
    analyzeVideoAi: async (postId, forceRefresh = false) => {
        const response = await api.post(`/ai/analyze/video/${postId}?forceRefresh=${forceRefresh}`);
        return response.data;
    },

    // AI Analyze Channel
    analyzeChannelAi: async (platform, username, forceRefresh = false) => {
        const response = await api.post(`/ai/analyze/channel/${platform}/${username}?forceRefresh=${forceRefresh}`);
        return response.data;
    },

    // Batch analyze videos
    batchAnalyzeVideos: async (postIds) => {
        const response = await api.post(`/ai/analyze/batch`, postIds);
        return response.data;
    },

    // Get job status for async AI analysis
    getAiJobStatus: async () => {
        const response = await api.get(`/ai/analyze/status`);
        return response.data;
    },

    // Clear completed/failed job status
    clearAiJobStatus: async (postId) => {
        const response = await api.delete(`/ai/analyze/status/${postId}`);
        return response.data;
    }
};
