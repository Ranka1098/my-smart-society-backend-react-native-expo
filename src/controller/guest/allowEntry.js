import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

const allowEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body; // ✅ guard se aayega
    const guardId = req.user?._id;

    const visitor = await Visitor.findById(id);
    if (!visitor)
      return res.status(404).json({ success: false, message: "Nahi mila" });
    if (visitor.status !== "Pending")
      return res
        .status(409)
        .json({ success: false, message: "Already actioned" });

    // ✅ OTP verify — sirf jab verificationMethod OTP ho
    if (visitor.verificationMethod === "OTP") {
      if (!otp || visitor.otp !== otp) {
        return res
          .status(403)
          .json({ success: false, message: "OTP galat hai" });
      }
    }

    visitor.status = "Approved";
    visitor.guardId = guardId;
    visitor.approvedAt = new Date();
    visitor.entryTime = new Date();
    visitor.otpVerifiedAt = new Date();
    visitor.otp = undefined; // ✅ consume
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

    // ✅ SOCKET: member ko turant batao guest allow ho gaya — GuestList se pending hata do
    io.to(`member_${visitor.respondedBy}`).emit("visitor_status_update", {
      visitorId: visitor._id,
      status: "Approved",
    });

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
