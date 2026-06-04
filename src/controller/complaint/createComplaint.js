import complaintModel from "../../model/complaint.js";
import memberModel from "../../model/member.js";
import adminModel from "../../model/admin.js";
import Building from "../../model/building.js";

const createComplaint = async (req, res) => {
  try {
    const { type, description } = req.body;
    const memberId = req.member._id;

    if (!memberId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: "Type & description required",
      });
    }

    // ===============================
    // ✅ MEMBER FETCH
    // ===============================
    const member = await memberModel
      .findById(memberId)
      .select(
        "_id buildingCode memberType memberStatus unitNo ownerName renterName"
      )
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const { buildingCode } = member;

    // ===============================
    // ✅ BUILDING CHECK
    // ===============================
    const building = await Building.findOne({ buildingCode })
      .select("_id")
      .lean();

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    // ===============================
    // ✅ MEMBER DETAILS
    // ===============================
    const unitType = member.memberType;
    const unitNo = member.unitNo;
    const memberName = member.ownerName ?? member.renterName;

    // ===============================
    // ✅ CREATE COMPLAINT
    // ===============================
    const complaint = await complaintModel.create({
      buildingCode,
      memberId,
      unitType,
      unitNo,
      memberName,
      category: type,
      description,
      status: "PENDING",
    });

    // ===============================
    // ✅ FETCH ADMINS (same building)
    // ===============================
    const admins = await adminModel
      .find({ buildingCode })
      .select("_id currentFcmToken")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Complaint raised successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create Complaint Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default createComplaint;
