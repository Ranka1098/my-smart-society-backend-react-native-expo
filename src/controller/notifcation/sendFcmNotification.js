import { getMessaging } from "firebase-admin/messaging";

const CHANNELS = {
  doorbell: { channelId: "visitor_alert", sound: "doorbell" },
  default: { channelId: "default_sound", sound: "default" },
};

const pickChannel = (type) =>
  type === "VISITOR_APPROVAL" ? CHANNELS.doorbell : CHANNELS.default;

const DEAD_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

// return: { successCount, failureCount, deadTokens }
export const sendFCM = async (tokens, title, body, data = {}) => {
  const empty = { successCount: 0, failureCount: 0, deadTokens: [] };
  if (!tokens?.length) return empty;

  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return empty;

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)]),
  );

  const ch = pickChannel(stringData.type);

  try {
    const startTime = Date.now();
    const result = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        ttl: 2 * 60 * 1000,
        notification: {
          channelId: ch.channelId,
          sound: ch.sound,
          ...(stringData.visitorId && {
            tag: `${stringData.type}-${stringData.visitorId}`,
          }),
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            sound: ch.sound === "default" ? "default" : "doorbell.wav",
            "content-available": 1,
          },
        },
      },
    });

    console.log(
      `[FCM] ${Date.now() - startTime}ms | ${result.successCount} ok, ${result.failureCount} failed`,
    );

    const deadTokens = [];
    result.responses.forEach((r, i) => {
      if (r.success) return;
      console.log(
        "[FCM FAIL]",
        uniqueTokens[i]?.slice(0, 20) + "...",
        "→",
        r.error?.code || r.error?.message,
      );
      if (DEAD_CODES.includes(r.error?.code)) deadTokens.push(uniqueTokens[i]);
    });

    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
      deadTokens,
    };
  } catch (err) {
    console.log("[FCM] Error:", err.message);
    return empty;
  }
};
