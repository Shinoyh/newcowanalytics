package com.newcow.analytics.controller;

import com.newcow.analytics.dto.SocialAccountDataDto;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.service.SocialMediaAnalyzeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/{platform}/analyze/{username}")
    public ResponseEntity<SocialAccountDataDto> analyzeAccount(
            @PathVariable String platform,
            @PathVariable String username) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.analyzeAccount(username));
    }

    @GetMapping("/{platform}/data/{username}")
    public ResponseEntity<SocialAccountDataDto> getAccountData(
            @PathVariable String platform,
            @PathVariable String username) {
        
        SocialMediaAnalyzeService service = getService(platform);
        try {
            return ResponseEntity.ok(service.getAccountData(username));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{platform}/search")
    public ResponseEntity<List<com.newcow.analytics.dto.ChannelSearchDto>> searchChannels(
            @PathVariable String platform,
            @RequestParam String q) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.searchChannels(q));
    }

    @GetMapping("/{platform}/search-live")
    public ResponseEntity<List<com.newcow.analytics.dto.ChannelSearchDto>> searchLiveChannels(
            @PathVariable String platform,
            @RequestParam String q) {
        
        SocialMediaAnalyzeService service = getService(platform);
        return ResponseEntity.ok(service.searchLiveChannels(q));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<SocialAccountDataDto>> getRecentSearches() {
        List<com.newcow.analytics.domain.SocialAccount> recentAccounts = accountRepository.findTop20ByOrderByUpdatedAtDesc();
        List<SocialAccountDataDto> result = recentAccounts.stream().map(acc -> {
            SocialMediaAnalyzeService service = getService(acc.getPlatform().toLowerCase());
            return service.getAccountData(acc.getUsername());
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/account/{platform}/{username}/pin")
    public ResponseEntity<Void> togglePin(
            @PathVariable String platform,
            @PathVariable String username) {
        
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        com.newcow.analytics.domain.SocialAccount account = accountRepository
                .findByUsernameAndPlatform(cleanUsername, platform.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        
        account.setPinned(!account.isPinned());
        accountRepository.save(account);
        return ResponseEntity.ok().build();
    }

    private SocialMediaAnalyzeService getService(String platform) {
        return analyzeServices.stream()
                .filter(s -> s.getPlatform().equalsIgnoreCase(platform))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported platform: " + platform));
    }
}
