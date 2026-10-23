import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";

const cancelPreApproved = async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = req.member?._id;
    const buildingCode = req.member?.buildingCode;

    if (!memberId || !buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    // ATOMIC: apna, isi building ka, abhi Pending, OTP wala
    const visitor = await Visitor.findOneAndUpdate(
      {
        _id: id,
        buildingCode,
        respondedBy: memberId,
        verificationMethod: "OTP",
        status: "Pending",
      },
      {
        $set: { status: "Rejected", rejectedAt: new Date() },
        $unset: { otp: "" },
      },
      { returnDocument: "after" },
    );

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Nahi mila ya pehle hi action ho chuka hai",
      });
    }

    req.app.get("io")?.to(`guard_${visitor.buildingCode}`).emit(
      "visitor_cancelled",
      { visitorId: visitor._id },
    );

    return res.json({ success: true, data: visitor });
  } catch (e) {
    console.error("cancelPreApproved error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default cancelPreApproved;