// =========================
// Code Name: getAllVendorExpenses.js
// =========================

import VendorExpense from "../../model/VendorExpense.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// user ke search text ko regex mein safe banao
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getAllVendorExpenses = async (req, res) => {
  try {
    const { buildingCode } = req;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building Code missing",
      });
    }

    // ── query params (safe defaults) ──
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const vendor = String(req.query.vendor ?? "")
      .trim()
      .slice(0, 100);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    if ((req.query.from && !from) || (req.query.to && !to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date filter",
      });
    }

    // ── filter (list, count aur total teeno isi se) ──
    const filter = { buildingCode };

    if (vendor) {
      filter.vendorName = { $regex: escapeRegex(vendor), $options: "i" };
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lt = to;
    }

    const [expenses, totals] = await Promise.all([
      VendorExpense.find(filter)
        .sort({ createdAt: -1, _id: -1 }) // _id: same timestamp par order stable
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      VendorExpense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const expensesWithBadge = expenses.map((e) => ({
      ...e,
      addedBy: e.createdByModel === "Staff" ? "Guard" : "Admin",
    }));

    return res.status(200).json({
      success: true,
      count: expensesWithBadge.length, // is page ke records
      total: totals[0]?.count || 0, // filter ke saare records
      totalAmount: totals[0]?.amount || 0, // filter ke saare records ka amount
      page,
      limit,
      expenses: expensesWithBadge,
    });
  } catch (error) {
    console.error("getAllVendorExpenses error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getAllVendorExpenses;
