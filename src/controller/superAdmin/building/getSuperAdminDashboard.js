import Building from "../../../model/building.js";

const getSuperAdminDashboard = async (req, res) => {
  try {
    const projection =
      "buildingCode buildingName chairmanName chairmanPhone totalFlats totalShops subscriptionType subscriptionStatus subscriptionExpiry paymentStatus registeredAt";

    const [buildings, total, active, blocked, expired] = await Promise.all([
      Building.find({}, projection).sort({ registeredAt: -1 }),
      Building.countDocuments({}),
      Building.countDocuments({ subscriptionStatus: "active" }),
      Building.countDocuments({ subscriptionStatus: "blocked" }),
      Building.countDocuments({ subscriptionStatus: "expired" }),
    ]);

    return res.status(200).json({
      success: true,
      summary: { total, active, blocked, expired },
      buildings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getSuperAdminDashboard;
