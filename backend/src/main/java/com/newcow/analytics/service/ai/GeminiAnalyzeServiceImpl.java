package com.newcow.analytics.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.Collections;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAnalyzeServiceImpl implements AiAnalysisService {

    @Value("${app.ai.gemini.api-key}")
    private String apiKey;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String analyzeVideo(SocialMediaPost post) {
        return analyzeVideoWithStep(post, "all");
    }

    public String analyzeVideoWithStep(SocialMediaPost post, String step) {
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("title", post.getCaption());
            metadata.put("views", post.getViewCount());
            metadata.put("likes", post.getLikeCount());
            metadata.put("comments", post.getCommentsCount());
            metadata.put("platform", post.getPlatform());
            metadata.put("publishedAt", post.getTimestamp() != null ? post.getTimestamp().toString() : "");

            String metadataJson = objectMapper.writeValueAsString(metadata);
            
            // HTTP Request to Python AI server
            String url = aiServiceUrl + "/analyze/video";
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("api_key", apiKey);
            requestBody.put("video_id", post.getPlatformPostId());
            requestBody.put("type", post.getVideoType() != null ? post.getVideoType().toLowerCase() : "long");
            requestBody.put("metadata_json_str", metadataJson);
            requestBody.put("step", step);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

            log.info("[Python AI] Sending video analysis request to {}", url);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Analysis failed with HTTP " + response.getStatusCode());
            }
            
            String rawOutput = response.getBody();
            if (rawOutput != null && rawOutput.endsWith("```")) {
                rawOutput = rawOutput.substring(0, rawOutput.length() - 3).trim();
            }
            return rawOutput;
            
        } catch (Exception e) {
            log.error("Failed to analyze video", e);
            throw new RuntimeException("Failed to analyze video: " + e.getMessage());
        }
    }

    @Override
    public String analyzeChannelTrend(SocialAccount account, List<SocialMediaPost> recentPosts) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("accountName", account.getUsername());
            payload.put("platform", account.getPlatform());
            
            List<Map<String, Object>> postsMeta = new java.util.ArrayList<>(recentPosts.stream().map(p -> {
                Map<String, Object> m = new HashMap<>();
                m.put("title", p.getCaption());
                m.put("views", p.getViewCount());
                m.put("likes", p.getLikeCount());
                m.put("comments", p.getCommentsCount());
                m.put("date", p.getTimestamp() != null ? p.getTimestamp().toString() : "");
                m.put("type", p.getVideoType());
                return m;
            }).toList());
            
            // Reverse the array so AI reads from oldest to newest (chronological) to prevent hallucinating downward trends
            java.util.Collections.reverse(postsMeta);
            
            // Calculate growth rate using Median (to filter out extreme viral outliers)
            double growthRate = 0.0;
            if (recentPosts != null && recentPosts.size() >= 2) {
                int mid = recentPosts.size() / 2;
                List<SocialMediaPost> recentHalf = recentPosts.subList(0, mid);
                List<SocialMediaPost> pastHalf = recentPosts.subList(mid, recentPosts.size());

                double recentViewsMedian = calculateMedian(recentHalf, true);
                double pastViewsMedian = calculateMedian(pastHalf, true);
                double viewsGrowth = 0.0;
                if (pastViewsMedian > 0) {
                    viewsGrowth = ((recentViewsMedian - pastViewsMedian) / pastViewsMedian) * 100.0;
                }

                double recentEngMedian = calculateMedian(recentHalf, false);
                double pastEngMedian = calculateMedian(pastHalf, false);
                double engGrowth = 0.0;
                if (pastEngMedian > 0) {
                    engGrowth = ((recentEngMedian - pastEngMedian) / pastEngMedian) * 100.0;
                }
                
                growthRate = (viewsGrowth * 0.7) + (engGrowth * 0.3);
            }
            
            payload.put("recentPosts", postsMeta);
            payload.put("calculatedGrowthRate", growthRate);
            String metadataJson = objectMapper.writeValueAsString(payload);
            
            // HTTP Request to Python AI server
            String url = aiServiceUrl + "/analyze/channel";
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("api_key", apiKey);
            requestBody.put("metadata_json_str", metadataJson);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

            log.info("[Python AI] Sending channel analysis request to {}", url);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Analysis failed with HTTP " + response.getStatusCode());
            }
            
            String rawOutput = response.getBody();
            if (rawOutput != null && rawOutput.endsWith("```")) {
                rawOutput = rawOutput.substring(0, rawOutput.length() - 3).trim();
            }
            return rawOutput;
            
        } catch (Exception e) {
            log.error("Failed to analyze channel trend", e);
            throw new RuntimeException("Failed to analyze channel trend: " + e.getMessage());
        }
    }

    private double calculateMedian(List<SocialMediaPost> halfPosts, boolean useViews) {
        if (halfPosts.isEmpty()) return 0.0;
        List<Double> sorted = halfPosts.stream()
                .map(p -> {
                    if (useViews) {
                        return p.getViewCount() != null ? p.getViewCount().doubleValue() : 0.0;
                    } else {
                        return p.getEngagement() != null ? p.getEngagement().doubleValue() : 0.0;
                    }
                })
                .sorted()
                .collect(Collectors.toList());
        int size = sorted.size();
        if (size % 2 == 0) {
            return (sorted.get(size / 2 - 1) + sorted.get(size / 2)) / 2.0;
        } else {
            return sorted.get(size / 2);
        }
    }
}
