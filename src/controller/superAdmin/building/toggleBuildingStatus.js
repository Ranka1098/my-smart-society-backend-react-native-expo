// controller/superAdmin/building/toggleBuildingStatus.js
import Building from "../../../model/building.js";

// body: { subscriptionStatus: "blocked" | "active", reason? }
const toggleBuildingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionStatus, reason } = req.body;

    if (!["blocked", "active"].includes(subscriptionStatus)) {
      return res.status(400).json({
        success: false,
        message: "subscriptionStatus must be 'blocked' or 'active'",
      });
    }

    const building = await Building.findById(id);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const now = new Date();
    const isBlocking = subscriptionStatus === "blocked";

    if (isBlocking && building.subscriptionStatus === "blocked") {
      return res
        .status(400)
        .json({ success: false, message: "Building is already blocked" });
    }
    if (!isBlocking && building.subscriptionStatus !== "blocked") {
      return res
        .status(400)
        .json({ success: false, message: "Building is not blocked" });
    }

    let newStatus;
    if (isBlocking) {
      newStatus = "blocked";
      building.blockedAt = now;
      building.blockedReason = reason || null;
    } else {
      // Unblock: expiry nikal chuki ho to "expired", warna "active"
      newStatus =
        building.subscriptionExpiry && building.subscriptionExpiry > now
          ? "active"
          : "expired";
      building.blockedAt = null;
      building.blockedReason = null;
    }

    building.subscriptionStatus = newStatus;

    building.subscriptionHistory.push({
      subscriptionType: building.subscriptionType,
      subscriptionStartDate: building.subscriptionStartDate,
      subscriptionExpiry: building.subscriptionExpiry,
      subscriptionStatus: newStatus,
      paymentStatus: building.paymentStatus,
      action: isBlocking
        ? `Blocked by Super Admin${reason ? ` — ${reason}` : ""}`
        : `Unblocked by Super Admin — now "${newStatus}"`,
      changedBy: {
        role: "superadmin",
        id: req.superAdmin?._id || req.user?.id || null,
      },
      changedAt: now,
    });

    await building.save();

    const io = req.app.get("io");
    if (io) {
      io.to(building.buildingCode).emit("dashboard_update");
      io.to(building.buildingCode).emit("subscription_status_changed", {
        buildingCode: building.buildingCode,
        subscriptionStatus: newStatus,
      });
    }

    return res.status(200).json({
      success: true,
      message: isBlocking
        ? "Building blocked"
        : `Building unblocked (status: ${newStatus})`,
      subscriptionStatus: newStatus,
    });
  } catch (error) {
    console.log("Toggle building status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default toggleBuildingStatus;
