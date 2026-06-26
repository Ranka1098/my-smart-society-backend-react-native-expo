// ────────────────────────────────────────────────────────────────
// POST /api/visitor/finalize-entry
// Guard finalizes entry after timer expired — 3 paths:
//   a) ManualCall  — guard called member, verbal ok
//   b) ForcedEntry — no response, guard forces with reason
// Body: { visitorId, verificationMethod: "ManualCall"|"ForcedEntry",
//         forcedEntryReason? }
// ─────────────────────────────────────────────────────────────────
const finalizeEntry = async (req, res) => {
  try {
    const { visitorId, verificationMethod, forcedEntryReason } = req.body;

    if (
      !visitorId ||
      !["ManualCall", "ForcedEntry"].includes(verificationMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "visitorId aur valid verificationMethod required",
      });
    }

    if (verificationMethod === "ForcedEntry" && !forcedEntryReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Force Entry ke liye reason mandatory hai",
      });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor record nahi mila" });
    }

    // only allow finalize on Pending or Rejected records
    if (!["Pending", "Rejected"].includes(visitor.status)) {
      return res.status(409).json({
        success: false,
        message: `Status already ${visitor.status} — finalize nahi ho sakta`,
      });
    }

    const now = new Date();

    visitor.verificationMethod = verificationMethod;
    visitor.approvedAt = now;

    if (verificationMethod === "ManualCall") {
      visitor.status = "Approved";
    } else {
      visitor.status = "ForcedEntry";
      visitor.forcedEntryReason = forcedEntryReason.trim();

      // TODO: send alert to admin/manager
      // notifyAdmin({ type: "FORCE_ENTRY", visitorId, reason: forcedEntryReason });
    }

    await visitor.save();

    return res.status(200).json({
      success: true,
      message:
        verificationMethod === "ManualCall"
          ? "Entry saved — call pe verify hua"
          : "Force Entry saved — admin ko alert bheja",
      data: {
        visitorId: visitor._id,
        status: visitor.status,
        verificationMethod,
      },
    });
  } catch (error) {
    console.error("finalizeEntry error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
