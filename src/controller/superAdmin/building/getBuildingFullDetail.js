// controller/superAdmin/subscription/getBuildingFullDetail.js
import Building from "../../../model/building.js";
import Transaction from "../../../model/transectionRecord.js"; // ✅ sahi filename

const getBuildingFullDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await Building.findById(id)
      .populate("admin", "adminName email phone") // ✅ "name" nahi, "adminName" (adminModel me yahi field hai)
      .populate(
        "subscriptionHistory.transactionId",
        "amount method status gatewayTxnId"
      )
      .lean();

    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    // Optional — Transaction collection se poora payment trail (audit ke liye extra)
    const transactions = await Transaction.find({ building: id })
      .sort({ createdAt: -1 })
      .select(
        "amount currency method gateway gatewayOrderId gatewayTxnId payerAccount status initiatedBy notes createdAt"
      ); // ✅ actual transaction.model.js fields ke mutabik

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
          subscriptionType: building.subscriptionType,
          subscriptionStatus: building.subscriptionStatus,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          paymentStatus: building.paymentStatus,
          lastBilledFlats: building.lastBilledFlats,
          lastBilledShops: building.lastBilledShops,
          lastBilledAmount: building.lastBilledAmount,
          blockedAt: building.blockedAt,
          blockedReason: building.blockedReason,
          // ⚠️ plan / lockLevel / graceEndsAt hata diye — schema me exist nahi karte
        },

        subscriptionHistory: building.subscriptionHistory || [],
        transactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getBuildingFullDetail;
