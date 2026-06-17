import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";
import Maintenance from "../../model/maintenance.js";

const deleteMaintenanceByMonth = async (req, res) => {
  try {
    const { month } = req.params;

    // ✅ middleware se aa raha hai
    const buildingCode = req.buildingCode;

    if (!buildingCode) {
      return res.status(401).json({
        success: false,
        message: "Admin not authenticated",
      });
    }

    // 1️⃣ Delete month entry
    await MaintenanceMonth.deleteOne({
      buildingCode,
      month,
    });

    // 2️⃣ Delete all member maintenance records
    await Maintenance.deleteMany({
      buildingCode,
      month,
    });

    res.status(200).json({
      success: true,
      message: "Maintenance deleted successfully",
    });
  } catch (error) {
    console.error("Delete maintenance error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default deleteMaintenanceByMonth;
