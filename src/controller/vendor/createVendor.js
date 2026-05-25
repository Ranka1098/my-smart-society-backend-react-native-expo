import vendorModel from "../../model/Vendor.js";

// ======================================================
// CREATE VENDOR
// ======================================================
const createVendor = async (req, res) => {
  try {
    let { companyName, service, rate } = req.body;

    const buildingCode = req.buildingCode;

    // ======================================================
    // NORMALIZE INPUTS
    // ======================================================
    companyName = companyName?.trim();
    service = service?.trim();

    // ======================================================
    // REQUIRED VALIDATION
    // ======================================================
    if (!companyName || !service || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Company name, service and rate are required",
      });
    }

    // ======================================================
    // RATE VALIDATION
    // ======================================================
    if (isNaN(rate) || Number(rate) < 0) {
      return res.status(400).json({
        success: false,
        field: "rate",
        message: "Invalid vendor rate",
      });
    }

    // ======================================================
    // CHECK DUPLICATE VENDOR
    // SAME BUILDING + SAME COMPANY + SAME SERVICE
    // ======================================================
    const existingVendor = await vendorModel.findOne({
      buildingCode,

      companyName: {
        $regex: new RegExp(`^${companyName}$`, "i"),
      },

      service: {
        $regex: new RegExp(`^${service}$`, "i"),
      },

      isActive: true,
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor already registered for this service",
      });
    }

    // ======================================================
    // CREATE VENDOR
    // ======================================================
    const vendor = await vendorModel.create({
      buildingCode,
      companyName,
      service,
      rate: Number(rate),
    });

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);

    // ======================================================
    // DUPLICATE KEY ERROR
    // ======================================================
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists in this building",
      });
    }

    // ======================================================
    // SERVER ERROR
    // ======================================================
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default createVendor;
