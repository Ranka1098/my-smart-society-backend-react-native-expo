import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import VendorExpense from "../../model/VendorExpense.js";
import vendorModel from "../../model/Vendor.js";
import { notifyAllMembers } from "../../controller/notifcation/notifyMembers.js";

const createVendorExpense = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const buildingId = req.admin.buildingId; // ✅ middleware mein hai
    const adminId = req.adminId;

    let { vendorId, amount, description } = req.body;
    description = description?.trim();

    if (!vendorId || amount === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Vendor and amount are required" });
    }

    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          field: "amount",
          message: "Invalid expense amount",
        });
    }

    const vendor = await vendorModel.findOne({
      _id: vendorId,
      buildingCode,
      isActive: true,
    });
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // ── PHOTO UPLOAD ──
    let photoUrl = null;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image")) {
        return res
          .status(400)
          .json({ success: false, message: "Only image files are allowed" });
      }
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      const uploaded = await uploadToCloudinary(
        compressedBuffer,
        "vendorExpenses"
      );
      photoUrl = uploaded.secure_url;
    }

    const expense = await VendorExpense.create({
      buildingCode,
      createdBy: adminId,
      vendor: vendor._id,
      vendorName: vendor.companyName,
      service: vendor.service,
      amount,
      description: description || null,
      photoUrl,
    });

    // ── NOTIFY ALL MEMBERS ──
    const io = req.app.get("io");
    await notifyAllMembers({
      io,
      buildingCode,
      buildingId,
      type: "EXPENSE",
      title: "New Expense Added 💸",
      message: `${vendor.companyName} - ₹${amount} expense recorded`,
      referenceId: expense._id,
      referenceModel: "VendorExpense",
      data: {
        expenseId: expense._id.toString(),
        vendorName: vendor.companyName,
        amount: String(amount),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vendor expense created successfully",
      expense,
    });
  } catch (error) {
    console.error("Create Vendor Expense Error:", error);
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return res
        .status(400)
        .json({
          success: false,
          field: firstError.path,
          message: firstError.message,
        });
    }
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid vendor ID" });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};

export default createVendorExpense;
