// 📌 Controller Name: getMaintenanceByMonth.js

import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";

const getMaintenanceByMonth = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building code is required",
      });
    }

    const months = await MaintenanceMonth.find({ buildingCode })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: months.length,
      data: months,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default getMaintenanceByMonth;
