// CODE NAME: getAllMemberMaintenancePaymentList_WithNameFallback

import maintenanceModel from "../../model/maintenance.js";
import memberModel from "../../model/member.js";
import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";

// ✅ Helper: Convert YYYY-MM → MON-YYYY
const formatMonth = (month) => {
  if (!month || !month.includes("-") || month.length !== 7) return month;

  const months = [
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

  const [year, monthIndex] = month.split("-");
  const m = Number(monthIndex);

  if (m >= 1 && m <= 12) {
    return `${months[m - 1]}-${year}`;
  }

  return month;
};

// ✅ Helper: Get Member Name
const getMemberName = (member) => {
  if (!member) return "—";

  const {
    memberType,
    status,
    flatOwnerName,
    flatRenterName,
    shopOwnerName,
    shopRenterName,
  } = member;

  if (memberType === "Flat") {
    if (status === "Owner") return flatOwnerName || "—";
    if (status === "Rent") return flatRenterName || "—";
  }

  if (memberType === "Shop") {
    if (status === "Owner") return shopOwnerName || "—";
    if (status === "Rent") return shopRenterName || "—";
  }

  return (
    flatOwnerName || flatRenterName || shopOwnerName || shopRenterName || "—"
  );
};

const getAllMemberMaintenancePaymentDetail = async (req, res) => {
  try {
    const { buildingCode } = req;
    let { month } = req.query;

    // ✅ Validation
    if (!buildingCode || !month) {
      return res.status(400).json({
        success: false,
        message: "Building code or month missing",
      });
    }

    // ✅ Format Month
    month = formatMonth(month);

    // ✅ Check Month Generated
    const monthRecord = await MaintenanceMonth.findOne({
      buildingCode,
      month,
    }).lean();

    if (!monthRecord) {
      return res.status(200).json({
        success: true,
        isGenerated: false,
        message: `Maintenance not generated for ${month}`,
        total: 0,
        data: [],
      });
    }

    // ✅ Fetch maintenance + members
    const [payments, members] = await Promise.all([
      maintenanceModel.find({ buildingCode, month }).lean(),
      memberModel.find({ buildingCode }).lean(),
    ]);

    // ✅ Create member map
    const memberMap = {};
    members.forEach((m) => {
      memberMap[m._id.toString()] = m;
    });

    // ✅ Final mapping
    const finalList = payments.map((p) => {
      const member = memberMap[p.memberId?.toString()];

      const isDeleted = !member; // 🔥 ADD THIS LINE

      return {
        memberId: p.memberId,

        // 🔥 ADD THIS
        isDeleted,

        memberName:
          p.memberName || (member ? getMemberName(member) : "Deleted Member"),

        memberType: p.memberType || member?.memberType || "—",

        No: p.No || (member ? member.flatNo || member.shopNo : "N/A"),

        amount: p.amount,

        // 🔥 OPTIONAL (better UX)
        status: isDeleted ? "Deleted" : p.status,

        paidDate: p.paidDate,
        paymentMode: p.paymentMode,

        month: p.month,
        _id: p._id,
      };
    });

    // ✅ Sorting
    finalList.sort((a, b) => {
      if (a.memberType !== b.memberType) {
        return a.memberType.localeCompare(b.memberType);
      }

      return String(a.No).localeCompare(String(b.No), undefined, {
        numeric: true,
      });
    });

    return res.status(200).json({
      success: true,
      isGenerated: true,
      total: finalList.length,
      data: finalList,
      monthData: monthRecord,
    });
  } catch (error) {
    console.error("❌ Get Maintenance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getAllMemberMaintenancePaymentDetail;
