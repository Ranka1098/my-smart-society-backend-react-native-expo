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

    // ✅ AGAR PRIMARY HAI → uske family members bhi nikal lo
    let familyIds = [];
    if (member.role === "primary") {
      const familyMembers = await Member.find({
        buildingCode,
        unitNo: member.unitNo,
        memberType: member.memberType,
        role: "family",
      }).select("_id");

      familyIds = familyMembers.map((f) => f._id);
    }

    const allIdsToDelete = [id, ...familyIds];

    // STEP 1: Mark all maintenance records as memberDeleted (primary + family)
    await Maintenance.updateMany(
      { memberId: { $in: allIdsToDelete }, buildingCode },
      { memberDeleted: true }
    );

    // STEP 2: Delete primary + family members
    await Member.deleteMany({ _id: { $in: allIdsToDelete } });

    return res.status(200).json({
      success: true,
      message:
        familyIds.length > 0
          ? `Member & ${familyIds.length} family member(s) deleted successfully`
          : "Member & maintenance deleted successfully",
    });
  } catch (error) {
    console.error("Delete Member Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export default deleteMember;
