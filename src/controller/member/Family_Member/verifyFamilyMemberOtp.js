// controllers/member/verifyFamilyMemberOtp.js
import Member from "../../../model/member.js";
import Building from "../../../model/building.js";
import { notifyMemberToAdmin } from "../../notifcation/notifyMembers.js";

const verifyFamilyMemberOtp = async (req, res) => {
  try {
    const primaryMember = req.member;
    const { familyMemberId, otp } = req.body;

    if (!familyMemberId || !otp)
      return res.status(400).json({
        success: false,
        message: "familyMemberId aur OTP required",
      });

    const familyMember = await Member.findOne({
      _id: familyMemberId,
      buildingCode: primaryMember.buildingCode,
      unitNo: primaryMember.unitNo,
      role: "family",
    }).select("+otp +otpExpires");

    if (!familyMember)
      return res.status(404).json({
        success: false,
        message: "Family member nahi mila",
      });

    if (familyMember.isVerified)
      return res.status(409).json({
        success: false,
        message: "Already verified hai",
      });

    if (!familyMember.otp || familyMember.otp !== otp)
      return res.status(400).json({
        success: false,
        message: "OTP galat hai",
      });

    if (new Date() > familyMember.otpExpires)
      return res.status(410).json({
        success: false,
        message: "OTP expire ho gaya. Dobara request karo.",
      });

    // OTP correct → verify + clear
    familyMember.isVerified = true;
    familyMember.otp = null;
    familyMember.otpExpires = null;
    await familyMember.save();

    // ✅ Response pehle — notification baad me
    res.status(200).json({
      success: true,
      message: "OTP verified! Admin approval ka wait karo.",
    });

    // Notification — silent fail
    try {
      const building = await Building.findOne({
        buildingCode: primaryMember.buildingCode,
      }).select("_id");

      if (!building) throw new Error("Building not found");

      const io = req.app.get("io");
      await notifyMemberToAdmin({
        io,
        buildingCode: primaryMember.buildingCode,
        buildingId: building._id,
        type: "NEW_MEMBER_REQUEST",
        title: "New Family Member Request 👨‍👩‍👧",
        message: `${familyMember.fullName} (${familyMember.relation} of ${primaryMember.fullName}) ne Unit ${primaryMember.unitNo} ke liye request ki hai.`,
        data: {
          familyMemberId: familyMember._id.toString(),
          unitNo: primaryMember.unitNo,
          relation: familyMember.relation,
        },
        senderId: primaryMember._id,
      });
    } catch (notifError) {
      console.error("Notification error:", notifError.message);
    }
  } catch (error) {
    console.error("verifyFamilyOtp error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default verifyFamilyMemberOtp;
