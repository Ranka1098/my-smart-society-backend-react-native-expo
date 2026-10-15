import { claimFcmToken, isValidToken } from "./claimFcmToken.js";

const staffSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!isValidToken(fcmToken)) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });
    }

    await claimFcmToken("staff", req.staff._id, fcmToken);
    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (e) {
    console.error("staffSaveFcmToken error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default staffSaveFcmToken;