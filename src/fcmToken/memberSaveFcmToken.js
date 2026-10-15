import { claimFcmToken, isValidToken } from "./claimFcmToken.js";

const memberSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!isValidToken(fcmToken)) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });
    }

    await claimFcmToken("member", req.member._id, fcmToken);
    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.error("Member FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberSaveFcmToken;