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

    private void handleFailure(SocialMediaPost post, Exception e) {
        Long postId = post.getId();
        String errMsg = e.getMessage() != null ? e.getMessage() : e.toString();
        
        String translatedMsg;
        if (errMsg.contains("403 Forbidden") || errMsg.contains("access denied") || errMsg.contains("Sign in to confirm you’re not a bot")) {
            translatedMsg = "[ERR_YOUTUBE_BLOCK] 유튜브 정책(연령 제한 또는 차단)에 의해 영상 추출이 거부되었습니다.";
        } else if (errMsg.contains("429") || errMsg.contains("quota") || errMsg.contains("Rate limit")) {
            translatedMsg = "[ERR_QUOTA_EXCEEDED] 구글 AI 일일 사용량을 초과했거나 요청이 너무 많습니다.";
        } else if (errMsg.contains("Intro or audio files not found")) {
            translatedMsg = "[ERR_DOWNLOAD_FAIL] 영상 다운로드 단계에서 파일을 정상적으로 받아오지 못했습니다.";
        } else {
            translatedMsg = "[ERR_UNKNOWN] 분석 중 오류 발생: " + errMsg.substring(0, Math.min(errMsg.length(), 80));
        }
        
        String errorJson = "{\"error\": \"" + translatedMsg.replace("\"", "\\\"").replace("\n", " ") + "\"}";
        post.setAiAnalysisResult(errorJson);
        postRepository.save(post);
        
        jobStatusMap.put(postId, "FAILED");
        log.error("AI Analysis Failed for post {}: {}", postId, errMsg);
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
                            handleFailure(post, new RuntimeException(resultJson != null ? resultJson : "Null response"));
                        }
                        
                    } catch (Exception e) {
                        handleFailure(post, e);
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
                handleFailure(post, e);
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
