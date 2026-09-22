import VendorExpense from "../../model/VendorExpense.js";

const getAllVendorExpenses = async (req, res) => {
  try {
    const { buildingCode } = req;
    const { page = 1, limit = 20 } = req.query;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building Code missing",
      });
    }

    const skip = (page - 1) * limit;

    const expenses = await VendorExpense.find({ buildingCode })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VendorExpense.countDocuments({ buildingCode });

    const expensesWithBadge = expenses.map((e) => ({
      ...e.toObject(),
      addedBy: e.createdByModel === "Staff" ? "Guard" : "Admin",
    }));

    return res.status(200).json({
      success: true,
      count: expensesWithBadge.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      expenses: expensesWithBadge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default getAllVendorExpenses;
