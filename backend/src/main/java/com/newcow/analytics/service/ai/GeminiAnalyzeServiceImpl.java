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

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAnalyzeServiceImpl implements AiAnalysisService {

    @Value("${app.ai.gemini.api-key}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
            String base64Metadata = java.util.Base64.getEncoder().encodeToString(metadataJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            
            // Call python script
            ProcessBuilder pb = new ProcessBuilder(
                    "python", "ai_analyzer.py",
                    "--api_key", apiKey,
                    "--mode", "video",
                    "--video_id", post.getPlatformPostId(),
                    "--type", post.getVideoType() != null ? post.getVideoType().toLowerCase() : "long",
                    "--metadata_base64", base64Metadata,
                    "--step", step
            );
            pb.directory(new java.io.File("../ai"));
            
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Python script prints status to stderr (not captured if redirectErrorStream is false, 
                    // but we set it true, so we need to filter JSON)
                    if (line.trim().startsWith("{") || output.length() > 0) {
                        output.append(line).append("\n");
                    } else {
                        log.info("[Python AI] {}", line);
                    }
                }
            }
            
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                log.error("Python script failed with exit code {}", exitCode);
                throw new RuntimeException("AI Analysis failed");
            }
            
            String rawOutput = output.toString().trim();
            // Remove any trailing markdown backticks that might have been included
            if (rawOutput.endsWith("```")) {
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
            String base64Metadata = java.util.Base64.getEncoder().encodeToString(metadataJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            
            ProcessBuilder pb = new ProcessBuilder(
                    "python", "ai_analyzer.py",
                    "--api_key", apiKey,
                    "--mode", "channel",
                    "--metadata_base64", base64Metadata
            );
            pb.directory(new java.io.File("../ai"));
            
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.trim().startsWith("{") || output.length() > 0) {
                        output.append(line).append("\n");
                    } else {
                        log.info("[Python AI] {}", line);
                    }
                }
            }
            
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                log.error("Python script failed with exit code {}", exitCode);
                throw new RuntimeException("AI Analysis failed");
            }
            
            String rawOutput = output.toString().trim();
            if (rawOutput.endsWith("```")) {
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
