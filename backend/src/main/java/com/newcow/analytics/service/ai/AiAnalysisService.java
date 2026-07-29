package com.newcow.analytics.service.ai;

import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;

import java.util.List;

public interface AiAnalysisService {
    /**
     * Analyze a single video/post and return structured feedback.
     * @param post The post to analyze.
     * @return A JSON string matching the agreed output schema.
     */
    String analyzeVideo(SocialMediaPost post);

    /**
     * Analyze the overall channel trend based on recent posts.
     * @param account The account to analyze.
     * @param recentPosts List of recent posts (e.g., up to 50-100).
     * @return A JSON string representing the channel trend analysis.
     */
    String analyzeChannelTrend(SocialAccount account, List<SocialMediaPost> recentPosts);
}
