import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/analytics',
    headers: {
        'Content-Type': 'application/json',
    },
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
