import Visitor from "../../model/Visitor.js";

const cancelPreApproved = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findByIdAndUpdate(
      id,
      { status: "Rejected", rejectedAt: new Date() },
      { new: true }
    );
    if (!visitor)
      return res.status(404).json({ success: false, message: "Nahi mila" });

    const io = req.app.get("io");

    // ✅ NEW: guard ke PreApprovedDetail se turant hatao
    io.to(`guard_${visitor.buildingCode}`).emit("visitor_cancelled", {
      visitorId: visitor._id,
    });

    res.json({ success: true, data: visitor });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default cancelPreApproved;
