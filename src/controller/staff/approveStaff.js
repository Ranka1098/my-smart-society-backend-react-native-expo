import StaffModel from "../../model/staff.js";
import { notifyAllMembers } from "../notifcation/notifyMembers.js";
import staffApprovalNotificationEmail from "../../utils/staffApprovalNotificationEmail.js"; // ✅ apna actual path

const approveStaff = async (req, res) => {
  try {
    const { buildingCode } = req;
    const buildingId = req.admin.buildingId;
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

    staff.status = "approved";
    staff.joiningDate = new Date();
    await staff.save();

    // ✅ NAYA — approval email (member wale pattern jaisa, non-blocking)
    try {
      await staffApprovalNotificationEmail({
        staffEmail: staff.email,
        staffName: staff.workerName,
      });
    } catch (mailErr) {
      console.error("Staff approval email failed:", mailErr.message);
    }

    const io = req.app.get("io");
    await notifyAllMembers({
      io,
      buildingCode,
      buildingId,
      type: "NEW_STAFF_MEMBER_ADDED",
      title: "New Staff Added 👷",
      message: `${staff.workerName} joined as ${staff.role}`,
      referenceId: staff._id,
      referenceModel: "Staff",
      data: {
        staffId: staff._id.toString(),
        workerName: staff.workerName,
        role: staff.role,
        workerPhoneNumber: staff.workerPhoneNumber || "",
        workerAddress: staff.workerAddress || "",
        workerPhoto: staff.workerPhoto || "",
        joiningDate: staff.joiningDate.toISOString(),
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Staff approved successfully" });
  } catch (error) {
    console.error("approveStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default approveStaff;
