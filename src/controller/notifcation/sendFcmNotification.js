import { getMessaging } from "firebase-admin/messaging";

const CHANNELS = {
  doorbell: { channelId: "visitor_alert", sound: "doorbell" },
  default: { channelId: "default_sound", sound: "default" },
};

const DOORBELL_TYPES = ["VISITOR_APPROVAL"];

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;

  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return;

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)]),
  );

  const ch = DOORBELL_TYPES.includes(stringData.type)
    ? CHANNELS.doorbell
    : CHANNELS.default;

  try {
    const startTime = Date.now();
    const result = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channelId: ch.channelId, // ✅ app ke channel ID se same
          sound: ch.sound, // ✅ res/raw ki file, extension nahi
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

    console.log(`[FCM] Sent in ${Date.now() - startTime}ms`);
    console.log(
      `[FCM] Sent: ${result.successCount} success, ${result.failureCount} failed`,
    );

    result.responses.forEach((r, i) => {
      if (!r.success) {
        console.log(
          "[FCM FAIL]",
          uniqueTokens[i]?.slice(0, 20) + "...",
          "→",
          r.error?.message,
        );
      }
    });
  } catch (err) {
    console.log("[FCM] Error:", err.message);
  }
};
