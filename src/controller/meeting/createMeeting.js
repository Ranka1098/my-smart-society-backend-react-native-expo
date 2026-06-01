// FILE NAME: createMeeting.js
// CODE NAME: CREATE_MEETING_PRODUCTION_SAFE

import meetingModel from "../../model/meeting.js";
import memberModel from "../../model/member.js";
import Building from "../../model/building.js";

const createMeeting = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId;

    const { title, discussion, attendance } = req.body;

    // ===============================
    // VALIDATION
    // ===============================
    if (!buildingCode || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Building/Admin missing",
      });
    }

    if (!title || !discussion) {
      return res.status(400).json({
        success: false,
        message: "Title aur discussion required hai",
      });
    }

    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance invalid ya empty hai",
      });
    }

    // ===============================
    // BUILDING CHECK
    // ===============================
    const building = await Building.findOne({ buildingCode });
    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    // ===============================
    // FETCH ALL APPROVED MEMBERS
    // ===============================
    const members = await memberModel.find({
      buildingCode,
      approvalStatus: "Approved",
    });

    if (!members.length) {
      return res.status(400).json({
        success: false,
        message: "No approved members found in this building",
      });
    }

    // ===============================
    // CREATE MEETING (DB FIRST)
    // ===============================
    const meeting = await meetingModel.create({
      title,
      discussion,
      meetingDate: new Date(),
      attendance,
      buildingCode,
    });

    // ===============================
    // RESPONSE
    // ===============================
    return res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting,
    });
  } catch (error) {
    console.error("❌ Create Meeting Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default createMeeting;
