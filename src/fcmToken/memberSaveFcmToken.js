import memberModel from "../../src/model/member.js";

const memberSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken, deviceId } = req.body;
    const memberId = req.member._id; // memberAuth → req.member._id

    if (!fcmToken) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });
    }

    await memberModel.findByIdAndUpdate(memberId, {
      fcmToken,
      currentDeviceId: deviceId || null,
    });

    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.log("Member FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberSaveFcmToken;
