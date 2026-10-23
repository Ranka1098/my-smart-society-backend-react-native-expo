import crypto from "crypto";
import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { notifyMemberToStaff } from "../notifcation/notifyMembers.js";

const MOBILE_RE = /^\d{10}$/;

const isStr = (v) => typeof v === "string" && v.trim().length > 0;

// 4-digit OTP, crypto-safe (Math.random predictable hota hai)
const generateOtp = () => crypto.randomInt(1000, 10000).toString();

const createPreApproved = async (req, res) => {
  try {
    // Member, building, flat sab token (memberAuth) se. Body se sirf visitor detail.
    const {
      buildingId: bodyBuildingId,
      name,
      mobile,
      purpose,
      visitDate,
      timeSlot,
    } = req.body;

    const memberId = req.member?._id;
    const buildingCode = req.member?.buildingCode;
    const flatNo = req.member?.unitNo;
    const memberType = req.member?.memberType === "Shop" ? "Shop" : "Flat";
    const buildingId = req.member?.buildingId ?? bodyBuildingId;

    if (!memberId || !buildingCode || !flatNo) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ── VALIDATION (string check = NoSQL injection se bachav bhi) ──
    if (![name, purpose, visitDate].every(isStr)) {
      return res.status(400).json({
        success: false,
        message: "name, purpose, visitDate required",
      });
    }
    if (isStr(mobile) && !MOBILE_RE.test(mobile.trim())) {
      return res
        .status(400)
        .json({ success: false, message: "mobile must be 10 digits" });
    }

    // ── CREATE ──
    const visitor = await Visitor.create({
      buildingCode,
      flatNo,
      memberType,
      name: name.trim(),
      mobile: isStr(mobile) ? mobile.trim() : undefined,
      purpose,
      visitDate: visitDate.trim(),
      timeSlot: isStr(timeSlot) ? timeSlot.trim() : null,
      respondedBy: memberId,
      status: "Pending",
      verificationMethod: "OTP",
      notificationSentAt: new Date(),
      otp: generateOtp(),
    });

    // ── MEMBER NAME (Member model me fullName hai) ──
    let memberName = "Member";
    try {
      const member = await Member.findById(memberId)
        .select("fullName name")
        .lean();
      memberName = member?.fullName || member?.name || "Member";
    } catch (e) {
      console.error("createPreApproved member lookup error:", e);
    }

    const respondedBy = {
      _id: memberId,
      fullName: memberName,
      name: memberName,
    };
    const unitLabel = `${visitor.memberType === "Shop" ? "Shop" : "Flat"} ${visitor.flatNo}`;

    // ── REAL-TIME + PUSH: best-effort ──
    // Visitor save ho chuka hai. Notification fail ho to bhi member ko success
    // milna chahiye, warna retry par duplicate entry banegi.
    try {
      const io = req.app.get("io");

      io?.to(`guard_${visitor.buildingCode}`).emit("new_visitor_request", {
        _id: visitor._id,
        name: visitor.name,
        mobile: visitor.mobile || "",
        purpose: visitor.purpose,
        flatNo: visitor.flatNo,
        memberType: visitor.memberType,
        verificationMethod: visitor.verificationMethod,
        visitDate: visitor.visitDate,
        timeSlot: visitor.timeSlot,
        respondedBy,
        source: "socket",
      });

      await notifyMemberToStaff({
        io,
        buildingCode: visitor.buildingCode,
        buildingId,
        type: "GUEST_PRE_APPROVED",
        title: "New Guest Pre-Approved",
        message: `${memberName} ne ${visitor.name} (${visitor.purpose}) ko ${unitLabel} ke liye pre-approve kiya`,
        referenceId: visitor._id,
        data: {
          visitorId: visitor._id,
          name: visitor.name,
          mobile: visitor.mobile || "",
          purpose: visitor.purpose,
          flatNo: visitor.flatNo,
          memberType: visitor.memberType,
          visitDate: visitor.visitDate,
          timeSlot: visitor.timeSlot || "",
          verificationMethod: visitor.verificationMethod,
          respondedBy,
          approvedByMember: memberName,
        },
      });
    } catch (notifyError) {
      console.error("createPreApproved notify error:", notifyError);
    }

    return res.status(201).json({ success: true, data: visitor });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("createPreApproved error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default createPreApproved;
