import VendorExpense from "../../model/VendorExpense.js";

const getAllVendorExpenses = async (req, res) => {
  try {
    const { buildingCode } = req;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building Code missing",
      });
    }

    const expenses = await VendorExpense.find({ buildingCode }).sort({
      createdAt: -1,
    });
    const expensesWithBadge = expenses.map((e) => ({
      ...e.toObject(),
      addedBy: e.createdByModel === "Staff" ? "Guard" : "Admin",
    }));

    return res.status(200).json({
      success: true,
      count: expenses.length,
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
