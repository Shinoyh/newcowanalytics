package com.newcow.analytics.service;

import com.newcow.analytics.dto.SocialAccountDataDto;

public interface SocialMediaAnalyzeService {
    /**
     * Fetches the latest data for the given username, updates the database, and returns the result.
     * @param username The username of the social media account.
     * @return SocialAccountDataDto containing the account and recent posts.
     */
    SocialAccountDataDto analyzeAccount(String username);
    
    /**
     * Retrieves the existing data from the database without triggering an API call.
     * @param username The username of the social media account.
     * @return SocialAccountDataDto containing the account and recent posts.
     */
    SocialAccountDataDto getAccountData(String username);

    /**
     * Identifies the platform this service handles.
     * @return the platform name (e.g., "INSTAGRAM", "YOUTUBE")
     */
    String getPlatform();
    
    default java.util.List<com.newcow.analytics.dto.ChannelSearchDto> searchChannels(String query) {
        return java.util.Collections.emptyList();
    }
    
    default java.util.List<com.newcow.analytics.dto.ChannelSearchDto> searchLiveChannels(String query) {
        return java.util.Collections.emptyList();
    }
}
