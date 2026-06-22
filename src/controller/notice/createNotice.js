import noticeModel from "../../model/notice.js";
import memberModel from "../../model/member.js";
import Building from "../../model/building.js";
import { notifyAllMembersAndStaff } from "../notifcation/notifyMembers.js";
const createNotice = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId;
    const { title, description } = req.body;

    // ===============================
    // VALIDATION
    // ===============================
    if (!buildingCode || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Building/Admin missing",
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title aur description required hai",
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
    // CREATE NOTICE
    // ===============================
    const notice = await noticeModel.create({
      title,
      description,
      buildingCode,
    });

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
    const io = req.app.get("io");
    await notifyAllMembersAndStaff({
      io,
      buildingCode,
      buildingId: building._id,
      type: "NOTICE_POSTED",
      title: "New Notice 📢",
      message: title,
      referenceId: notice._id,
      referenceModel: "Notice",
      data: { noticeId: String(notice._id) },
    });
    // ===============================
    // RESPONSE
    // ===============================
    return res.status(201).json({
      success: true,
      message: "Notice created successfully",
      notice,
    });
  } catch (error) {
    console.error("❌ Create Notice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default createNotice;
