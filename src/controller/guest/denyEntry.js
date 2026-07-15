import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

const denyEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const guardId = req.user?._id;

    const visitor = await Visitor.findById(id);
    if (!visitor)
      return res.status(404).json({ success: false, message: "Nahi mila" });
    if (visitor.status !== "Pending")
      return res
        .status(409)
        .json({ success: false, message: "Already actioned" });

    visitor.status = "Denied";
    visitor.guardId = guardId;
    visitor.rejectedAt = new Date();
    visitor.rejectionReason = reason || "Guard ne verify nahi kiya";
    await visitor.save();

    const guard = await Staff.findById(guardId).select("name");
    const member = await Member.findById(visitor.respondedBy).select(
      "fcmToken"
    );

    const io = req.app.get("io");

    // allowEntry.js me visitor.save() ke baad
    io.to(`guard_${visitor.buildingCode}`).emit(
      "visitor_removed_from_preapproved",
      {
        visitorId: visitor._id,
      }
    );

    // ✅ SOCKET: member ko turant batao guest deny ho gaya — GuestList se pending hata do
    io.to(`member_${visitor.respondedBy}`).emit("visitor_status_update", {
      visitorId: visitor._id,
      status: "Denied",
    });

    await notifyStaffToMember({
      io,
      buildingCode: visitor.buildingCode,
      memberId: visitor.respondedBy,
      memberFcmToken: member?.fcmToken,
      type: "GUEST_DENIED",
      title: "Guest Entry Denied ❌",
      message: `${visitor.name} ko ${
        guard?.name || "Guard"
      } ne entry deny kar di (${new Date(visitor.rejectedAt).toLocaleTimeString(
        "en-IN",
        { hour: "2-digit", minute: "2-digit" }
      )})`,
      referenceId: visitor._id,
      data: {
        visitorId: visitor._id,
        status: "Denied",
        rejectedAt: visitor.rejectedAt,
        reason: visitor.rejectionReason,
        guardName: guard?.name || "Guard",
        name: visitor.name,
        purpose: visitor.purpose,
      },
    });

    res.json({ success: true, data: visitor });
  } catch (e) {
    console.error("denyEntry error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default denyEntry;
