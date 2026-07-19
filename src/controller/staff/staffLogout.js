import StaffModel from "../../model/staff.js";

const staffLogout = async (req, res) => {
  try {

    // FCM token remove
    await StaffModel.findByIdAndUpdate(req.staff.id, { fcmToken: null });

    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Staff Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default staffLogout;