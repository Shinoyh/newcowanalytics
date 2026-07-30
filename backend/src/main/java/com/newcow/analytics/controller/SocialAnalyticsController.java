package com.newcow.analytics.controller;

import com.newcow.analytics.dto.SocialAccountDataDto;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import com.newcow.analytics.service.SocialMediaAnalyzeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*") // For local React dev
@RequiredArgsConstructor
public class SocialAnalyticsController {

    private final List<SocialMediaAnalyzeService> analyzeServices;
    private final SocialAccountRepository accountRepository;
    private final SocialMediaPostRepository postRepository;

    @GetMapping("/{platform}/analyze/{username}")
    public ResponseEntity<SocialAccountDataDto> analyzeAccount(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @PathVariable String username) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.analyzeAccount(userId, username));
    }

    @GetMapping("/{platform}/data/{username}")
    public ResponseEntity<SocialAccountDataDto> getAccountData(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @PathVariable String username) {
        
        SocialMediaAnalyzeService service = getService(platform);
        try {
            return ResponseEntity.ok(service.getAccountData(userId, username));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{platform}/search")
    public ResponseEntity<List<com.newcow.analytics.dto.ChannelSearchDto>> searchChannels(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @RequestParam String q) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.searchChannels(userId, q));
    }

    @GetMapping("/{platform}/search-live")
    public ResponseEntity<List<com.newcow.analytics.dto.ChannelSearchDto>> searchLiveChannels(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @RequestParam String q) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.searchLiveChannels(userId, q));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<SocialAccountDataDto>> getRecentSearches(@RequestHeader("X-User-Id") String userId) {
        List<com.newcow.analytics.domain.SocialAccount> recentAccounts = accountRepository.findTop20ByUserIdOrderByUpdatedAtDesc(userId);
        List<SocialAccountDataDto> result = recentAccounts.stream().map(acc -> {
            SocialMediaAnalyzeService service = getService(acc.getPlatform().toLowerCase());
            return service.getAccountData(userId, acc.getUsername());
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/account/{platform}/{username}/pin")
    public ResponseEntity<Void> togglePin(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @PathVariable String username) {
        
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        com.newcow.analytics.domain.SocialAccount account = accountRepository
                .findByUserIdAndUsernameAndPlatform(userId, cleanUsername, platform.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        
        account.setPinned(!account.isPinned());
        accountRepository.save(account);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/account/{platform}/{username}")
    @Transactional
    public ResponseEntity<Void> deleteAccount(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @PathVariable String username) {
        
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        com.newcow.analytics.domain.SocialAccount account = accountRepository
                .findByUserIdAndUsernameAndPlatform(userId, cleanUsername, platform.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        
        postRepository.deleteByUserIdAndAccount(userId, account);
        accountRepository.delete(account);
        return ResponseEntity.ok().build();
    }

    private SocialMediaAnalyzeService getService(String platform) {
        return analyzeServices.stream()
                .filter(s -> s.getPlatform().equalsIgnoreCase(platform))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported platform: " + platform));
    }
}
