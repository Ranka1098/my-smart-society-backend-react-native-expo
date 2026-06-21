import { getMessaging } from "firebase-admin/messaging";

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
  try {
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default", // ✅ ADD
          defaultSound: true, // ← ADD
          defaultVibrateTimings: true, // ← ADD
        },
      },
    });
    console.log(
      `[FCM] Sent: ${result.successCount} success, ${result.failureCount} failed`
    );
  } catch (err) {
    console.log("[FCM] Error:", err.message);
  }
};
