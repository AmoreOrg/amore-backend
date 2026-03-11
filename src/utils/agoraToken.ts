/**
 * Agora Token Generator — creates RTC tokens for audio/video channels.
 * Uses agora-access-token package for server-side token generation.
 */
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

const TOKEN_EXPIRY_SECONDS = 3600; // 1 hour

export interface AgoraTokenResult {
  channelName: string;
  rtcToken: string;
  uid: number;
}

/**
 * Generate an Agora RTC token for a specific channel and user.
 * @param uid - Numeric user ID for Agora (use 0 for dynamic assignment)
 * @param channelName - Optional channel name; generated if not provided
 */
export function generateRtcToken(uid: number = 0, channelName?: string): AgoraTokenResult {
  const channel = channelName || `amore_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + TOKEN_EXPIRY_SECONDS;

  const token = RtcTokenBuilder.buildTokenWithUid(
    config.agora.appId,
    config.agora.appCertificate,
    channel,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpireTime,
  );

  return {
    channelName: channel,
    rtcToken: token,
    uid,
  };
}
