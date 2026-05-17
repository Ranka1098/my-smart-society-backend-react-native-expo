// =========================
// Code Name: getPendingMembers.js
// =========================

import memberModel from "../../../model/member.js";

const getPendingMembers = async (req, res) => {
  try {
    // =========================
    // ADMIN KA BUILDING CODE
    // adminAuth middleware se aata hai
    // =========================
    const buildingCode = req.buildingCode;

    // =========================
    // FETCH PENDING MEMBERS
    // sirf usi building ke members
    // =========================
    const pendingMembers = await memberModel
      .find({
        buildingCode,           // ← sirf admin ki building ke
        isVerified:     true,
        approvalStatus: "Pending",
        role:           "primary",
      })
      .select("-password -otp -otpExpires -resetOtp -resetOtpExpiry -currentFcmToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   pendingMembers.length,
      members: pendingMembers,
    });

  } catch (error) {
    console.log("Get Pending Members Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:   error.message,
    });
  }
};

export default getPendingMembers;