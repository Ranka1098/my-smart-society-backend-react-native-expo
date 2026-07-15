import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { notifyMemberToStaff } from "../notifcation/notifyMembers.js";

const createPreApproved = async (req, res) => {
  try {
    const {
      buildingCode,
      buildingId,
      memberId,
      flatNo,
      name,
      mobile,
      purpose,
      timeSlot,
    } = req.body;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const visitor = await Visitor.create({
      buildingCode,
      flatNo,
      name,
      mobile,
      purpose,
      respondedBy: memberId,
      status: "Pending",
      verificationMethod: "OTP",
      notificationSentAt: new Date(),
      otp,
    });

    const member = await Member.findById(memberId).select("name");
    const io = req.app.get("io");

    // ✅ NEW: guard ke PreApprovedDetail me turant dikhe
    io.to(`guard_${buildingCode}`).emit("new_visitor_request", {
      _id: visitor._id,
      name: visitor.name,
      mobile: visitor.mobile,
      purpose: visitor.purpose,
      flatNo: visitor.flatNo,
      verificationMethod: visitor.verificationMethod, // ✅ OTP button ke liye zaroori
      timeSlot,
      respondedBy: { _id: memberId, name: member?.name },
      source: "socket",
    });

    await notifyMemberToStaff({
      io,
      buildingCode,
      buildingId,
      type: "GUEST_PRE_APPROVED",
      title: "New Guest Pre-Approved",
      message: `${
        member?.name || "Member"
      } ne ${name} (${purpose}) ko Flat ${flatNo} ke liye pre-approve kiya`,
      referenceId: visitor._id,
      data: {
        visitorId: visitor._id,
        name,
        mobile,
        purpose,
        flatNo,
        timeSlot,
        approvedByMember: member?.name || "Member",
      },
    });

    res.json({ success: true, data: visitor });
  } catch (e) {
    console.error("createPreApproved error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default createPreApproved;
