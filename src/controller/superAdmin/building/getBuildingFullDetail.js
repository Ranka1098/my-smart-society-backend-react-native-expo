import Building from "../../../model/building.js";

const getBuildingFullDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await Building.findById(id).populate(
      "admin",
      "name email phone"
    );

    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    return res.status(200).json({
      success: true,
      building: {
        _id: building._id,
        buildingCode: building.buildingCode,
        buildingName: building.buildingName,
        chairmanName: building.chairmanName,
        chairmanPhone: building.chairmanPhone,
        admin: building.admin,
        totalFlats: building.totalFlats,
        totalShops: building.totalShops,
        isActive: building.isActive,
        registeredAt: building.createdAt,
        currentSubscription: {
          subscriptionType: building.subscriptionType,
          subscriptionStatus: building.subscriptionStatus,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          paymentStatus: building.paymentStatus,
        },
        // ⚠️ schema me history array nahi tha — agar add kiya hai to yaha map karo
        subscriptionHistory: building.subscriptionHistory || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getBuildingFullDetail;
