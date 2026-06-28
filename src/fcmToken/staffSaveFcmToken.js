import StaffModel from "../model/staff.js";

const staffSaveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken)
      return res
        .status(400)
        .json({ success: false, message: "FCM token required" });

    await StaffModel.findByIdAndUpdate(req.staff._id, { fcmToken });
    return res.status(200).json({ success: true, message: "FCM token saved" });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default staffSaveFcmToken;
