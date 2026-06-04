// getMyComplaints.js
import complaintModel from "../../model/complaint.js";

const getMyComplaints = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    const complaints = await complaintModel
      .find({ buildingCode })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error("Get Complaints Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getMyComplaints;
