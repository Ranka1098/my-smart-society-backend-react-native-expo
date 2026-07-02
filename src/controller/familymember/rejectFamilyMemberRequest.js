

import Member from "../../model/member.js";

const rejectFamilyMemberRequest = async (req, res) => {
  try {
    const { buildingCode } = req.admin;
    const { id } = req.params;

    const member = await Member.findOneAndUpdate(
      { _id: id, buildingCode, role: "family", approvalStatus: "Pending" },
      { approvalStatus: "Rejected" },
      { new: true }
    );

    if (!member)
      return res.status(404).json({ success: false, message: "Family member not found" });

    return res.status(200).json({ success: true, message: "Family member rejected" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default rejectFamilyMemberRequest;