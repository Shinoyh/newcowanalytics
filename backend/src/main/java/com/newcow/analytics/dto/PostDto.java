package com.newcow.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostDto {
    private String id;
    private String platformPostId;
    private String platform;
    private LocalDateTime timestamp;
    private Integer likeCount;
    private Integer commentsCount;
    private Integer viewCount;
    private Integer engagement;
    private String caption;
    private String mediaUrl;
    private String videoType;
    private String aiAnalysisResult;
}
