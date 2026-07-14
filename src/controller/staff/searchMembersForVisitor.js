// controllers/staff/searchMembersForVisitor.js
import Member from "../../model/member.js";

const searchMembersForVisitor = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const { query } = req.query;

    if (!query || query.trim().length < 1)
      return res
        .status(400)
        .json({ success: false, message: "Query required" });

    // sab role (primary + family) pe search
    const matches = await Member.find({
      buildingCode,
      approvalStatus: "Approved",
      isVerified: true,
      $or: [
        { unitNo: { $regex: query.trim(), $options: "i" } },
        { fullName: { $regex: query.trim(), $options: "i" } },
        { ownerName: { $regex: query.trim(), $options: "i" } },
      ],
    }).select("unitNo memberType");

    if (matches.length === 0)
      return res.status(200).json({ success: true, results: [] });

    const unitNos = [...new Set(matches.map((m) => m.unitNo))];

    const allMembers = await Member.find({
      buildingCode,
      unitNo: { $in: unitNos },
      approvalStatus: "Approved",
      isVerified: true,
    }).select(
      "fullName unitNo role relation primaryPhone memberType memberStatus"
    );

    const grouped = {};
    allMembers.forEach((m) => {
      if (!grouped[m.unitNo]) grouped[m.unitNo] = [];
      grouped[m.unitNo].push(m);
    });

    const results = Object.entries(grouped).map(([unitNo, members]) => ({
      unitNo,
      buildingCode,
      members,
    }));

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("searchMembersForVisitor error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default searchMembersForVisitor;
