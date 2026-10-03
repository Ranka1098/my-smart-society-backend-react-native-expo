import StaffModel from "../../model/staff.js";
import staffRejectionNotificationEmail from "../../utils/staffRejectionNotificationEmail.js";

const rejectStaff = async (req, res) => {
  try {
    const { buildingCode } = req;
    const { staffId } = req.params;

    // ✅ reject = delete (atomic). Email/phone free ho jata hai
    const staff = await StaffModel.findOneAndDelete({
      _id: staffId,
      buildingCode,
      status: "pending",
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found or already processed",
      });
    }

    // rejection email (non-blocking). Delete ke baad bhi `staff` mein data hai
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
