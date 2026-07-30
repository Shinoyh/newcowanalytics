package com.newcow.analytics.service;

import com.newcow.analytics.dto.SocialAccountDataDto;

public interface SocialMediaAnalyzeService {
    /**
     * Fetches the latest data for the given username, updates the database, and returns the result.
     * @param username The username of the social media account.
     * @return SocialAccountDataDto containing the account and recent posts.
     */
    SocialAccountDataDto analyzeAccount(String userId, String username);
    
    SocialAccountDataDto getAccountData(String userId, String username);

    String getPlatform();
    
    default java.util.List<com.newcow.analytics.dto.ChannelSearchDto> searchChannels(String userId, String query) {
        return java.util.Collections.emptyList();
    }
    
    default java.util.List<com.newcow.analytics.dto.ChannelSearchDto> searchLiveChannels(String userId, String query) {
        return java.util.Collections.emptyList();
    }
}
