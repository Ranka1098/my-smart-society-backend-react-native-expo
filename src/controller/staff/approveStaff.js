import StaffModel from "../../model/Staff.js";
const approveStaff = async (req, res) => {
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

    staff.status = "approved";
    staff.joiningDate = new Date();
    await staff.save();

    // TODO: Notify staff via FCM/email that they are approved

    return res
      .status(200)
      .json({ success: true, message: "Staff approved successfully" });
  } catch (error) {
    console.error("approveStaff error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default approveStaff;
