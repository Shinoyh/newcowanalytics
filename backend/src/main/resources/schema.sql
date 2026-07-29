CREATE TABLE IF NOT EXISTS social_account (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_username_platform (username, platform)
);

CREATE TABLE IF NOT EXISTS social_media_post (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT NOT NULL,
    platform_post_id VARCHAR(255) NOT NULL,
    timestamp DATETIME NOT NULL,
    like_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    engagement INT DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_account_post (account_id, platform_post_id),
    CONSTRAINT fk_post_account FOREIGN KEY (account_id) REFERENCES social_account(id) ON DELETE CASCADE
);
