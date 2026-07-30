package com.newcow.analytics.repository;

import com.newcow.analytics.domain.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {
    Optional<SocialAccount> findByUserIdAndUsernameAndPlatform(String userId, String username, String platform);
    
    List<SocialAccount> findByUserIdAndUsernameContainingIgnoreCaseAndPlatform(String userId, String username, String platform);
    
    List<SocialAccount> findTop20ByUserIdOrderByUpdatedAtDesc(String userId);
}
