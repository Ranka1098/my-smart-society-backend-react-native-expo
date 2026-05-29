import expenseModel from "../../model/expense.js";

const getExpense = async (req, res) => {
  try {
    const buildingCode = req.buildingCode; // 🟢 Token se

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building code missing from token",
      });
    }

    // 🟢 Fetch only same building's expenses
    const expenses = await expenseModel
      .find({ buildingCode })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

export default getExpense;
