// controllers/admin/getDashboardStats.js
import memberModel from "../../../model/member.js";
import maintenanceModel from "../../../model/maintenance.js";
import MaintenanceMonth from "../../../model/maintenanceMonthSchema.js";
import expenseModel from "../../../model/expense.js";

const formatMonth = (month) => {
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
  return m >= 1 && m <= 12 ? `${months[m - 1]}-${year}` : month;
};

const getDashboardStats = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    let { month } = req.query;

    if (!buildingCode || !month) {
      return res
        .status(400)
        .json({ success: false, message: "Building code or month missing" });
    }

    const formattedMonth = formatMonth(month);

    // ✅ Parallel fetch
    const [members, payments, expenses, monthRecord] = await Promise.all([
      memberModel
        .find({
          buildingCode,
          approvalStatus: "Approved",
          isVerified: true,
          role: "primary",
        })
        .lean(),
      maintenanceModel.find({ buildingCode, month: formattedMonth }).lean(),
      expenseModel.find({ buildingCode }).lean(),
      MaintenanceMonth.findOne({ buildingCode, month: formattedMonth }).lean(),
    ]);

    // ── Members Summary ──
    const membersSummary = {
      flatOwners: members.filter(
        (m) => m.memberType === "Flat" && m.memberStatus === "Owner"
      ).length,
      flatRenters: members.filter(
        (m) => m.memberType === "Flat" && m.memberStatus === "Rent"
      ).length,
      shopOwners: members.filter(
        (m) => m.memberType === "Shop" && m.memberStatus === "Owner"
      ).length,
      shopRenters: members.filter(
        (m) => m.memberType === "Shop" && m.memberStatus === "Rent"
      ).length,
      total: members.length,
    };

    // ── Maintenance ──
    const isGenerated = !!monthRecord;
    const paidPayments = payments.filter((p) => p.status === "Paid");
    const pendingPayments = payments.filter((p) => p.status === "Pending");
    const totalCollection = paidPayments.reduce(
      (s, p) => s + (p.amount || 0),
      0
    );
    const totalPending = pendingPayments.reduce(
      (s, p) => s + (p.amount || 0),
      0
    );

    // ── Expense (current month only) ──
    const [yr, mo] = month.split("-");
    const monthStart = new Date(yr, mo - 1, 1);
    const monthEnd = new Date(yr, mo, 1);
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.createdAt);
      return d >= monthStart && d < monthEnd;
    });
    const totalExpense = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    // ── Profit/Loss ──
    const balance = totalCollection - totalExpense;

    return res.status(200).json({
      success: true,
      month: formattedMonth,
      membersSummary,
      maintenance: {
        isGenerated,
        totalCollection,
        totalPending,
        paidCount: paidPayments.length,
        pendingCount: pendingPayments.length,
      },
      expense: {
        totalExpense,
        count: monthExpenses.length,
      },
      balance, // positive = profit, negative = loss
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getDashboardStats;
