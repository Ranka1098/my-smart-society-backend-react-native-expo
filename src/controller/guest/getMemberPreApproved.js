import Visitor from "../../model/Visitor.js";

const getMemberPreApproved = async (req, res) => {
  try {
    const { buildingCode, memberId } = req.query;
    const list = await Visitor.find({
      buildingCode,
      respondedBy: memberId,
      status: { $in: ["Pending", "Approved"] },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: list }); // otp field already included, list member ka apna hai — safe
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getMemberPreApproved;