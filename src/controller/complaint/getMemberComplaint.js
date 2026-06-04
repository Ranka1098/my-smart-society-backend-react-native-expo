import complaintModel from "../../model/complaint.js";

const getMemberComplaints = async (req, res) => {
  try {
      const memberId = req.member._id; // ← was req.memberId

    const buildingCode = req.buildingCode;

    if (!memberId || !buildingCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const complaints = await complaintModel
      .find({ memberId, buildingCode })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Get Member Complaints Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getMemberComplaints;
