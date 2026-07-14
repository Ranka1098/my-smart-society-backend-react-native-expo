import Visitor from "../../model/Visitor.js";

const getGuardPreApproved = async (req, res) => {
  try {
    const { buildingCode } = req.query;
    const list = await Visitor.find({
      buildingCode,
      status: "Pending",
      respondedBy: { $ne: null }, // sirf wahi jo member ne khud pre-approve kiya (guard-initiated se alag)
    })
      .populate("respondedBy", "name") // "approved by which member"
      .sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardPreApproved;
