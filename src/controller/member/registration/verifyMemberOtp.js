import memberModel from "../../../model/member.js";
import { notifyMemberToAdmin } from "../../../controller/notifcation/notifyMembers.js"; // apna actual path check kar

const verifyMemberOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const member = await memberModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (member.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Member already verified",
      });
    }

    if (member.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!member.otpExpires || member.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const existingUnit = await memberModel.findOne({
      buildingCode: member.buildingCode,
      unitNo: member.unitNo,
      memberType: member.memberType,
      role: "primary",
      isVerified: true,
      _id: { $ne: member._id },
    });

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: "Primary member already exists for this unit",
      });
    }

    member.isVerified = true;
    member.approvalStatus = "Pending";
    member.otp = null;
    member.otpExpires = null;

    await member.save();

    // ✅ ADD — admin ko notify karo naya member approval ke liye
    const io = req.app.get("io");
    await notifyMemberToAdmin({
      io,
      buildingCode: member.buildingCode,
      buildingId: member.buildingId, // agar member schema me hai, warna hata do
      type: "NEW_MEMBER_REQUEST",
      title: "New Member Registration",
      message: `${member.fullName} (${member.unitNo}) registered — approval pending`,
      referenceId: member._id,
      referenceModel: "Member",
      data: {
        memberId: member._id.toString(),
        unitNo: member.unitNo,
        memberType: member.memberType,
      },
      senderId: member._id,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Waiting for admin approval.",
    });
  } catch (error) {
    console.log("Verify Member OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default verifyMemberOtp;
