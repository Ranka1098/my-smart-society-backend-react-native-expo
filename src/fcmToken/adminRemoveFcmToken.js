import adminModel from "../model/admin.js";

const adminRemoveFcmToken = async (req, res) => {
  try {
    const adminId = req.admin.id;
    await adminModel.findByIdAndUpdate(adminId, { fcmToken: null });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default adminRemoveFcmToken;