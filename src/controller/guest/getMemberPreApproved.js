import Visitor from "../../model/Visitor.js";

const getMemberPreApproved = async (req, res) => {
  try {
    const memberId = req.member?._id;
    const buildingCode = req.member?.buildingCode;
    if (!memberId || !buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const list = await Visitor.find({
      buildingCode,
      respondedBy: memberId,
      status: { $in: ["Pending", "Approved"] },
    })
      .select("+otp")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: list });
  } catch (e) {
    console.error("getMemberPreApproved error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getMemberPreApproved;
