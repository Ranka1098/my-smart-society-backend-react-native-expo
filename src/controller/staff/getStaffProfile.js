import StaffModel from "../../model/staff.js";

// GET /api/staff/getStaffProfile
// staffAuth middleware se req.staff._id milega
const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff?._id;
    if (!staffId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const staff = await StaffModel.findById(staffId).select(
      "-password -otp -otpExpiry"
    );

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    res.json({ success: true, data: staff });
  } catch (e) {
    console.error("getStaffProfile error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getStaffProfile;
