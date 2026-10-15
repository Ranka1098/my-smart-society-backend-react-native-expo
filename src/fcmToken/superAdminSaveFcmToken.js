import { claimFcmToken, isValidToken } from "./claimFcmToken.js";

const superAdminSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!isValidToken(fcmToken)) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });
    }

    const id = req.superAdmin?._id ?? req.superAdmin?.id; // superAdminAuth se
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await claimFcmToken("superAdmin", id, fcmToken);
    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.error("SuperAdmin FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminSaveFcmToken;
