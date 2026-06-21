import Maintenance from "../../model/maintenance.js";
import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";
import Member from "../../model/member.js";
import Building from "../../model/building.js";
import Notification from "../../model/notification.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const getMemberName = (member) => {
  if (!member) return "—";
  if (member.memberStatus === "Rent" && member.renterName)
    return member.renterName;
  return member.ownerName || member.fullName || "—";
};

const createMaintenance = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId;
    const { month, flats = [], shops = [] } = req.body;

    if (!buildingCode || !adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Building/Admin missing" });
    }
    if (!month) {
      return res
        .status(400)
        .json({ success: false, message: "Month is required" });
    }

    const building = await Building.findOne({ buildingCode });
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const existingMonth = await MaintenanceMonth.findOne({
      buildingCode,
      month,
    });
    if (existingMonth) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Maintenance already generated for ${existingMonth.month}`,
        });
    }

    const validFlats = flats.filter((item) => Number(item.amount) > 0);
    const validShops = shops.filter((item) => Number(item.amount) > 0);
    const allMembersPayload = [...validFlats, ...validShops];

    if (!allMembersPayload.length) {
      return res
        .status(400)
        .json({ success: false, message: "No valid maintenance amount found" });
    }

    const memberIds = allMembersPayload.map((item) => item.memberId);
    const members = await Member.find({
      _id: { $in: memberIds },
      buildingCode,
      approvalStatus: "Approved",
    }).lean();

    if (!members.length) {
      return res
        .status(400)
        .json({ success: false, message: "No approved members found" });
    }

    const memberMap = {};
    members.forEach((m) => {
      memberMap[m._id.toString()] = m;
    });

    const maintenanceDocs = [];
    for (const item of allMembersPayload) {
      const member = memberMap[item.memberId.toString()];
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
          member.memberStatus === "Rent"
            ? member.renterPhone
            : member.ownerPhone,
      });
    }

    await Maintenance.insertMany(maintenanceDocs);

    const totalFlatExpense = validFlats.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalShopExpense = validShops.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

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

    // ── NOTIFY EACH MEMBER WITH THEIR AMOUNT ──
    const io = req.app.get("io");

    for (const doc of maintenanceDocs) {
      const member = memberMap[doc.memberId.toString()];
      if (!member) continue;

      const title = "Maintenance Due 🏠";
      const message = `Your maintenance for ${month} is ₹${doc.amount}. Please pay on time.`;
      const data = {
        month,
        amount: String(doc.amount),
        unitNo: String(doc.No),
      };

      // 1. MongoDB save
      await Notification.create({
        buildingCode,
        buildingId: building._id,
        type: "MAINTENANCE_PAID",
        audience: "MEMBERS",
        title,
        message,
        referenceModel: "Maintenance",
        data,
      });

      // 2. Socket
      io.to(buildingCode).emit("notification", {
        type: "MAINTENANCE_PAID",
        title,
        message,
        data,
      });

      // 3. FCM
      if (member.fcmToken) {
        await sendFCM([member.fcmToken], title, message, data);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Maintenance created successfully",
      data: monthRecord,
    });
  } catch (error) {
    console.log("❌ Maintenance Create Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default createMaintenance;
