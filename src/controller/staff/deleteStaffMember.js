import StaffModel from "../../model/staff.js";

const deleteStaffMember = async (req, res) => {
  try {
    const { id } = req.params;
    const buildingCode = req.buildingCode; // token se aaya

    const staff = await StaffModel.findOne({ _id: id, buildingCode });

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found for your building",
      });
    }

    // 🟩 Delete Staff Member
    await StaffModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Delete Staff Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export default deleteStaffMember;
