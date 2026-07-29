package com.newcow.analytics.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_account", uniqueConstraints = {
        @UniqueConstraint(name = "uk_username_platform", columnNames = {"username", "platform"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String platform;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "platform_account_id")
    private String platformAccountId;

    @Column(name = "platform_playlist_id")
    private String platformPlaylistId;

    @Column(name = "is_pinned", nullable = false)
    private boolean isPinned = false;

    @Column(name = "ai_analysis_result", columnDefinition = "TEXT")
    private String aiAnalysisResult;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
