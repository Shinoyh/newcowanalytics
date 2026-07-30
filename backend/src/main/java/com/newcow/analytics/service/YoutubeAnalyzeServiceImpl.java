package com.newcow.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import com.newcow.analytics.dto.PostDto;
import com.newcow.analytics.dto.SocialAccountDataDto;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class YoutubeAnalyzeServiceImpl implements SocialMediaAnalyzeService {

    private final SocialAccountRepository accountRepository;
    private final SocialMediaPostRepository postRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.social.youtube.api-key}")
    private String apiKey;

    @Override
    public String getPlatform() {
        return "youtube";
    }

    @Override
    public SocialAccountDataDto analyzeAccount(String userId, String username) {
        // If the frontend passed a channelId (starts with UC and length 24)
        if (username != null && username.startsWith("UC") && username.length() == 24) {
            try {
                String url = "https://www.googleapis.com/youtube/v3/channels?part=snippet&id=" + username + "&key=" + apiKey;
                org.springframework.http.ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(response.getBody());
                if (root.has("items") && root.path("items").size() > 0) {
                    com.fasterxml.jackson.databind.JsonNode snippet = root.path("items").get(0).path("snippet");
                    if (snippet.has("customUrl")) {
                        username = snippet.path("customUrl").asText(); // Resolves to e.g. @wo_ongp
                    } else {
                        username = snippet.path("title").asText(); // fallback
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to resolve channelId to customUrl: " + username, e);
            }
        }

        String cleanUsername = username.startsWith("@") ? username : "@" + username;

        SocialAccount account = accountRepository.findByUserIdAndUsernameAndPlatform(userId, cleanUsername, "YOUTUBE")
                .orElse(SocialAccount.builder()
                        .userId(userId)
                        .username(cleanUsername)
                        .platform("YOUTUBE")
                        .build());

        String channelId = account.getPlatformAccountId();
        String uploadsPlaylistId = account.getPlatformPlaylistId();
        String profileUrl = account.getProfilePictureUrl();
        String channelTitle = username;

        try {
            // Only fetch channel and playlist ID if not cached in DB
            if (channelId == null || uploadsPlaylistId == null) {
                // 1. Try exact match using forHandle API (Best practice for @usernames)
                String exactUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle="
                        + cleanUsername + "&key=" + apiKey;
                ResponseEntity<String> exactResponse = restTemplate.getForEntity(exactUrl, String.class);
                JsonNode exactRoot = objectMapper.readTree(exactResponse.getBody());
                
                if (exactRoot.path("items").isArray() && exactRoot.path("items").size() > 0) {
                    JsonNode firstItem = exactRoot.path("items").get(0);
                    channelId = firstItem.path("id").asText();
                    channelTitle = firstItem.path("snippet").path("title").asText();
                    profileUrl = firstItem.path("snippet").path("thumbnails").path("high").path("url").asText();
                    uploadsPlaylistId = firstItem.path("contentDetails").path("relatedPlaylists").path("uploads").asText();
                } else {
                    // 2. Fallback to fuzzy search if exact handle doesn't exist
                    String searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q="
                            + cleanUsername + "&key=" + apiKey;
                    ResponseEntity<String> searchResponse = restTemplate.getForEntity(searchUrl, String.class);
                    JsonNode searchRoot = objectMapper.readTree(searchResponse.getBody());
                    if (searchRoot.path("items").isArray() && searchRoot.path("items").size() > 0) {
                        JsonNode searchItem = searchRoot.path("items").get(0);
                        channelId = searchItem.path("snippet").path("channelId").asText();
                        channelTitle = searchItem.path("snippet").path("title").asText();
                        profileUrl = searchItem.path("snippet").path("thumbnails").path("high").path("url").asText();
                        
                        // Then get contentDetails for the found channel
                        String contentUrl = "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=" + channelId + "&key=" + apiKey;
                        ResponseEntity<String> contentResponse = restTemplate.getForEntity(contentUrl, String.class);
                        JsonNode contentRoot = objectMapper.readTree(contentResponse.getBody());
                        uploadsPlaylistId = contentRoot.path("items").get(0).path("contentDetails").path("relatedPlaylists").path("uploads").asText();
                    } else {
                        throw new RuntimeException("Channel not found for username: " + username);
                    }
                }

                // Update account with fetched IDs
                account.setPlatformAccountId(channelId);
                account.setPlatformPlaylistId(uploadsPlaylistId);
                if (profileUrl != null) {
                    account.setProfilePictureUrl(profileUrl);
                }
            }

            // Clear previous channel AI analysis to force a new one upon data refresh
            account.setAiAnalysisResult(null);

            // Ensure account is saved with updated timestamp
            account = accountRepository.save(account);

            // 3. Get recent videos from uploads playlist (up to 200)
            List<SocialMediaPost> newPosts = new ArrayList<>();
            String nextPageToken = "";
            int totalFetched = 0;

            while (totalFetched < 200) {
                String pageTokenParam = nextPageToken.isEmpty() ? "" : "&pageToken=" + nextPageToken;
                String playlistUrl = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId="
                        + uploadsPlaylistId + "&maxResults=50" + pageTokenParam + "&key=" + apiKey;

                ResponseEntity<String> playlistResponse = restTemplate.getForEntity(playlistUrl, String.class);
                JsonNode playlistRoot = objectMapper.readTree(playlistResponse.getBody());

                List<String> videoIds = new ArrayList<>();
                Map<String, JsonNode> snippetMap = new HashMap<>();

                for (JsonNode item : playlistRoot.path("items")) {
                    String videoId = item.path("snippet").path("resourceId").path("videoId").asText();
                    videoIds.add(videoId);
                    snippetMap.put(videoId, item.path("snippet"));
                }

                if (videoIds.isEmpty()) {
                    break;
                }

                // 4. Get video statistics and contentDetails for the current batch
                String videoIdsParam = String.join(",", videoIds);
                String statsUrl = "https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id="
                        + videoIdsParam + "&key=" + apiKey;
                ResponseEntity<String> statsResponse = restTemplate.getForEntity(statsUrl, String.class);
                JsonNode statsRoot = objectMapper.readTree(statsResponse.getBody());

                JsonNode statsItems = statsRoot.path("items");
                
                // Fetch existing posts for this batch in a single query
                List<String> currentBatchVideoIds = new java.util.ArrayList<>();
                for (int i = 0; i < statsItems.size(); i++) {
                    currentBatchVideoIds.add(statsItems.get(i).path("id").asText());
                }
                List<SocialMediaPost> existingPosts = postRepository.findByUserIdAndAccountAndPlatformPostIdIn(account.getUserId(), account, currentBatchVideoIds);
                java.util.Map<String, SocialMediaPost> existingPostMap = existingPosts.stream().collect(java.util.stream.Collectors.toMap(SocialMediaPost::getPlatformPostId, p -> p));

                for (int i = 0; i < statsItems.size(); i++) {
                    JsonNode statsItem = statsItems.get(i);
                    String videoId = statsItem.path("id").asText();
                    JsonNode snippet = snippetMap.get(videoId);
                    
                    if (snippet == null) continue;

                    JsonNode stats = statsItem.path("statistics");
                    JsonNode contentDetails = statsItem.path("contentDetails");

                    int viewCount = stats.path("viewCount").asInt(0);
                    int likeCount = stats.path("likeCount").asInt(0);
                    int commentCount = stats.path("commentCount").asInt(0);

                    // Parse duration to determine SHORT vs LONG
                    String durationStr = contentDetails.path("duration").asText("PT0S");
                    long durationSeconds = 0;
                    try {
                        durationSeconds = java.time.Duration.parse(durationStr).getSeconds();
                    } catch (Exception e) {
                        log.warn("Failed to parse duration: " + durationStr, e);
                    }
                    String videoType = durationSeconds <= 60 ? "SHORT" : "LONG";

                    String publishedAtStr = snippet.path("publishedAt").asText();
                    LocalDateTime timestamp = Instant.parse(publishedAtStr).atZone(ZoneId.systemDefault())
                            .toLocalDateTime();

                    SocialMediaPost existingPost = existingPostMap.get(videoId);

                    SocialMediaPost post;
                    if (existingPost != null) {
                        post = existingPost;
                        post.setLikeCount(likeCount);
                        post.setCommentsCount(commentCount);
                        post.setViewCount(viewCount);
                        post.setEngagement(likeCount + commentCount);
                        post.setVideoType(videoType);
                    } else {
                        post = SocialMediaPost.builder()
                                .userId(account.getUserId())
                                .account(account)
                                .platformPostId(videoId)
                                .platform("YOUTUBE")
                                .timestamp(timestamp)
                                .likeCount(likeCount)
                                .commentsCount(commentCount)
                                .viewCount(viewCount)
                                .engagement(likeCount + commentCount)
                                .caption(snippet.path("title").asText())
                                .mediaUrl(videoId)
                                .videoType(videoType)
                                .build();
                    }
                    newPosts.add(post);
                }

                totalFetched += videoIds.size();

                if (playlistRoot.has("nextPageToken")) {
                    nextPageToken = playlistRoot.path("nextPageToken").asText();
                } else {
                    break; // No more pages
                }
            }

            postRepository.saveAll(newPosts);

            // Fetch all posts from DB for this account
            List<SocialMediaPost> allPosts = postRepository.findByUserIdAndAccountOrderByTimestampDesc(account.getUserId(), account);
            return mapToDto(account, allPosts);

        } catch (Exception e) {
            log.error("Error fetching YouTube data", e);
            throw new RuntimeException("Failed to analyze YouTube account", e);
        }
    }

    @Override
    public SocialAccountDataDto getAccountData(String userId, String username) {
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        SocialAccount account = accountRepository.findByUserIdAndUsernameAndPlatform(userId, cleanUsername, "YOUTUBE")
                .orElseThrow(() -> new RuntimeException("Account not found"));

        List<SocialMediaPost> posts = postRepository.findByUserIdAndAccountOrderByTimestampDesc(userId, account);
        return mapToDto(account, posts);
    }

    @Override
    public List<com.newcow.analytics.dto.ChannelSearchDto> searchChannels(String userId, String query) {
        // Option B: Search from local DB only to save API quota
        List<SocialAccount> accounts = accountRepository.findByUserIdAndUsernameContainingIgnoreCaseAndPlatform(userId, query,
                "YOUTUBE");
        return accounts.stream().map(a -> com.newcow.analytics.dto.ChannelSearchDto.builder()
                .username(a.getUsername().replace("@", ""))
                .platform(a.getPlatform())
                .profilePictureUrl(a.getProfilePictureUrl())
                .build()).collect(Collectors.toList());
    }

    @Override
    public List<com.newcow.analytics.dto.ChannelSearchDto> searchLiveChannels(String userId, String query) {
        String searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q="
                + query + "&key=" + apiKey;
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(searchUrl, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            List<com.newcow.analytics.dto.ChannelSearchDto> results = new ArrayList<>();
            if (root.has("items")) {
                for (JsonNode item : root.path("items")) {
                    results.add(com.newcow.analytics.dto.ChannelSearchDto.builder()
                            .username(item.path("snippet").path("channelId").asText()) // Using channelId as username
                            .displayName(item.path("snippet").path("title").asText()) // Using title as displayName
                            .platform("YOUTUBE")
                            .profilePictureUrl(
                                    item.path("snippet").path("thumbnails").path("high").path("url").asText())
                            .build());
                }
            }
            return results;
        } catch (Exception e) {
            log.error("Failed to fetch live channels from YouTube", e);
            return new ArrayList<>();
        }
    }

    private SocialAccountDataDto mapToDto(SocialAccount account, List<SocialMediaPost> posts) {
        List<PostDto> postDtos = posts.stream().map(p -> PostDto.builder()
                .id(p.getId() != null ? String.valueOf(p.getId()) : null)
                .platformPostId(p.getPlatformPostId())
                .platform(p.getPlatform())
                .timestamp(p.getTimestamp())
                .likeCount(p.getLikeCount())
                .commentsCount(p.getCommentsCount())
                .viewCount(p.getViewCount())
                .engagement(p.getEngagement())
                .caption(p.getCaption())
                .mediaUrl(p.getMediaUrl())
                .videoType(p.getVideoType())
                .aiAnalysisResult(p.getAiAnalysisResult())
                .build()).collect(Collectors.toList());

        double growthRate = calculateGrowthRate(posts);

        return SocialAccountDataDto.builder()
                .username(account.getUsername())
                .platform(account.getPlatform())
                .profilePictureUrl(account.getProfilePictureUrl())
                .isPinned(account.isPinned())
                .recentPosts(postDtos)
                .growthRate(growthRate)
                .build();
    }

    private double calculateGrowthRate(List<SocialMediaPost> posts) {
        if (posts == null || posts.size() < 2)
            return 0.0;

        List<SocialMediaPost> targetPosts = posts;
        if (targetPosts.size() > 50) {
            targetPosts = targetPosts.subList(0, 50);
        }

        int mid = targetPosts.size() / 2;
        List<SocialMediaPost> recentHalf = targetPosts.subList(0, mid);
        List<SocialMediaPost> pastHalf = targetPosts.subList(mid, targetPosts.size());

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

        return (viewsGrowth * 0.7) + (engGrowth * 0.3);
    }

    private double calculateMedian(List<SocialMediaPost> halfPosts, boolean useViews) {
        if (halfPosts.isEmpty())
            return 0.0;
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
