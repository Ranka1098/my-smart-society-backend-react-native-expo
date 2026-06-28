import Visitor from "../../model/Visitor.js";

const finalizeEntry = async (req, res) => {
  try {
    const { visitorId, verificationMethod, forcedEntryReason } = req.body;

    if (!visitorId || !["ManualCall", "ForcedEntry", "Denied"].includes(verificationMethod)) {
      return res.status(400).json({ success: false, message: "Invalid params" });
    }

    if (verificationMethod === "ForcedEntry" && !forcedEntryReason?.trim()) {
      return res.status(400).json({ success: false, message: "Forced entry ke liye reason required" });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ success: false, message: "Visitor nahi mila" });

    if (!["Pending", "Rejected"].includes(visitor.status)) {
      return res.status(409).json({ success: false, message: `Already ${visitor.status}` });
    }

    const now = new Date();
    visitor.verificationMethod = verificationMethod;

    if (verificationMethod === "ManualCall") {
      visitor.status = "Approved";
      visitor.approvedAt = now;
    } else if (verificationMethod === "ForcedEntry") {
      visitor.status = "ForcedEntry";
      visitor.approvedAt = now;
      visitor.forcedEntryReason = forcedEntryReason.trim();
      // TODO: admin alert
    } else {
      // Guard ne deny kiya
      visitor.status = "Rejected";
      visitor.rejectedAt = now;
      visitor.rejectionReason = "Guard ne deny kiya";
    }

    await visitor.save();

    return res.status(200).json({ success: true, data: { visitorId: visitor._id, status: visitor.status } });
  } catch (error) {
    console.error("finalizeEntry error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default finalizeEntry;