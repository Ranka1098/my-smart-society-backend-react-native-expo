// controller/admin/subscription/getMyBuildingDetail.js
import Building from "../../../model/building.js";
import Transaction from "../../../model/transectionRecord.js";

const getMyBuildingDetail = async (req, res) => {
  try {
    const buildingCode = req.admin?.buildingCode; // apna adminAuth middleware ka actual field naam verify karo

    if (!buildingCode) {
      return res.status(400).json({ success: false, message: "Building code missing in token" });
    }

    const building = await Building.findOne({ buildingCode })
      .populate("admin", "name email phone")
      .populate("plan", "planCode planName type perFlatRate perShopRate durationDays graceDays")
      .populate("subscriptionHistory.transactionId", "amount method status gatewayTxnId")
      .lean();

    if (!building) {
      return res.status(404).json({ success: false, message: "Building not found" });
    }

    const transactions = await Transaction.find({ building: building._id })
      .sort({ createdAt: -1 })
      .select("type amount currency method status billedFlats billedShops perFlatRate perShopRate createdAt notes");

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
        registeredAt: building.registeredAt || building.createdAt,

        currentSubscription: {
          plan: building.plan,
          subscriptionType: building.subscriptionType,
          subscriptionStatus: building.subscriptionStatus,
          lockLevel: building.lockLevel,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          graceEndsAt: building.graceEndsAt,
          paymentStatus: building.paymentStatus,
          lastBilledFlats: building.lastBilledFlats,
          lastBilledShops: building.lastBilledShops,
          lastBilledAmount: building.lastBilledAmount,
          blockedAt: building.blockedAt,
          blockedReason: building.blockedReason,
        },

        subscriptionHistory: building.subscriptionHistory || [],
        transactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getMyBuildingDetail;