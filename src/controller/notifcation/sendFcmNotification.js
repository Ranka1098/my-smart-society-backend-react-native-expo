import { getMessaging } from "firebase-admin/messaging";

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
  try {
    const startTime = Date.now();
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: { title, body, ...stringData },
      android: {
        priority: "high",
        notification: {
          channelId: "default_sound",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
          },
        },
      },
    });
    console.log(`[FCM] Sent in ${Date.now() - startTime}ms`);
    console.log(
      `[FCM] Sent: ${result.successCount} success, ${result.failureCount} failed`
    );
  } catch (err) {
    console.log("[FCM] Error:", err.message);
  }
};
