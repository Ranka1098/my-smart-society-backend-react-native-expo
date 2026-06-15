import adminModel from "../../src/model/admin.js";

const adminSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const adminId = req.admin.id; // adminAuth middleware se aata hai

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "FCM token required" });
    }

    await adminModel.findByIdAndUpdate(adminId, { fcmToken });

    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (error) {
    console.log("FCM Token Save Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default adminSaveFcmToken;