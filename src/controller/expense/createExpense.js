import expenseModel from "../../model/expense.js";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import sharp from "sharp";
import { notifyAllMembers } from "../../controller/notifcation/notifyMembers.js";

const MAX_DESC_WORDS = 50;

const createExpense = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const io = req.app.get("io");
    const buildingId = req.admin.buildingId;
    let { billType, amount, description, paidTo, paymentMethod } = req.body;

    if (!billType || amount === undefined || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    // ✅ server-side word cap — frontend cap bypass ho sakta hai direct API hit se
    if (description) {
      const words = description.trim().split(/\s+/);
      if (words.length > MAX_DESC_WORDS) {
        description = words.slice(0, MAX_DESC_WORDS).join(" ");
      }
    }

    // ✅ paidTo ab optional — form simplified, admin nahi bharta
    paidTo = paidTo?.trim() || "N/A";

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Bill proof image is required",
      });
    }

    if (!req.file.mimetype.startsWith("image")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    const compressedImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const uploadedImage = await uploadToCloudinary(
      compressedImageBuffer,
      "expenseBills"
    );

    const expense = await expenseModel.create({
      billType,
      amount,
      description,
      paidTo,
      paymentMethod,
      buildingCode,
      billProof: uploadedImage.secure_url,
    });

    console.log(
      "[SOCIETY_EXPENSE] Notifying members — expenseId:",
      expense._id.toString()
    );

    await notifyAllMembers({
      io,
      buildingCode,
      buildingId,
      type: "SOCIETY_EXPENSE",
      title: "New Expense Added 💸",
      message: `${billType} - ₹${amount} expense recorded`,
      referenceId: expense._id,
      referenceModel: "Expense",
      data: {
        expenseId: expense._id.toString(),
        billType,
        amount: String(amount),
        paidTo,
        paymentMethod: paymentMethod,
        description: description || "",
        billProof: uploadedImage.secure_url,
        createdAt: expense.createdAt.toISOString(),
      },
    });

    console.log(
      "[SOCIETY_EXPENSE] Notify done for expenseId:",
      expense._id.toString()
    );

    io.to(`admin_${buildingCode}`).emit("dashboard_update", {
      type: "EXPENSE_ADDED",
    });
    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      expense,
    });
  } catch (error) {
    console.log("❌ createExpense Error:", error.message);
    console.log("❌ Full Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export default createExpense;
