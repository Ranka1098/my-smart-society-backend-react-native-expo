
import Building from "../../../model/building.js";

const getBuildingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ success: false, message: "Building code required" });
    }

    const building = await Building.findOne({
      buildingCode: code.trim().toUpperCase(),
    })
      .populate("admin", "name email phone")
      .populate("plan", "planCode planName type perFlatRate perShopRate durationDays graceDays")
      .populate({
        path: "subscriptionHistory.transactionId",
        select: "amount method status type billedFlats billedShops createdAt",
      });

    if (!building) {
      return res.status(404).json({ success: false, message: "Building not found" });
    }

    return res.status(200).json({
      success: true,
      building: {
        _id: building._id,
        buildingName: building.buildingName,
        buildingCode: building.buildingCode,
        chairmanName: building.chairmanName,
        chairmanPhone: building.chairmanPhone,
        totalFlats: building.totalFlats,
        totalShops: building.totalShops,
        registeredAt: building.createdAt,
      },
      currentSub: {
        plan: building.plan,
        subscriptionType: building.subscriptionType,
        subscriptionStatus: building.subscriptionStatus,
        lockLevel: building.lockLevel,
        subscriptionStartDate: building.subscriptionStartDate,
        subscriptionExpiry: building.subscriptionExpiry,
        graceEndsAt: building.graceEndsAt,
        blockedAt: building.blockedAt,
        blockedReason: building.blockedReason,
        paymentStatus: building.paymentStatus,
        lastBilledFlats: building.lastBilledFlats,
        lastBilledShops: building.lastBilledShops,
        lastBilledAmount: building.lastBilledAmount,
      },
      // full audit trail — kaun sa admin/superadmin/system ne kab kya kiya
      subscriptionHistory: building.subscriptionHistory
        .slice()
        .reverse()
        .map((h) => ({
          planCode: h.planCode,
          subscriptionStatus: h.subscriptionStatus,
          billedFlats: h.billedFlats,
          billedShops: h.billedShops,
          amount: h.amount,
          subscriptionExpiry: h.subscriptionExpiry,
          paymentStatus: h.paymentStatus,
          action: h.action,
          transaction: h.transactionId,
          changedBy: h.changedBy,
          changedAt: h.changedAt,
        })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getBuildingByCode;