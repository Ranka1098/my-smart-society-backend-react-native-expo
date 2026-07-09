// controllers/staff/searchMembersForVisitor.js
import Member from "../../model/member.js";

const searchMembersForVisitor = async (req, res) => {
  try {
    const buildingCode = req.buildingCode; // staffAuth se
    const { query } = req.query; // ?query=A-101 ya "Rohan"

    if (!query || query.trim().length < 1)
      return res
        .status(400)
        .json({ success: false, message: "Query required" });

    // Pehle matching units dhundo (primary members se)
    const primaryMatches = await Member.find({
      buildingCode,
      role: "primary",
      approvalStatus: "Approved",
      isVerified: true,
      $or: [
        { unitNo: { $regex: query.trim(), $options: "i" } },
        { fullName: { $regex: query.trim(), $options: "i" } },
        { ownerName: { $regex: query.trim(), $options: "i" } },
      ],
    }).select("unitNo memberType");

    if (primaryMatches.length === 0)
      return res.status(200).json({ success: true, results: [] });

    // Un units ke saare members (primary + family)
    const unitNos = [...new Set(primaryMatches.map((m) => m.unitNo))];

    const allMembers = await Member.find({
      buildingCode,
      unitNo: { $in: unitNos },
      approvalStatus: "Approved",
      isVerified: true,
    }).select(
      "fullName unitNo role relation primaryPhone memberType memberStatus"
    );

    // Unit ke hisaab se group karo
    const grouped = {};
    allMembers.forEach((m) => {
      if (!grouped[m.unitNo]) grouped[m.unitNo] = [];
      grouped[m.unitNo].push(m);
    });

    const results = Object.entries(grouped).map(([unitNo, members]) => ({
      unitNo,
      buildingCode, // ✅ yeh line add — frontend selectUnit isi ko use karta
      members,
    }));

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("searchMembersForVisitor error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default searchMembersForVisitor;
