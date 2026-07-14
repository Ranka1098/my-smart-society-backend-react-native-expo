import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js"; // apna actual path check karo
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

    // ✅ DEBUG — konsa field aaya, konsa nahi, ye console me dikhega
    console.log("createPreApproved body:", req.body);

    const visitor = await Visitor.create({
      buildingCode,
      flatNo,
      name,
      mobile,
      purpose,
      respondedBy: memberId,
      status: "Pending",
      verificationMethod: "ManualCall",
      notificationSentAt: new Date(),
    });

    const member = await Member.findById(memberId).select("name");

    const io = req.app.get("io");
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
