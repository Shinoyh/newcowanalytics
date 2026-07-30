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
    private final com.newcow.analytics.service.ai.AiBatchService aiBatchService;
    private final SocialMediaPostRepository postRepository;
    private final SocialAccountRepository accountRepository;

    @PostMapping(value = "/video/{postId}", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> analyzeVideo(@PathVariable Long postId,
            @RequestParam(required = false, defaultValue = "false") boolean forceRefresh) {
        SocialMediaPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        if (!forceRefresh && post.getAiAnalysisResult() != null && !post.getAiAnalysisResult().trim().isEmpty()) {
            // Already analyzed, return the actual JSON result so the frontend can display it
            return ResponseEntity.ok(post.getAiAnalysisResult());
        }
        
        aiBatchService.submitVideoAnalysis(post);
        return ResponseEntity.ok("{\"status\":\"queued\"}");
    }

    @PostMapping(value = "/batch", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> analyzeBatch(@RequestBody List<Long> postIds) {
        List<SocialMediaPost> posts = postRepository.findAllById(postIds);
        aiBatchService.submitBatchAnalysis(posts);
        return ResponseEntity.ok("{\"status\":\"queued\", \"count\":" + posts.size() + "}");
    }

    @GetMapping(value = "/status", produces = "application/json;charset=UTF-8")
    public ResponseEntity<java.util.Map<Long, String>> getJobStatuses() {
        return ResponseEntity.ok(aiBatchService.getAllJobStatuses());
    }

    @DeleteMapping(value = "/status/{postId}", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> clearJobStatus(@PathVariable Long postId) {
        aiBatchService.clearJobStatus(postId);
        return ResponseEntity.ok("{\"status\":\"cleared\"}");
    }

    @PostMapping(value = "/channel/{platform}/{username}", produces = "application/json;charset=UTF-8")
    public ResponseEntity<String> analyzeChannel(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String platform,
            @PathVariable String username,
            @RequestParam(required = false, defaultValue = "false") boolean forceRefresh) {
            
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        SocialAccount account = accountRepository
                .findByUserIdAndUsernameAndPlatform(userId, cleanUsername, platform.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Account not found"));
                
        if (!forceRefresh && account.getAiAnalysisResult() != null && !account.getAiAnalysisResult().trim().isEmpty()) {
            String existingResult = account.getAiAnalysisResult();
            if (!existingResult.contains("\"error\"") && !existingResult.contains("상승세 / 하락세 / 정체기")) {
                return ResponseEntity.ok(existingResult);
            }
        }
                
        List<SocialMediaPost> recentPosts = postRepository.findByUserIdAndAccountOrderByTimestampDesc(userId, account);
        // Take top 50
        if (recentPosts.size() > 50) {
            recentPosts = recentPosts.subList(0, 50);
        }
        
        String resultJson = aiAnalysisService.analyzeChannelTrend(account, recentPosts);
        
        // Save back to DB if it doesn't look like an error and is not a template
        if (resultJson != null && resultJson.trim().startsWith("{") 
                && !resultJson.contains("\"error\"") 
                && !resultJson.contains("상승세 / 하락세 / 정체기")) {
            account.setAiAnalysisResult(resultJson);
            accountRepository.save(account);
        }
        
        return ResponseEntity.ok(resultJson);
    }
}
