import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

const denyEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const guardId = req.user?._id;

    const visitor = await Visitor.findByIdAndUpdate(
      id,
      {
        status: "Denied",
        guardId,
        rejectedAt: new Date(),
        rejectionReason: reason || "Guard ne allow nahi kiya",
      },
      { new: true }
    );
    if (!visitor)
      return res.status(404).json({ success: false, message: "Nahi mila" });

    const guard = await Staff.findById(guardId).select("name");
    const member = await Member.findById(visitor.respondedBy).select(
      "fcmToken"
    );

    const io = req.app.get("io");
    await notifyStaffToMember({
      io,
      buildingCode: visitor.buildingCode,
      memberId: visitor.respondedBy,
      memberFcmToken: member?.fcmToken,
      type: "GUEST_REJECTED",
      title: "Guest Entry Denied ❌",
      message: `${visitor.name} ko ${
        guard?.name || "Guard"
      } ne entry deny kar di`,
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
