package com.newcow.analytics.repository;

import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SocialMediaPostRepository extends JpaRepository<SocialMediaPost, Long> {
    Optional<SocialMediaPost> findByUserIdAndAccountAndPlatformPostId(String userId, SocialAccount account, String platformPostId);
    List<SocialMediaPost> findByUserIdAndAccountAndPlatformPostIdIn(String userId, SocialAccount account, List<String> platformPostIds);
    List<SocialMediaPost> findByUserIdAndAccountOrderByTimestampDesc(String userId, SocialAccount account);
    void deleteByUserIdAndAccount(String userId, SocialAccount account);
}
