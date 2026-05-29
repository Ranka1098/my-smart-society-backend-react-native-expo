import Maintenance from "../../model/maintenance.js";
import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";
import Member from "../../model/member.js";
import Building from "../../model/building.js";

// ===============================
// MEMBER NAME FORMATTER
// ===============================
const getMemberName = (member) => {
  if (!member) return "—";

  // Agar tenant hai
  if (member.memberStatus === "Tenant" && member.renterName) {
    return member.renterName;
  }

  // Default owner
  return member.ownerName || member.fullName || "—";
};

// ===============================
// CREATE MAINTENANCE
// ===============================
const createMaintenance = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId;

    const { month, flats = [], shops = [] } = req.body;

    // ===============================
    // VALIDATION
    // ===============================
    if (!buildingCode || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Building/Admin missing",
      });
    }

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    // ===============================
    // BUILDING CHECK
    // ===============================
    const building = await Building.findOne({
      buildingCode,
    });

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    // ===============================
    // DUPLICATE MONTH CHECK
    // ===============================
    const existingMonth = await MaintenanceMonth.findOne({
      buildingCode,
      month,
    });

    if (existingMonth) {
      return res.status(400).json({
        success: false,
        message: `Maintenance already generated for ${existingMonth.month} this month`,
      });
    }

    // ===============================
    // VALID MEMBERS
    // ===============================
    const validFlats = flats.filter((item) => Number(item.amount) > 0);

    const validShops = shops.filter((item) => Number(item.amount) > 0);

    const allMembersPayload = [...validFlats, ...validShops];

    if (!allMembersPayload.length) {
      return res.status(400).json({
        success: false,
        message: "No valid maintenance amount found",
      });
    }

    // ===============================
    // FETCH APPROVED MEMBERS
    // ===============================
    const memberIds = allMembersPayload.map((item) => item.memberId);

    const members = await Member.find({
      _id: { $in: memberIds },
      buildingCode,
      approvalStatus: "Approved",
    }).lean();

    if (!members.length) {
      return res.status(400).json({
        success: false,
        message: "No approved members found",
      });
    }

    // ===============================
    // MEMBER MAP
    // ===============================
    const memberMap = {};

    members.forEach((member) => {
      memberMap[member._id.toString()] = member;
    });

    // ===============================
    // CREATE MAINTENANCE DOCS
    // ===============================
    const maintenanceDocs = [];

    for (const item of allMembersPayload) {
      const member = memberMap[item.memberId.toString()];

      // invalid member skip
      if (!member) continue;

      maintenanceDocs.push({
        buildingCode,
        buildingId: building._id,

        memberId: member._id,

        month,

        amount: Number(item.amount),

        status: "Pending",

        memberName: getMemberName(member),

        memberType: member.memberType,

        No: member.unitNo,

        phone:
          member.memberStatus === "Tenant"
            ? member.renterPhone
            : member.ownerPhone,
      });
    }

    // ===============================
    // INSERT MAINTENANCE
    // ===============================
    await Maintenance.insertMany(maintenanceDocs);

    // ===============================
    // TOTALS
    // ===============================
    const totalFlatExpense = validFlats.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const totalShopExpense = validShops.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    // ===============================
    // CREATE MONTH RECORD
    // ===============================
    const monthRecord = await MaintenanceMonth.create({
      buildingCode,
      month,

      totalFlatExpense,
      totalShopExpense,

      perFlat: validFlats[0]?.amount || 0,

      perShop: validShops[0]?.amount || 0,

      totalFlats: validFlats.length,

      totalShops: validShops.length,

      totalExpectedAmount: totalFlatExpense + totalShopExpense,
    });

    return res.status(201).json({
      success: true,
      message: "Maintenance created successfully",
      data: monthRecord,
    });
  } catch (error) {
    console.log("❌ Maintenance Create Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default createMaintenance;
