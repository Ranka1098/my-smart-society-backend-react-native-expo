import StaffModel from "../model/staff.js";

const staffRemoveFcmToken = async (req, res) => {
  try {
    await StaffModel.findByIdAndUpdate(req.staff._id, { fcmToken: null });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default staffRemoveFcmToken;
