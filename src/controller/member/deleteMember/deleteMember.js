import Member from "../../../model/member.js";
import Maintenance from "../../../model/maintenance.js";

const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const buildingCode = req.buildingCode;

    if (!id) {
      return res.status(400).json({ message: "Member id is required" });
    }

    const member = await Member.findOne({ _id: id, buildingCode });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // STEP 1: Mark all maintenance records as memberDeleted
    await Maintenance.updateMany(
      { memberId: id, buildingCode },
      { memberDeleted: true }
    );

    // STEP 2: Delete member
    await Member.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Member & maintenance deleted successfully",
    });
  } catch (error) {
    console.error("Delete Member Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export default deleteMember;
