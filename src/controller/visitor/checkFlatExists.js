import memberModel from "../../model/member.js";

const checkFlatExists = async (req, res) => {
  try {
    const { buildingCode, unitNo } = req.query;

    if (!buildingCode || !unitNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur unitNo required" });
    }

    const exists = await memberModel.exists({
      buildingCode,
      unitNo: unitNo.trim().toUpperCase(),
    });

    return res.status(200).json({ success: true, exists: !!exists });
  } catch (error) {
    console.error("checkFlatExists error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default checkFlatExists;
