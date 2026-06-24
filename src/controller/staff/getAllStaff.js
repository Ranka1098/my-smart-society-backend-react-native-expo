import StaffModel from "../../model/Staff.js";
const getAllStaff = async (req, res) => {
  try {
    const { buildingCode } = req;
    const { status } = req.query; // optional filter: pending/approved/rejected

    const query = { buildingCode, isEmailVerified: true };
    if (status) query.status = status;

    const staffList = await StaffModel.find(query)
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: staffList });
  } catch (error) {
    console.error("getAllStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getAllStaff;
