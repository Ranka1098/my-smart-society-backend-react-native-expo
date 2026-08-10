import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";
import staffModel from "../../model/staff.js";
import superAdminModel from "../../model/superAdmin.js";
import buildingModel from "../../model/building.js"; // ✅ ADD

const authCheck = async (req, res) => {
  try {
    const { id, role } = req.user;

    let user = null;

    if (role === "admin") {
      user = await adminModel.findById(id).select("-password");
    } else if (role === "member") {
      user = await memberModel.findById(id).select("-password");
    } else if (role === "security") {
      user = await staffModel.findById(id).select("-password");
    } else if (role === "superadmin") {
      user = await superAdminModel.findById(id).select("-password -secretKey");
    } else {
      return res
        .status(400)
        .json({ success: false, logout: true, message: "Invalid role" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, logout: true, message: "User not found" });
    }

    // ✅ ADD — buildingName populate karo (admin/member/security teeno ke liye)
    let userObj = user.toObject();
    if (
      ["admin", "member", "security"].includes(role) &&
      userObj.buildingCode
    ) {
      const building = await buildingModel
        .findOne({ buildingCode: userObj.buildingCode })
        .select("buildingName");
      userObj.buildingName = building?.buildingName || null;
    }

    return res.status(200).json({ success: true, role, user: userObj }); // ✅ CHANGE — user → userObj
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, logout: true, message: "Server error" });
  }
};

export default authCheck;
