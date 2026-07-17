import superAdminModel from "../model/superAdmin.js";

const superAdminRemoveFcmToken = async (req, res) => {
  try {
    const superAdminId = req.superAdmin.id;
    await superAdminModel.findByIdAndUpdate(superAdminId, { fcmToken: null });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default superAdminRemoveFcmToken;