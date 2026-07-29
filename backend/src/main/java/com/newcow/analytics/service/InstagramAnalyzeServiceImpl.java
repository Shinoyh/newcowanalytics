package com.newcow.analytics.service;

import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import com.newcow.analytics.dto.PostDto;
import com.newcow.analytics.dto.SocialAccountDataDto;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstagramAnalyzeServiceImpl implements SocialMediaAnalyzeService {

    private final SocialAccountRepository accountRepository;
    private final SocialMediaPostRepository postRepository;

    @Value("${app.social.instagram.access-token}")
    private String accessToken;

    @Value("${app.social.instagram.account-id}")
    private String accountId;

    @Value("${app.social.instagram.api-version}")
    private String apiVersion;

    private static final String PLATFORM = "INSTAGRAM";

    @Override
    @Transactional
    public SocialAccountDataDto analyzeAccount(String username) {
        SocialAccount account = accountRepository.findByUsernameAndPlatform(username, PLATFORM)
                .orElseGet(() -> accountRepository.save(SocialAccount.builder()
                        .username(username)
                        .platform(PLATFORM)
                        .build()));

        List<SocialMediaPost> posts = fetchAndSavePostsFromApi(account);
        return mapToDto(account, posts);
    }

    @Override
    @Transactional(readOnly = true)
    public SocialAccountDataDto getAccountData(String username) {
        SocialAccount account = accountRepository.findByUsernameAndPlatform(username, PLATFORM)
                .orElseThrow(() -> new RuntimeException("Account not found in database: " + username));
        
        List<SocialMediaPost> posts = postRepository.findByAccountOrderByTimestampDesc(account);
        return mapToDto(account, posts);
    }

    @Override
    public List<com.newcow.analytics.dto.ChannelSearchDto> searchChannels(String query) {
        List<SocialAccount> accounts = accountRepository.findByUsernameContainingIgnoreCaseAndPlatform(query, PLATFORM);
        return accounts.stream().map(a -> com.newcow.analytics.dto.ChannelSearchDto.builder()
                .username(a.getUsername())
                .platform(a.getPlatform())
                .profilePictureUrl(a.getProfilePictureUrl())
                .build()).collect(Collectors.toList());
    }

    @Override
    public String getPlatform() {
        return PLATFORM;
    }

    private List<SocialMediaPost> fetchAndSavePostsFromApi(SocialAccount account) {
        List<SocialMediaPost> apiPosts = new ArrayList<>();
        
        try {
            RestTemplate restTemplate = new RestTemplate();
            // 본인 계정 전용 직통 API (business_discovery 제약을 피하기 위해 직접 media 호출)
            java.net.URI uri = org.springframework.web.util.UriComponentsBuilder.fromUriString("https://graph.facebook.com")
                    .pathSegment(apiVersion, accountId, "media")
                    .queryParam("fields", "id,timestamp,like_count,comments_count,caption")
                    .queryParam("access_token", accessToken)
                    .build().encode().toUri();

            String response = restTemplate.getForObject(uri, String.class);
            
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            JsonNode root = mapper.readTree(response);
            
            if (root != null && root.has("data")) {
                JsonNode mediaData = root.get("data");
                for (JsonNode mediaNode : mediaData) {
                    String id = mediaNode.has("id") ? mediaNode.get("id").asText() : null;
                    if (id == null) continue;
                    
                    String timestampStr = mediaNode.has("timestamp") ? mediaNode.get("timestamp").asText() : null;
                    LocalDateTime timestamp = timestampStr != null 
                            ? LocalDateTime.parse(timestampStr, java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME) 
                            : LocalDateTime.now();
                    
                    int likeCount = mediaNode.has("like_count") ? mediaNode.get("like_count").asInt() : 0;
                    int commentsCount = mediaNode.has("comments_count") ? mediaNode.get("comments_count").asInt() : 0;
                    String caption = mediaNode.has("caption") ? mediaNode.get("caption").asText() : "";
                    
                    apiPosts.add(SocialMediaPost.builder()
                            .account(account)
                            .platformPostId(id)
                            .timestamp(timestamp)
                            .likeCount(likeCount)
                            .commentsCount(commentsCount)
                            .caption(caption)
                            .videoType("LONG") // Fallback
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch from Instagram API, using mock data", e);
            apiPosts = getMockData(account); // Fallback to mock data if it fails
        }

        // 프론트엔드 UI 테스트를 위해, 실제 계정에 게시물이 0개라면 임시(Mock) 데이터를 채워넣습니다.
        if (apiPosts.isEmpty()) {
            log.info("API 호출은 성공했으나 게시물이 0개입니다. UI 테스트를 위해 Mock 데이터를 생성합니다.");
            apiPosts = getMockData(account);
        }

        List<SocialMediaPost> savedPosts = new ArrayList<>();
        for (SocialMediaPost apiPost : apiPosts) {
            SocialMediaPost existingPost = postRepository.findByAccountAndPlatformPostId(account, apiPost.getPlatformPostId())
                    .orElse(null);

            int likes = apiPost.getLikeCount() != null ? apiPost.getLikeCount() : 0;
            int comments = apiPost.getCommentsCount() != null ? apiPost.getCommentsCount() : 0;
            int engagement = likes + comments;

            if (existingPost != null) {
                // Update
                existingPost.setLikeCount(likes);
                existingPost.setCommentsCount(comments);
                existingPost.setEngagement(engagement);
                existingPost.setCaption(apiPost.getCaption());
                savedPosts.add(postRepository.save(existingPost));
            } else {
                // Insert
                apiPost.setLikeCount(likes);
                apiPost.setCommentsCount(comments);
                apiPost.setEngagement(engagement);
                savedPosts.add(postRepository.save(apiPost));
            }
        }
        
        // Return descending order
        savedPosts.sort((p1, p2) -> p2.getTimestamp().compareTo(p1.getTimestamp()));
        return savedPosts;
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
        if (posts == null || posts.size() < 2) return 0.0;
        
        int mid = posts.size() / 2;
        List<SocialMediaPost> recentHalf = posts.subList(0, mid);
        List<SocialMediaPost> pastHalf = posts.subList(mid, posts.size());

        double recentMedian = calculateMedian(recentHalf);
        double pastMedian = calculateMedian(pastHalf);

        if (pastMedian == 0) return 0.0;
        return ((recentMedian - pastMedian) / pastMedian) * 100.0;
    }

    private double calculateMedian(List<SocialMediaPost> halfPosts) {
        if (halfPosts.isEmpty()) return 0.0;
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

    private List<SocialMediaPost> getMockData(SocialAccount account) {
        List<SocialMediaPost> mockPosts = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (int i = 0; i < 365; i++) {
            // i=0 is today, i=364 is last year. 
            // We want exponential-like upward trend towards today.
            int daysFromStart = 365 - i;
            
            // Base growth: Starts low, grows faster later.
            double growthFactor = Math.pow(daysFromStart / 365.0, 2); 
            int baseLikes = 50 + (int)(growthFactor * 5000);
            
            // Add some realistic noise and sine wave for volatility
            double wave = Math.sin(daysFromStart * 0.15) * (100 + growthFactor * 500);
            int noise = (int)(Math.random() * (100 + growthFactor * 500));
            
            int likes = baseLikes + (int)wave + noise;
            if (likes < 10) likes = 10; // Floor at 10 likes
            
            // Random multiplier for views (10x to 25x of likes)
            int views = likes * (10 + (int)(Math.random() * 16));

            // Sample video URLs for testing
            String[] sampleVideos = {
                "https://www.w3schools.com/html/mov_bbb.mp4",
                "https://media.w3.org/2010/05/sintel/trailer.mp4",
                "https://media.w3.org/2010/05/bunny/trailer.mp4",
                "https://vjs.zencdn.net/v/oceans.mp4",
                "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
                "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            };

            mockPosts.add(SocialMediaPost.builder()
                    .account(account)
                    .platformPostId("mock_post_" + i)
                    .platform("INSTAGRAM")
                    .timestamp(now.minusDays(i))
                    .likeCount(likes)
                    .commentsCount(likes / 10)
                    .viewCount(views)
                    .engagement(likes + (likes / 10))
                    .caption("This is a mock post from " + i + " days ago. #growth #hookingpoint")
                    .mediaUrl(i % 3 == 0 ? sampleVideos[i % 6] : null) // Add video to some posts
                    .videoType(i % 3 == 0 ? "SHORT" : "LONG") // Mock video type
                    .build());
        }
        return mockPosts;
    }
}
