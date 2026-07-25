import StaffModel from "../../model/staff.js";
const rejectStaff = async (req, res) => {
  try {
    const { buildingCode } = req;
    const { staffId } = req.params;
    const { reason } = req.body;

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
    staff.rejectionReason = reason || "Not specified";
    await staff.save();

    // TODO: Notify staff via FCM/email that they are rejected

    return res.status(200).json({ success: true, message: "Staff rejected" });
  } catch (error) {
    console.error("rejectStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default rejectStaff;
