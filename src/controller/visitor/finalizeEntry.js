import Visitor from "../../model/Visitor.js";

const finalizeEntry = async (req, res) => {
  try {
    const { visitorId, verificationMethod, forcedEntryReason } = req.body;

    if (
      !visitorId ||
      !["FCM", "ManualCall", "ForcedEntry", "Denied"].includes(
        verificationMethod
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid params" });
    }

    if (verificationMethod === "ForcedEntry" && !forcedEntryReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Forced entry ke liye reason required",
      });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor)
      return res
        .status(404)
        .json({ success: false, message: "Visitor nahi mila" });

    const blockedStatuses = ["Rejected", "Exited"];
    if (blockedStatuses.includes(visitor.status)) {
      return res
        .status(409)
        .json({ success: false, message: `Already ${visitor.status}` });
    }

    const now = new Date();
    visitor.verificationMethod = verificationMethod;

    if (verificationMethod === "FCM" || verificationMethod === "ManualCall") {
      visitor.status = "Approved";
      visitor.approvedAt = now;
    } else if (verificationMethod === "ForcedEntry") {
      visitor.status = "ForcedEntry";
      visitor.approvedAt = now;
      visitor.forcedEntryReason = forcedEntryReason.trim();
    } else {
      // Denied — guard cancel
      visitor.status = "Rejected";
      visitor.rejectedAt = now;
      visitor.rejectionReason = "Guard ne cancel kiya";
    }

    await visitor.save();

    // ── guard cancel → sab notified members ko notify karo ──
    if (verificationMethod === "Denied") {
      const io = req.app.get("io");
      (visitor.notifiedMembers || []).forEach((memberId) => {
        io.to(`member_${memberId}`).emit("visitor_cancelled_by_guard", {
          visitorId: visitor._id,
        });
      });
    }

    return res.status(200).json({
      success: true,
      data: { visitorId: visitor._id, status: visitor.status },
    });
  } catch (error) {
    console.error("finalizeEntry error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default finalizeEntry;
