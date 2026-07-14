import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js"; // apna actual path check karo
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

const allowEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const guardId = req.user?._id; // auth middleware se

    const visitor = await Visitor.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        guardId,
        approvedAt: new Date(),
        entryTime: new Date(),
      },
      { new: true }
    );
    if (!visitor)
      return res.status(404).json({ success: false, message: "Nahi mila" });

    // ✅ member ko wapas batao — kab approve hua, kis guard ne
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
      type: "GUEST_APPROVED",
      title: "Guest Entry Approved ✅",
      message: `${visitor.name} ko ${
        guard?.name || "Guard"
      } ne entry de di (${new Date(visitor.approvedAt).toLocaleTimeString(
        "en-IN",
        { hour: "2-digit", minute: "2-digit" }
      )})`,
      referenceId: visitor._id,
      data: {
        visitorId: visitor._id,
        status: "Approved",
        approvedAt: visitor.approvedAt,
        guardName: guard?.name || "Guard",
        name: visitor.name,
        purpose: visitor.purpose,
      },
    });

    res.json({ success: true, data: visitor });
  } catch (e) {
    console.error("allowEntry error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default allowEntry;
