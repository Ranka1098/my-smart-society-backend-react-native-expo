import maintenanceModel from "../../model/maintenance.js";
import maintenanceMonthModel from "../../model/maintenanceMonthSchema.js";
import memberModel from "../../model/member.js";

/* ===============================
   Normalize Month
   Input:  "2026-05" | "MAY-2026" | Date
   Output: "MAY-2026"
================================ */
const MONTH_NAMES = [
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

const normalizeMonth = (value) => {
  if (!value) return null;
  const input = String(value).trim();

  if (/^[A-Za-z]{3}-\d{4}$/.test(input)) return input.toUpperCase();

  if (/^\d{4}-\d{1,2}$/.test(input)) {
    const [year, month] = input.split("-");
    const idx = parseInt(month, 10) - 1;
    if (idx < 0 || idx > 11) return null;
    return `${MONTH_NAMES[idx]}-${year}`;
  }

  const date = new Date(input);
  if (!isNaN(date))
    return `${MONTH_NAMES[date.getMonth()]}-${date.getFullYear()}`;

  return null;
};

/* ===============================
   Get Member Display Name
   Schema fields: ownerName, renterName, memberStatus
================================ */
const getMemberName = (member) => {
  if (!member) return "";
  if (member.memberStatus === "Tenant")
    return member.renterName || member.ownerName || "";
  return member.ownerName || "";
};

/* ===============================
   GET /maintenance/getPendingMaintenance
   Query: { no, month, memberType }
================================ */
const getPendingMaintenance = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const { no, month, memberType } = req.query;
    const buildingCode = String(req.buildingCode || "").trim();

    console.log("buildingCode =>", buildingCode);
    console.log("memberType =>", memberType);
    console.log("no =>", no);
    console.log("month =>", month);

    // Validation
    if (!buildingCode || !no || !month || !memberType) {
      return res.status(400).json({
        success: false,
        message: "buildingCode, no, month and memberType are required",
      });
    }

    if (!["Flat", "Shop"].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: "memberType must be Flat or Shop",
      });
    }

    const normalizedMonth = normalizeMonth(month);
    if (!normalizedMonth) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM or MMM-YYYY",
      });
    }

    // Find primary member by unitNo
    const member = await memberModel.findOne({
      buildingCode,
      memberType,
      unitNo: String(no).trim(),
      role: "primary",
    });

    console.log("member =>", member);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: `${memberType} ${no} not found`,
      });
    }

    const memberName = getMemberName(member);

    // Parallel fetch — month config + maintenance record
    const [monthConfig, maintenance] = await Promise.all([
      maintenanceMonthModel.findOne({ buildingCode, month: normalizedMonth }),
      maintenanceModel.findOne({
        buildingCode,
        memberId: member._id,
        month: normalizedMonth,
      }),
    ]);

    // Neither config nor record exists
    if (!monthConfig && !maintenance) {
      return res.status(200).json({
        success: true,
        status: "Missing",
        amount: 0,
        memberName,
        message: "Maintenance not generated for this month",
      });
    }

    // Config exists but no record for this member yet — treat as Pending
    if (monthConfig && !maintenance) {
      const amount =
        memberType === "Flat" ? monthConfig.perFlat : monthConfig.perShop;
      return res.status(200).json({
        success: true,
        status: "Pending",
        amount,
        memberName,
        message: "Maintenance pending",
      });
    }

    // Record exists — check status
    if (maintenance.status === "Paid") {
      return res.status(200).json({
        success: true,
        status: "Paid",
        amount: maintenance.amount,
        memberName,
        message: `Maintenance of ₹${maintenance.amount} already paid`,
      });
    }

    return res.status(200).json({
      success: true,
      status: "Pending",
      amount: maintenance.amount,
      memberName,
      message: "Maintenance pending",
    });
  } catch (err) {
    console.error("getPendingMaintenance Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export default getPendingMaintenance;
