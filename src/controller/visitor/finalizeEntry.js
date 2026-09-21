import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js"; // ✅ path check karo
import { notifyStaffToMember } from "../../controller/notifcation/notifyMembers.js"; // ✅ default hataya, named import

const finalizeEntry = async (req, res) => {
  try {
    const { visitorId, verificationMethod, forcedEntryReason } = req.body;

    if (
      !visitorId ||
      !["FCM", "ManualCall", "ForcedEntry", "Denied"].includes(
        verificationMethod,
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid params" });
    }

    const visitor = await Visitor.findById(visitorId); // ✅ MOVE — pehle fetch kar
    if (!visitor)
      return res
        .status(404)
        .json({ success: false, message: "Visitor nahi mila" });

    if (verificationMethod === "ForcedEntry" && !forcedEntryReason?.trim()) {
      console.log("🔍 notifiedMembers:", visitor.notifiedMembers); // ✅ ab sahi hai
      return res.status(400).json({
        success: false,
        message: "Forced entry ke liye reason required",
      });
    }

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
      visitor.entryTime = now;
    } else if (verificationMethod === "ForcedEntry") {
      visitor.status = "Approved";
      visitor.approvedAt = now;
      visitor.entryTime = now;
      visitor.forcedEntryReason = forcedEntryReason.trim();
    } else {
      visitor.status = "Rejected";
      visitor.rejectedAt = now;
      visitor.rejectionReason = "Guard ne cancel kiya";
    }

    await visitor.save();

    const io = req.app.get("io");
    (visitor.notifiedMembers || []).forEach((memberId) => {
      io.to(`member_${memberId}`).emit(
        verificationMethod === "Denied"
          ? "visitor_cancelled_by_guard"
          : "visitor_decided",
        { visitorId: visitor._id, status: visitor.status },
      );
    });

    if (
      verificationMethod === "ManualCall" ||
      verificationMethod === "ForcedEntry"
    ) {
      const members = await Member.find({
        _id: { $in: visitor.notifiedMembers || [] },
      }).select("_id fcmToken");

      const isForced = verificationMethod === "ForcedEntry";

      for (const m of members) {
        await notifyStaffToMember({
          io,
          buildingCode: visitor.buildingCode,
          buildingId: visitor.buildingId,
          memberId: m._id,
          memberFcmToken: m.fcmToken,
          type: "GUEST_APPROVED",
          title: isForced
            ? "Force Entry Diya Gaya ⚠️"
            : "Visitor Entry Verified",
          message: isForced
            ? `${visitor.name} ko bina response ke force entry di gayi.\nReason: ${visitor.forcedEntryReason}`
            : `${visitor.name} ko call par verify karke entry di gayi.`,
          data: {
            visitorId: String(visitor._id),
            status: visitor.status,
            method: isForced ? "ForcedEntry" : "ManualCall",
          },
          referenceId: visitor._id,
        });
      }
    }

    // ✅ ADD — dashboard ke liye guard room mein emit karo
    if (verificationMethod !== "Denied") {
      io.to(`guard_${visitor.buildingCode}`).emit("visitor_finalized", {
        visitorId: visitor._id,
        method: verificationMethod,
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
