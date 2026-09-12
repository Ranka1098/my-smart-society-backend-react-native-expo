import { getMessaging } from "firebase-admin/messaging";

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;

  // ✅ ADD — duplicate/stale tokens hatao (safety net)
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return;

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)]),
  );
  try {
    const startTime = Date.now();
    const result = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens, // ✅ CHANGE — ab deduped array use ho raha
      data: { title, body, ...stringData },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            "content-available": 1,
          },
        },
      },
    });
    console.log(`[FCM] Sent in ${Date.now() - startTime}ms`);
    console.log(
      `[FCM] Sent: ${result.successCount} success, ${result.failureCount} failed`,
    );
  } catch (err) {
    console.log("[FCM] Error:", err.message);
  }
};
