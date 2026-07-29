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
    private String username;
    private String platform;
    private String profilePictureUrl;
}
