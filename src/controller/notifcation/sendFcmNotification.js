import { getMessaging } from "firebase-admin/messaging";

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
  try {
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      data: { title, body, ...stringData },
      android: {
        priority: "high", // ✅ bas itna, koi notification sub-key nahi
      },
      apns: {
        payload: {
          aps: { "content-available": 1, sound: "default" }, // silent data push, badge alag se nahi
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
