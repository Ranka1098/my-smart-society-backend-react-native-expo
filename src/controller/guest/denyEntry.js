import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";
import { emitGuardSync } from "../../utils/guardSync.js";

const denyEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const guardId = req.staff?._id;
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;

    if (!guardId || !buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    // ATOMIC: apni building ka, abhi Pending. Do guard ek saath dabayein to ek hi jeetega.
    const visitor = await Visitor.findOneAndUpdate(
      { _id: id, buildingCode, status: "Pending" },
      {
        $set: {
          status: "Denied",
          guardId,
          rejectedAt: new Date(),
          rejectionReason: reason || "Guard ne verify nahi kiya",
        },
        $unset: { otp: "" },
      },
      { returnDocument: "after" },
    );

    if (!visitor) {
      return res.status(409).json({
        success: false,
        message: "Nahi mila ya pehle hi action ho chuka hai",
      });
    }

    emitGuardSync(req, visitor.buildingCode, {
      action: "DENY",
      visitorId: visitor._id,
    });

    // Deny save ho chuka hai. Notification fail ho to bhi success return karo.
    try {
      const io = req.app.get("io");
      const memberId = visitor.respondedBy;

      io?.to(`guard_${visitor.buildingCode}`).emit(
        "visitor_removed_from_preapproved",
        { visitorId: visitor._id },
      );

      if (memberId) {
        const [guard, member] = await Promise.all([
          Staff.findById(guardId).select("workerName name").lean(),
          Member.findById(memberId).select("fcmToken").lean(),
        ]);
        const guardName = guard?.workerName || guard?.name || "Guard";

        io?.to(`member_${memberId}`).emit("visitor_status_update", {
          visitorId: visitor._id,
          status: "Denied",
        });

        await notifyStaffToMember({
          io,
          buildingCode: visitor.buildingCode,
          memberId,
          memberFcmToken: member?.fcmToken,
          type: "GUEST_DENIED",
          title: "Guest Entry Denied ❌",
          message: `${visitor.name} ko ${guardName} ne entry deny kar di (${new Date(
            visitor.rejectedAt,
          ).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })})`,
          referenceId: visitor._id,
          data: {
            visitorId: visitor._id,
            status: "Denied",
            rejectedAt: visitor.rejectedAt,
            reason: visitor.rejectionReason,
            guardName,
            name: visitor.name,
            purpose: visitor.purpose,
          },
        });
      }
    } catch (notifyError) {
      console.error("denyEntry notify error:", notifyError);
    }

    return res.json({ success: true, data: visitor });
  } catch (e) {
    console.error("denyEntry error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default denyEntry;