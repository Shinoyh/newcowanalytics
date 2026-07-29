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
import java.util.List;
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
    public SocialAccountDataDto analyzeAccount(String username) {
        String cleanUsername = username.startsWith("@") ? username : "@" + username;

        SocialAccount account = accountRepository.findByUsernameAndPlatform(cleanUsername, "YOUTUBE")
                .orElse(SocialAccount.builder()
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
                // 1. Search channel ID by handle
                String searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q="
                        + cleanUsername + "&key=" + apiKey;
                ResponseEntity<String> searchResponse = restTemplate.getForEntity(searchUrl, String.class);
                JsonNode searchRoot = objectMapper.readTree(searchResponse.getBody());
                if (searchRoot.path("items").isArray() && searchRoot.path("items").size() > 0) {
                    JsonNode firstItem = searchRoot.path("items").get(0);
                    channelId = firstItem.path("snippet").path("channelId").asText();
                    channelTitle = firstItem.path("snippet").path("title").asText();
                    profileUrl = firstItem.path("snippet").path("thumbnails").path("high").path("url").asText();
                } else {
                    throw new RuntimeException("Channel not found for username: " + username);
                }

                // 2. Get uploads playlist ID
                String channelUrl = "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=" + channelId
                        + "&key=" + apiKey;
                ResponseEntity<String> channelResponse = restTemplate.getForEntity(channelUrl, String.class);
                JsonNode channelRoot = objectMapper.readTree(channelResponse.getBody());
                uploadsPlaylistId = channelRoot.path("items").get(0).path("contentDetails").path("relatedPlaylists")
                        .path("uploads").asText();

                // Update account with fetched IDs
                account.setPlatformAccountId(channelId);
                account.setPlatformPlaylistId(uploadsPlaylistId);
                if (profileUrl != null) {
                    account.setProfilePictureUrl(profileUrl);
                }
            }

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
                List<JsonNode> videoSnippets = new ArrayList<>();

                for (JsonNode item : playlistRoot.path("items")) {
                    String videoId = item.path("snippet").path("resourceId").path("videoId").asText();
                    videoIds.add(videoId);
                    videoSnippets.add(item.path("snippet"));
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
                for (int i = 0; i < statsItems.size(); i++) {
                    JsonNode statsItem = statsItems.get(i);
                    JsonNode snippet = videoSnippets.get(i);

                    String videoId = statsItem.path("id").asText();
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

                    Optional<SocialMediaPost> existingPostOpt = postRepository.findByAccountAndPlatformPostId(account,
                            videoId);

                    SocialMediaPost post;
                    if (existingPostOpt.isPresent()) {
                        post = existingPostOpt.get();
                        post.setLikeCount(likeCount);
                        post.setCommentsCount(commentCount);
                        post.setViewCount(viewCount);
                        post.setEngagement(likeCount + commentCount);
                        post.setVideoType(videoType);
                    } else {
                        post = SocialMediaPost.builder()
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
            List<SocialMediaPost> allPosts = postRepository.findByAccountOrderByTimestampDesc(account);
            return mapToDto(account, allPosts);

        } catch (Exception e) {
            log.error("Error fetching YouTube data", e);
            throw new RuntimeException("Failed to analyze YouTube account", e);
        }
    }

    @Override
    public SocialAccountDataDto getAccountData(String username) {
        String cleanUsername = username.startsWith("@") ? username : "@" + username;
        SocialAccount account = accountRepository.findByUsernameAndPlatform(cleanUsername, "YOUTUBE")
                .orElseThrow(() -> new RuntimeException("Account not found"));

        List<SocialMediaPost> posts = postRepository.findByAccountOrderByTimestampDesc(account);
        return mapToDto(account, posts);
    }

    @Override
    public List<com.newcow.analytics.dto.ChannelSearchDto> searchChannels(String query) {
        // Option B: Search from local DB only to save API quota
        List<SocialAccount> accounts = accountRepository.findByUsernameContainingIgnoreCaseAndPlatform(query,
                "YOUTUBE");
        return accounts.stream().map(a -> com.newcow.analytics.dto.ChannelSearchDto.builder()
                .username(a.getUsername().replace("@", ""))
                .platform(a.getPlatform())
                .profilePictureUrl(a.getProfilePictureUrl())
                .build()).collect(Collectors.toList());
    }

    @Override
    public List<com.newcow.analytics.dto.ChannelSearchDto> searchLiveChannels(String query) {
        String searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q="
                + query + "&key=" + apiKey;
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(searchUrl, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            List<com.newcow.analytics.dto.ChannelSearchDto> results = new ArrayList<>();
            if (root.has("items")) {
                for (JsonNode item : root.path("items")) {
                    results.add(com.newcow.analytics.dto.ChannelSearchDto.builder()
                            .username(item.path("snippet").path("title").asText()) // Using title as username for
                                                                                   // display
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

        int mid = posts.size() / 2;
        List<SocialMediaPost> recentHalf = posts.subList(0, mid);
        List<SocialMediaPost> pastHalf = posts.subList(mid, posts.size());

        double recentMedian = calculateMedian(recentHalf);
        double pastMedian = calculateMedian(pastHalf);

        if (pastMedian == 0)
            return 0.0;
        return ((recentMedian - pastMedian) / pastMedian) * 100.0;
    }

    private double calculateMedian(List<SocialMediaPost> halfPosts) {
        if (halfPosts.isEmpty())
            return 0.0;
        List<Integer> sorted = halfPosts.stream()
                .map(p -> p.getEngagement() != null ? p.getEngagement() : 0)
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
