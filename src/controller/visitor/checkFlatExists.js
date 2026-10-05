import memberModel from "../../model/member.js";

const MEMBER_TYPES = ["Flat", "Shop"];

// User input regex me jaane se pehle escape karo ("A(" jaisa input crash karta tha)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isStr = (v) => typeof v === "string" && v.trim().length > 0;

const checkFlatExists = async (req, res) => {
  try {
    const { buildingCode, unitNo, memberType } = req.query;

    // string check: ?unitNo[$ne]=x jaise NoSQL injection se bachav
    if (!isStr(buildingCode) || !isStr(unitNo)) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur unitNo required" });
    }

    if (memberType !== undefined && !MEMBER_TYPES.includes(memberType)) {
      return res
        .status(400)
        .json({ success: false, message: "memberType must be Flat or Shop" });
    }

    const filter = {
      buildingCode: buildingCode.trim(),
      unitNo: new RegExp(`^${escapeRegex(unitNo.trim())}$`, "i"), // case-insensitive
    };
    if (memberType) filter.memberType = memberType;

    const member = await memberModel
      .findOne(filter)
      .select("fullName memberType unitNo")
      .lean();

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
