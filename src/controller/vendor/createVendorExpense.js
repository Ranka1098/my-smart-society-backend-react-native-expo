import VendorExpense from "../../model/VendorExpense.js";
import vendorModel from "../../model/Vendor.js";

// ======================================================
// CREATE VENDOR EXPENSE
// ======================================================
const createVendorExpense = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const adminId = req.adminId; // ← add this line

    let { vendorId, amount, description } = req.body;

    // ======================================================
    // NORMALIZE INPUTS
    // ======================================================
    description = description?.trim();

    // ======================================================
    // REQUIRED VALIDATION
    // ======================================================
    if (!vendorId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vendor and amount are required",
      });
    }

    // ======================================================
    // AMOUNT VALIDATION
    // ======================================================
    amount = Number(amount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        field: "amount",
        message: "Invalid expense amount",
      });
    }

    // ======================================================
    // FIND VENDOR
    // ======================================================
    const vendor = await vendorModel.findOne({
      _id: vendorId,
      buildingCode,
      isActive: true,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ======================================================
    // CREATE EXPENSE
    // ======================================================
    const expense = await VendorExpense.create({
      buildingCode,

      createdBy: adminId,

      vendor: vendor._id,

      vendorName: vendor.companyName,

      service: vendor.service,

      amount,

      description: description || null,
    });

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
    return res.status(201).json({
      success: true,
      message: "Vendor expense created successfully",

      expense,
    });
  } catch (error) {
    console.error("Create Vendor Expense Error:", error);

    // ======================================================
    // MONGOOSE VALIDATION ERROR
    // ======================================================
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        field: firstError.path,
        message: firstError.message,
      });
    }

    // ======================================================
    // INVALID OBJECT ID
    // ======================================================
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    // ======================================================
    // INTERNAL SERVER ERROR
    // ======================================================
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default createVendorExpense;
