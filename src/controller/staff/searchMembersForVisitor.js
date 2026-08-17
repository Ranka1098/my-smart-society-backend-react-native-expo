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
    }).select("unitNo memberType"); // ✅ memberType already select ho raha

    if (matches.length === 0)
      return res.status(200).json({ success: true, results: [] });

    // ✅ CHANGE — unitNo+memberType pair unique nikalo, sirf unitNo nahi
    const unitKeys = [
      ...new Set(matches.map((m) => `${m.unitNo}__${m.memberType}`)),
    ];
    const unitNos = [...new Set(matches.map((m) => m.unitNo))];
    const memberTypes = [...new Set(matches.map((m) => m.memberType))];

    const allMembers = await Member.find({
      buildingCode,
      unitNo: { $in: unitNos },
      memberType: { $in: memberTypes }, // ✅ NAYA — type bhi filter
      approvalStatus: "Approved",
      isVerified: true,
    }).select(
      "fullName unitNo role relation primaryPhone memberType memberStatus"
    );

    // ✅ CHANGE — group key ab unitNo+memberType, warna Flat D7 aur Shop D7 mix ho jate
    const grouped = {};
    allMembers.forEach((m) => {
      const key = `${m.unitNo}__${m.memberType}`;
      if (!unitKeys.includes(key)) return; // sirf wahi group jo actual match se aaye
      if (!grouped[key])
        grouped[key] = { unitNo: m.unitNo, memberType: m.memberType, members: [] };
      grouped[key].members.push(m);
    });

    const results = Object.values(grouped).map((g) => ({
      unitNo: g.unitNo,
      memberType: g.memberType, // ✅ NAYA — frontend ko chahiye
      buildingCode,
      members: g.members,
    }));

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("searchMembersForVisitor error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default searchMembersForVisitor;