import StaffModel from "../../model/staff.js";
const getPendingStaff = async (req, res) => {
  try {
    const { buildingCode } = req; // from auth middleware

    const staffList = await StaffModel.find({
      buildingCode,
      isEmailVerified: true,
      status: "pending",
    })
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, staff: staffList });
  } catch (error) {
    console.error("getPendingStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getPendingStaff;
