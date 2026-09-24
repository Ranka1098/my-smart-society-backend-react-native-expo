import { getMessaging } from "firebase-admin/messaging";

export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return;

  // ✅ dedup — stale tokens hatao
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return;

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)]),
  );

  try {
    const startTime = Date.now();
    const result = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      // ✅ ADD — notification field (killed state me system tray dikhe)
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: "high",
      },
      // ✅ ADD — apns-priority header iOS ke liye
      apns: {
        headers: {
          "apns-priority": "10",
        },
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

    // ✅ debug — fail reasons log karo
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