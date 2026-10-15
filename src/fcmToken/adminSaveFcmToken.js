import { claimFcmToken, isValidToken } from "./claimFcmToken.js";

const adminSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!isValidToken(fcmToken)) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });
    }

    const adminId = req.admin?._id ?? req.admin?.id; // adminAuth se
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await claimFcmToken("admin", adminId, fcmToken);
    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.error("Admin FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default adminSaveFcmToken;