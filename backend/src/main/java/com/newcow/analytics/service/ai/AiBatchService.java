package com.newcow.analytics.service.ai;

import com.newcow.analytics.domain.SocialMediaPost;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiBatchService {

    private final GeminiAnalyzeServiceImpl geminiAnalyzeService;
    private final SocialMediaPostRepository postRepository;

    // Concurrency limits
    private final ExecutorService downloadExecutor = Executors.newFixedThreadPool(2);
    private final ExecutorService analyzeExecutor = Executors.newFixedThreadPool(1);

    // Job Status Map: Post ID -> Status String
    // Statuses: WAITING, DOWNLOADING, WAITING_ANALYZE, ANALYZING, COMPLETED, FAILED
    private final Map<Long, String> jobStatusMap = new ConcurrentHashMap<>();

    public void submitBatchAnalysis(List<SocialMediaPost> posts) {
        for (SocialMediaPost post : posts) {
            submitVideoAnalysis(post);
        }
    }

    public void submitVideoAnalysis(SocialMediaPost post) {
        Long postId = post.getId();
        
        // Prevent duplicate queueing
        String currentStatus = jobStatusMap.get(postId);
        if (currentStatus != null && !currentStatus.equals("COMPLETED") && !currentStatus.equals("FAILED")) {
            log.info("Post {} is already being processed. Current status: {}", postId, currentStatus);
            return;
        }

        jobStatusMap.put(postId, "WAITING");
        log.info("Queued AI Analysis for post {}", postId);

        downloadExecutor.submit(() -> {
            try {
                jobStatusMap.put(postId, "DOWNLOADING");
                log.info("Started downloading for post {}", postId);
                
                geminiAnalyzeService.analyzeVideoWithStep(post, "download");
                
                // Once downloaded, submit to analyze queue
                jobStatusMap.put(postId, "WAITING_ANALYZE");
                
                analyzeExecutor.submit(() -> {
                    try {
                        jobStatusMap.put(postId, "ANALYZING");
                        log.info("Started AI analyzing for post {}", postId);
                        
                        String resultJson = geminiAnalyzeService.analyzeVideoWithStep(post, "analyze");
                        
                        // Save back to DB
                        if (resultJson != null && resultJson.trim().startsWith("{") && !resultJson.contains("\"error\"")) {
                            post.setAiAnalysisResult(resultJson);
                            postRepository.save(post);
                            jobStatusMap.put(postId, "COMPLETED");
                            log.info("Successfully completed AI analysis for post {}", postId);
                        } else {
                            jobStatusMap.put(postId, "FAILED");
                            log.warn("AI analysis returned invalid JSON or error for post {}. Response: {}", postId, resultJson);
                        }
                        
                    } catch (Exception e) {
                        log.error("Failed during analyze step for post {}", postId, e);
                        jobStatusMap.put(postId, "FAILED");
                    } finally {
                        try {
                            // API 요청 몰림 방지 (구글 429 에러 방지용 2초 대기)
                            Thread.sleep(2000);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                        }
                    }
                });
                
            } catch (Exception e) {
                log.error("Failed during download step for post {}", postId, e);
                jobStatusMap.put(postId, "FAILED");
            }
        });
    }

    public Map<Long, String> getAllJobStatuses() {
        return jobStatusMap;
    }
    
    public String getJobStatus(Long postId) {
        return jobStatusMap.getOrDefault(postId, "NONE");
    }
    
    public void clearJobStatus(Long postId) {
        jobStatusMap.remove(postId);
    }

    @PreDestroy
    public void shutdown() {
        downloadExecutor.shutdownNow();
        analyzeExecutor.shutdownNow();
    }
}
