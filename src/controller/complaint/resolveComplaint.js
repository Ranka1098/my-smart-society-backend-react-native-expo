import complaintModel from "../../model/complaint.js";
import memberModel from "../../model/member.js";

const resolveComplaint = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId;

    const complaintId = req.params.id;

    if (!adminId || !buildingCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ===============================
    // ✅ FIND COMPLAINT (Only same building)
    // ===============================
    const complaint = await complaintModel.findOne({
      _id: complaintId,
      buildingCode,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Already resolved",
      });
    }

    // ===============================
    // ✅ UPDATE COMPLAINT
    // ===============================
    complaint.status = "RESOLVED";
    complaint.resolvedBy = adminId;
    complaint.resolvedAt = new Date();
    await complaint.save();

    // ===============================
    // ✅ FIND MEMBER (Only same building)
    // ===============================
    const member = await memberModel.findOne({
      _id: complaint.memberId,
      buildingCode,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const title = "Complaint Resolved";
    const message = `Your complaint (${complaint.category}) has been resolved`;

    // ===============================
    // 🔥 NOTIFICATION ENGINE (ONLY THAT MEMBER)
    // ===============================
    const receivers = [
      {
        receiverId: member._id,
        receiverModel: "MEMBER",
        fcmToken: member.currentFcmToken || null,
      },
    ];

    return res.status(200).json({
      success: true,
      message: "Complaint resolved",
      complaint,
    });
  } catch (error) {
    console.error("Resolve Complaint Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default resolveComplaint;
