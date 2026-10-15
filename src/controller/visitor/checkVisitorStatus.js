import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";

const MAX_IDS = 50;

const checkVisitorStatus = async (req, res) => {
  try {
    const { visitorIds } = req.body;
    const buildingCode = req.buildingCode;

    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!Array.isArray(visitorIds) || visitorIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "visitorIds required" });
    }

    // sirf valid string ObjectId, limit ke saath (bad input se CastError / heavy query nahi)
    const ids = [
      ...new Set(
        visitorIds.filter(
          (id) => typeof id === "string" && mongoose.isValidObjectId(id),
        ),
      ),
    ].slice(0, MAX_IDS);

    if (ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid visitorIds required" });
    }

    const visitors = await Visitor.find({
      _id: { $in: ids },
      buildingCode,
    })
      .select("status respondedBy leaveWithGuard purpose")
      .populate("respondedBy", "fullName")
      .lean();

    const statuses = {};
    visitors.forEach((v) => {
      statuses[String(v._id)] = {
        status: v.status,
        respondedByName: v.respondedBy?.fullName || null,
        leaveWithGuard:
          v.leaveWithGuard === true && ["Delivery", "Cab"].includes(v.purpose),
      };
    });

    return res.json({ success: true, statuses });
  } catch (error) {
    console.error("checkVisitorStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default checkVisitorStatus;
