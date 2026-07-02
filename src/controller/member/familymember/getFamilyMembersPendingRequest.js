import Member from "../../model/member.js";

const getFamilyMembersPendingRequest = async (req, res) => {
  try {
    const { buildingCode } = req.admin;

    const familyMembers = await Member.find({
      buildingCode,
      role: "family",
      isVerified: true,
      approvalStatus: "Pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, familyMembers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getFamilyMembersPendingRequest;
