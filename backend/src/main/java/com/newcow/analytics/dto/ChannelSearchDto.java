package com.newcow.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelSearchDto {
    private String username; // The @handle or unique identifier
    private String displayName; // The human-readable channel title
    private String platform;
    private String profilePictureUrl;
}
