import mongoose from "mongoose";
import maintenanceModel from "../../model/maintenance.js";
import maintenanceMonthModel from "../../model/maintenanceMonthSchema.js";
import memberModel from "../../model/member.js";

// ❌ Removed: Notification import
// ❌ Removed: notify import
// (Baad mein implement karenge)

/* ===============================
   Normalize Month
================================ */
const normalizeMonth = (value) => {
  if (!value) return null;

  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  const input = String(value).trim();

  if (/^[A-Za-z]{3}-\d{4}$/.test(input)) {
    return input.toUpperCase();
  }

  if (/^\d{4}-\d{1,2}$/.test(input)) {
    const [year, month] = input.split("-");
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;
    return `${monthNames[monthIndex]}-${year}`;
  }

  const date = new Date(input);
  if (!isNaN(date)) {
    return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  }

  return null;
};

/* ===============================
   Add Maintenance Payment
================================ */
const addMemberMaintenancePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const buildingCode = String(req.buildingCode || "").trim();
    const { memberType, no, month, paymentMode } = req.body;

    if (!buildingCode || !memberType || !no || !month) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "BuildingCode, memberType, no and month are required",
      });
    }

    if (!["Flat", "Shop"].includes(memberType)) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Invalid member type",
      });
    }

    const normalizedMonth = normalizeMonth(month);

    if (!normalizedMonth) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Invalid month format",
      });
    }

    const cleanNo = String(no).trim();

    /* ===============================
       1️⃣ Find Member
    ============================== */
    let member;

    if (memberType === "Flat") {
      member = await memberModel;
      findOne({
        buildingCode,
        memberType,
        unitNo: cleanNo,
        role: "primary",
      }).session(session);
    } else {
      member = await memberModel
        .findOne({
          buildingCode,
          memberType: "Shop",
          No: cleanNo,
        })
        .session(session);
    }

    if (!member) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: `${memberType} with number ${cleanNo} not found`,
      });
    }

    /* ===============================
       2️⃣ Get Month Config
    ============================== */
    const monthConfig = await maintenanceMonthModel
      .findOne({
        buildingCode,
        month: normalizedMonth,
      })
      .session(session);

    if (!monthConfig) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: "Maintenance not generated for this month",
      });
    }

    /* ===============================
       3️⃣ Find or Create Maintenance
    ============================== */
    let maintenance = await maintenanceModel
      .findOne({
        buildingCode,
        memberId: member._id,
        month: normalizedMonth,
      })
      .session(session);

    if (!maintenance) {
      const amount =
        memberType === "Flat" ? monthConfig.perFlat : monthConfig.perShop;

      maintenance = await maintenanceModel.create(
        [
          {
            buildingCode,
            memberId: member._id,
            month: normalizedMonth,
            amount,
            status: "Pending",
          },
        ],
        { session }
      );

      maintenance = maintenance[0];
    }

    if (!maintenance) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    if (maintenance.status === "Paid") {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Maintenance already paid",
      });
    }

    /* ===============================
       4️⃣ Update Maintenance Payment
    ============================== */
    maintenance.status = "Paid";
    maintenance.paymentMode = paymentMode || "Cash";
    maintenance.paidDate = new Date();

    await maintenance.save({ session });

    /* ===============================
       ✅ Commit Transaction
    ============================== */
    await session.commitTransaction();
    session.endSession();

    // ❌ Removed: Notification DB create
    // ❌ Removed: notify() call (Socket + Push)
    // (TODO: Baad mein implement karenge)

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      paymentId: maintenance._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Add Maintenance Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default addMemberMaintenancePayment;
