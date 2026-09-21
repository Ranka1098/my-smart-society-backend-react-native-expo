import Visitor from "../../model/Visitor.js";

const checkVisitorStatus = async (req, res) => {
  try {
    const { visitorIds } = req.body;
    const buildingCode = req.buildingCode; // ✅ middleware ne JWT se yahi set kiya

    if (!Array.isArray(visitorIds) || visitorIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "visitorIds required" });
    }

    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const visitors = await Visitor.find({
      _id: { $in: visitorIds },
      buildingCode,
    })
      .select("status respondedBy")
      .populate("respondedBy", "fullName");

    const statuses = {};
    visitors.forEach((v) => {
      statuses[v._id.toString()] = {
        status: v.status,
        respondedByName: v.respondedBy?.fullName || null,
      };
    });

    return res.json({ success: true, statuses });
  } catch (error) {
    console.error("checkVisitorStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default checkVisitorStatus;
