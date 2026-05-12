// =========================
// Code Name: authCheck.js (Improved Response)
// =========================

import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";

const authCheck = async (req, res) => {
  try {
    const { id, role } = req.user;

    let user = null;

    if (role === "admin") {
      user = await adminModel.findById(id).select("-password");
    } else if (role === "member") {
      user = await memberModel.findById(id).select("-password");
    } else {
      return res.status(400).json({
        success: false,
        logout: true,
        message: "Invalid role",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        logout: true,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      role,
      user,
    });
  } catch (error) {
    console.log("Auth Check Error:", error);

    return res.status(500).json({
      success: false,
      logout: true,
      message: "Server error",
    });
  }
};

export default authCheck;
