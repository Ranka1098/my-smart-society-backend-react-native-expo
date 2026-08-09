import StaffModel from "../../model/staff.js";
import staffRejectionNotificationEmail from "../../utils/staffRejectionNotificationEmail.js"; // apna actual path

const rejectStaff = async (req, res) => {
  try {
    const { buildingCode } = req;
    const { staffId } = req.params;

    const staff = await StaffModel.findOne({ _id: staffId, buildingCode });
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    if (staff.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: `Staff already ${staff.status}` });
    }

    staff.status = "rejected";
    await staff.save();

    // ✅ rejection email (non-blocking)
    try {
      await staffRejectionNotificationEmail({
        staffEmail: staff.email,
        staffName: staff.workerName,
      });
    } catch (mailErr) {
      console.error("Staff rejection email failed:", mailErr.message);
    }

    return res.status(200).json({ success: true, message: "Staff rejected" });
  } catch (error) {
    console.error("rejectStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default rejectStaff;
