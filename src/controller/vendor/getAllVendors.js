import Vendor from "../../model/Vendor.js";

const getAllVendors = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    // Optional safety check
    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building code missing",
      });
    }

    const vendors = await Vendor.find({ buildingCode })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: vendors.length,
      vendors,
    });
  } catch (error) {
    console.log("Get Vendors Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching vendors",
    });
  }
};

export default getAllVendors;