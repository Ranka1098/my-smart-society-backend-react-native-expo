import vendorModel from "../../model/Vendor.js";
import { notifyAdminToStaff } from "../../controller/notifcation/notifyMembers.js";

const createVendor = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const buildingId = req.admin?.buildingId;
    let { companyName, service, rate } = req.body;

    companyName = companyName?.trim();
    service = service?.trim();
    rate = Number(rate);

    if (!companyName || !service || isNaN(rate)) {
      return res.status(400).json({
        success: false,
        message: "Company name, service and valid rate are required",
      });
    }

    const vendor = await vendorModel.create({
      buildingCode,
      companyName,
      service,
      rate,
    });

    const io = req.app.get("io");
    await notifyAdminToStaff({
      io,
      buildingCode,
      buildingId,
      type: "VENDOR_ADDED",
      title: "New Vendor Added 🧾",
      message: `${companyName} (${service}) — ₹${rate} added by admin`,
      referenceId: vendor._id,
      referenceModel: "Vendor",
      data: {
        vendorId: vendor._id.toString(),
        companyName: vendor.companyName,
        service: vendor.service,
        rate: String(vendor.rate),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        field: firstError.path,
        message: firstError.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export default createVendor;
