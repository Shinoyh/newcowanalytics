package com.newcow.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialAccountDataDto {
    private String username;
    private String platform;
    private String profilePictureUrl;
    private boolean isPinned;
    private List<PostDto> recentPosts;
    private double growthRate; // (Recent Engagement - Past Engagement) / Past Engagement * 100
}
