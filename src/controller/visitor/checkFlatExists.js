import memberModel from "../../model/member.js";

const checkFlatExists = async (req, res) => {
  try {
    const { buildingCode, unitNo, memberType } = req.query;

    if (!buildingCode || !unitNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur unitNo required" });
    }

    const filter = {
      buildingCode,
      unitNo: new RegExp(`^${unitNo.trim()}$`, "i"), // ✅ FIX — case-insensitive match
    };
    if (memberType) filter.memberType = memberType; // "Flat" | "Shop"

    const member = await memberModel
      .findOne(filter)
      .select("fullName memberType unitNo");

    return res.status(200).json({
      success: true,
      exists: !!member,
      memberName: member?.fullName || null,
    });
  } catch (error) {
    console.error("checkFlatExists error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default checkFlatExists;
