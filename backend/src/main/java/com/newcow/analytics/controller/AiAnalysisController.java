package com.newcow.analytics.controller;

import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import com.newcow.analytics.service.ai.AiAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics/ai/analyze")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiAnalysisController {

    private final AiAnalysisService aiAnalysisService;
    private final SocialMediaPostRepository postRepository;
    private final SocialAccountRepository accountRepository;

    @PostMapping(value = "/video/{postId}", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> analyzeVideo(@PathVariable Long postId,
            @RequestParam(required = false, defaultValue = "false") boolean forceRefresh) {
        SocialMediaPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        if (!forceRefresh && post.getAiAnalysisResult() != null && !post.getAiAnalysisResult().trim().isEmpty()) {
            return ResponseEntity.ok(post.getAiAnalysisResult());
        }
        
        String resultJson = aiAnalysisService.analyzeVideo(post);
        
        // Save back to DB if it doesn't look like an error
        if (resultJson != null && resultJson.trim().startsWith("{") && !resultJson.contains("\"error\"")) {
            post.setAiAnalysisResult(resultJson);
            postRepository.save(post);
        }
        
        return ResponseEntity.ok(resultJson);
    }

    @PostMapping(value = "/channel/{platform}/{username}", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> analyzeChannel(
            @PathVariable String platform,
            @PathVariable String username,
            @RequestParam(required = false, defaultValue = "false") boolean forceRefresh) {
            
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        SocialAccount account = accountRepository
                .findByUsernameAndPlatform(cleanUsername, platform.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Account not found"));
                
        if (!forceRefresh && account.getAiAnalysisResult() != null && !account.getAiAnalysisResult().trim().isEmpty()) {
            return ResponseEntity.ok(account.getAiAnalysisResult());
        }
                
        List<SocialMediaPost> recentPosts = postRepository.findByAccountOrderByTimestampDesc(account);
        // Take top 50
        if (recentPosts.size() > 50) {
            recentPosts = recentPosts.subList(0, 50);
        }
        
        String resultJson = aiAnalysisService.analyzeChannelTrend(account, recentPosts);
        
        // Save back to DB if it doesn't look like an error
        if (resultJson != null && resultJson.trim().startsWith("{") && !resultJson.contains("\"error\"")) {
            account.setAiAnalysisResult(resultJson);
            accountRepository.save(account);
        }
        
        return ResponseEntity.ok(resultJson);
    }
}
