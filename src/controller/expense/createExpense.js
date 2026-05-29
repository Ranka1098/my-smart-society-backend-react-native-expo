import expenseModel from "../../model/expense.js";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import sharp from "sharp";

const createExpense = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    const {
      billType,
      amount,
      description,
      paidTo,
      paymentMethod,
    } = req.body;

    // =========================
    // Validation
    // =========================
    if (
      !billType ||
      amount === undefined ||
      !paidTo ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    // =========================
    // Check Image
    // =========================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Bill proof image is required",
      });
    }

    // =========================
    // Image Validation
    // =========================
    if (!req.file.mimetype.startsWith("image")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    // =========================
    // Compress Image
    // =========================
    const compressedImageBuffer = await sharp(req.file.buffer)
      .resize({
        width: 1200,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 70,
      })
      .toBuffer();

    // =========================
    // Upload To Cloudinary
    // =========================
    const uploadedImage = await uploadToCloudinary(
      compressedImageBuffer,
      "expenseBills"
    );

    // =========================
    // Save Expense
    // =========================
    const expense = await expenseModel.create({
      billType,
      amount,
      description,
      paidTo,
      paymentMethod,
      buildingCode,
      billProof: uploadedImage.secure_url,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      expense,
    });
} catch (error) {
  console.log("❌ createExpense Error:", error.message); // <-- error.message add karo
  console.log("❌ Full Error:", error);                   // <-- full stack bhi
  return res.status(500).json({
    success: false,
    message: error.message || "Server Error", // <-- actual message bhejo
  });
}
};

export default createExpense;  