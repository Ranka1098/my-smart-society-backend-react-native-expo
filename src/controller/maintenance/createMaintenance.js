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
      return res.status(400).json({
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

    // duplicate memberId guard (flats + shops dono me same id na aaye)
    const seenMemberIds = new Set();
    const dedupedPayload = allMembersPayload.filter((item) => {
      const id = item.memberId.toString();
      if (seenMemberIds.has(id)) {
        console.log("[MAINTENANCE] ⚠️ duplicate memberId skipped:", id);
        return false;
      }
      seenMemberIds.add(id);
      return true;
    });

    const memberIds = dedupedPayload.map((item) => item.memberId);

    // ✅ sirf primary member fetch karo — family members ko bill/notif nahi jana chahiye
    const members = await Member.find({
      _id: { $in: memberIds },
      buildingCode,
      approvalStatus: "Approved",
      role: "primary",
    }).lean();

    if (!members.length) {
      return res
        .status(400)
        .json({ success: false, message: "No approved primary members found" });
    }

    const memberMap = {};
    members.forEach((m) => {
      memberMap[m._id.toString()] = m;
    });

    const maintenanceDocs = [];
    for (const item of dedupedPayload) {
      const member = memberMap[item.memberId.toString()];
      if (!member) continue; // family member ya unapproved skip
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

    if (!maintenanceDocs.length) {
      return res.status(400).json({
        success: false,
        message: "No valid primary members to generate maintenance for",
      });
    }

    const insertedDocs = await Maintenance.insertMany(maintenanceDocs);

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

    // ── NOTIFY EACH INSERTED DOC EXACTLY ONCE — flat/shop ke hisab se alag title ──
    const io = req.app.get("io");

    for (const doc of insertedDocs) {
      const member = memberMap[doc.memberId.toString()];
      if (!member) continue;

      // ✅ flat/shop ke hisab se alag title/message
      const isShop = doc.memberType === "Shop";
      const title = isShop
        ? "Shop Maintenance Generated 🏪"
        : "Flat Maintenance Generated 🏠";
      const unitLabel = isShop ? "shop" : "flat";
      const message = `Your ${unitLabel} maintenance for ${month} is ₹${doc.amount}. Please pay on time.`;

      const data = {
        maintenanceId: doc._id.toString(),
        month,
        amount: String(doc.amount),
        unitNo: String(doc.No || ""),
        memberType: doc.memberType, // ✅ add — frontend ko flat/shop distinguish karne ke liye
        status: doc.status,
      };

      const notification = await Notification.create({
        buildingCode,
        buildingId: building._id,
        type: "MAINTENANCE_GENERATED",
        audience: "MEMBERS",
        receiverId: member._id,
        receiverModel: "MEMBER",
        title,
        message,
        referenceId: doc._id,
        referenceModel: "Maintenance",
        data,
      });

      const room = `member_${member._id.toString()}`;
      console.log(
        "[SOCKET EMIT] notification →",
        room,
        "| type: MAINTENANCE_GENERATED |",
        doc.memberType
      );
      io.to(room).emit("notification", {
        _id: notification._id.toString(),
        type: "MAINTENANCE_GENERATED",
        title,
        message,
        data,
        isRead: false,
        createdAt: notification.createdAt,
      });

      if (member.fcmToken) {
        try {
          await sendFCM([member.fcmToken], title, message, {
            ...data,
            type: "MAINTENANCE_GENERATED",
            _id: notification._id.toString(),
          });
        } catch (fcmErr) {
          console.error(
            "FCM send failed for member",
            member._id.toString(),
            ":",
            fcmErr.message
          );
        }
      }
    }

    console.log(
      `[MAINTENANCE] ✅ Generated ${insertedDocs.length} records, sent ${insertedDocs.length} notifications`
    );

    return res.status(201).json({
      success: true,
      message: "Maintenance created successfully",
      data: monthRecord,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Maintenance already generated for this month (duplicate request)",
      });
    }
    console.log("❌ Maintenance Create Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default createMaintenance;
