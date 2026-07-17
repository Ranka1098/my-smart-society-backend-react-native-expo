import superAdminModel from "../../src/model/superAdmin.js";

const superAdminSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const superAdminId = req.superAdmin.id; // superAdminAuth middleware se aata hai

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "FCM token required" });
    }

    await superAdminModel.findByIdAndUpdate(superAdminId, { fcmToken });

    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.log("FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminSaveFcmToken;