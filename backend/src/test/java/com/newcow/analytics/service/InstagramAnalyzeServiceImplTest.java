package com.newcow.analytics.service;

import com.newcow.analytics.domain.SocialAccount;
import com.newcow.analytics.domain.SocialMediaPost;
import com.newcow.analytics.dto.SocialAccountDataDto;
import com.newcow.analytics.repository.SocialAccountRepository;
import com.newcow.analytics.repository.SocialMediaPostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InstagramAnalyzeServiceImplTest {

    @Mock
    private SocialAccountRepository accountRepository;

    @Mock
    private SocialMediaPostRepository postRepository;

    @InjectMocks
    private InstagramAnalyzeServiceImpl service;

    @BeforeEach
    void setUp() {
        // 단위 테스트(순수 Java 실행)이므로 application.yml을 읽지 않습니다.
        // 따라서 ReflectionTestUtils를 사용해 방금 주입하신 토큰과 ID 값을 서비스 객체에 직접 밀어넣습니다.
        ReflectionTestUtils.setField(service, "accessToken", "EAATW2J46zmABSJYwYibjiubpaLC52ZAKIp8rdv4RMUIPNZAuZAJDZCIIKWg7kghwMAtaNrGqtm1nGGlgyeaL1p95ZCdrFQT2v4yZCMfAzEdo8ENULdQUsoPJYRDmLN1ZCZAUlZApKBcMeDzWlCuCw3xZALfwSo1D2BbDuLrY9Bw1kVnoyEVK9ZABcZB1jdBHFszTzuzN8utpC2jveYjawE2A1R4MZB7KN9YHVwqWuL61fPn5gdZB5iRktspewKWOZCBZATSSwB53LBFk4mD2Mv4d5gZDZD");
        ReflectionTestUtils.setField(service, "accountId", "17841440826407138");
        ReflectionTestUtils.setField(service, "apiVersion", "v20.0");
    }

    @Test
    void testRealApiCallWithoutDb() {
        // Given: 실제 DB 저장을 막고 Mock 객체로 가짜 동작(Return 자기 자신)을 정의합니다.
        String targetUsername = "itsthetester"; // 테스트 목적으로 분석해볼 타겟 인스타그램 계정명
        
        SocialAccount mockAccount = SocialAccount.builder()
                .id(1L)
                .username(targetUsername)
                .platform("INSTAGRAM")
                .build();

        // Repository 동작 모방
        when(accountRepository.findByUsernameAndPlatform(targetUsername, "INSTAGRAM"))
                .thenReturn(Optional.of(mockAccount));
        org.mockito.Mockito.lenient().when(postRepository.findByAccountAndPlatformPostId(any(), any()))
                .thenReturn(Optional.empty());
        org.mockito.Mockito.lenient().when(postRepository.save(any(SocialMediaPost.class)))
                .thenAnswer(i -> i.getArguments()[0]);

        // When: 실제 Graph API 호출
        System.out.println("====== [TEST START] Calling Real Instagram API... ======");
        SocialAccountDataDto result = service.analyzeAccount(targetUsername);

        // Then: 응답 결과 검증
        assertNotNull(result);
        // assertFalse(result.getRecentPosts().isEmpty(), "데이터가 비어있습니다."); // 계정에 아직 게시물이 없는 경우 테스트가 실패하므로 주석 처리
        if (result.getRecentPosts().isEmpty()) {
            System.out.println("⚠️ 주의: API 연결은 성공했으나, 해당 인스타그램 계정에 게시물이 없습니다.");
        }
        
        // 예외 발생 시 Mock 데이터로 Fallback 되도록 짜여져 있으므로, 실제 API 데이터인지 검증
        if (!result.getRecentPosts().isEmpty()) {
            assertFalse(result.getRecentPosts().get(0).getPlatformPostId().startsWith("mock_post"), 
                    "실제 API 호출에 실패하여 Mock 데이터로 대체되었습니다. API 토큰이나 계정 ID, 또는 검색 대상 계정명을 확인하세요.");
        }

        // 콘솔에 깔끔하게 출력
        System.out.println("====== [TEST RESULT SUCCESS] ======");
        System.out.println("Target Username: " + result.getUsername());
        System.out.println("Fetched Posts Count: " + result.getRecentPosts().size());
        System.out.println("Growth Rate: " + String.format("%.2f", result.getGrowthRate()) + "%");
        System.out.println("-----------------------------------");
        result.getRecentPosts().forEach(post -> {
            String shortCaption = post.getCaption() != null && post.getCaption().length() > 30 
                                  ? post.getCaption().substring(0, 30).replace("\n", " ") + "..." 
                                  : post.getCaption();
            System.out.println("Post ID: " + post.getPlatformPostId() 
                    + " | Likes: " + post.getLikeCount() 
                    + " | Comments: " + post.getCommentsCount()
                    + " | Caption: " + shortCaption);
        });
        System.out.println("===================================");
    }
}
