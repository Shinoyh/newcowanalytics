package com.newcow.analytics.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_media_post", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_account_post", columnNames = {"user_id", "account_id", "platform_post_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialMediaPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private SocialAccount account;

    @Column(name = "platform_post_id", nullable = false)
    private String platformPostId;

    @Column(name = "platform")
    private String platform;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "like_count")
    private Integer likeCount;

    @Column(name = "comments_count")
    private Integer commentsCount;

    @Column(name = "view_count")
    private Integer viewCount;

    @Column
    private Integer engagement;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @Column(name = "media_url", length = 1000)
    private String mediaUrl;
    
    @Column(name = "video_type")
    private String videoType;

    @Column(name = "ai_analysis_result", columnDefinition = "TEXT")
    private String aiAnalysisResult;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
