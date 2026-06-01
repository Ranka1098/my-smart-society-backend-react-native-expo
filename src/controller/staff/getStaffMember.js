import StaffModel from "../../model/staff.js";

const getStaffMember = async (req, res) => {
  console.log("🚀 API HIT: getStaffMember");

  try {
    const { buildingCode } = req;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building code is missing",
      });
    }

    // ✅ ONLY FILTER BY BUILDING
    const filter = { buildingCode };

    console.log("🔍 Filter:", filter);

    const staff = await StaffModel.find(filter).sort({ createdAt: -1 }).lean();

    console.log("📦 Staff Count:", staff.length);

    return res.status(200).json({
      success: true,
      message:
        staff.length > 0
          ? "Staff members fetched successfully"
          : "No staff members found",
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error("🔥 FULL ERROR (getStaffMember):", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default getStaffMember;
