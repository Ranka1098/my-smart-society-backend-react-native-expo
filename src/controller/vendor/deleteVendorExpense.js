// FILE: deleteVendorExpense.js

import VendorExpense from "../../model/VendorExpense.js";

const deleteVendorExpense = async (req, res) => {
  try {
const { id } = req.body;
    const { buildingCode } = req;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
      });
    }

    const expense = await VendorExpense.findOne({
      _id: id,
      buildingCode,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await VendorExpense.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default deleteVendorExpense;
