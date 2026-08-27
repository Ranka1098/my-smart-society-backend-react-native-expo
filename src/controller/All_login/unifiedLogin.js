import dotenv from "dotenv";
dotenv.config();
import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";
import StaffModel from "../../model/staff.js";
import buildingModel from "../../model/building.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const unifiedLogin = async (req, res) => {
  try {
    let { mobile, password } = req.body;
    if (!mobile || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and password required" });
    }
    mobile = mobile.trim();

    const [admin, member, staff] = await Promise.all([
      adminModel.findOne({ phone: mobile }),
      memberModel.findOne({ primaryPhone: mobile }).select("+password"),
      StaffModel.findOne({ workerPhoneNumber: mobile, role: "security" }),
    ]);


    const matches = [admin, member, staff].filter(Boolean);

    if (matches.length === 0) {
      console.log("STEP 2a - no matches, returning 401");
      return res
        .status(401)
        .json({ success: false, message: "Invalid mobile number" });
    }
    if (matches.length > 1) {
      console.log("STEP 2b - multi role, returning 409");
      return res.status(409).json({
        success: false,
        code: "MULTI_ROLE",
        message: "This number is linked to multiple accounts. Contact support.",
      });
    }

    const role = admin ? "admin" : member ? "member" : "security";
    const user = admin || member || staff;
    console.log(
      "STEP 3 - resolved role",
      role,
      "buildingCode",
      user.buildingCode
    );

    // ── building checks ──
    const building = await buildingModel.findOne({
      buildingCode: user.buildingCode,
    });
    console.log("STEP 4 - building found?", !!building);

    if (!building) {
      console.log("STEP 4a - building not found, returning 404");
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }
    if (!building.isActive) {
      console.log("STEP 4b - building inactive, returning 403");
      return res.status(403).json({
        success: false,
        code: "BUILDING_INACTIVE",
        message: "Building inactive. Contact support.",
      });
    }
    if (["expired", "blocked"].includes(building.subscriptionStatus)) {
      console.log("STEP 4c - subscription issue:", building.subscriptionStatus);
      return res.status(403).json({
        success: false,
        code:
          building.subscriptionStatus === "blocked"
            ? "BUILDING_BLOCKED"
            : "SUBSCRIPTION_EXPIRED",
        message:
          building.subscriptionStatus === "blocked"
            ? "Building blocked. Contact support."
            : "Subscription expired, please renew",
      });
    }

    // ── role-specific verify/approval checks ──
    console.log("STEP 5 - checking verify/approval for role", role);
    if (role === "admin" && !admin.isVerified) {
      console.log("STEP 5a - admin not verified, returning 403");
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email first" });
    }
    if (role === "member") {
      if (!member.isVerified) {
        console.log("STEP 5b - member not verified, returning 403");
        return res
          .status(403)
          .json({ success: false, message: "Please verify your email first" });
      }
      if (member.approvalStatus === "Pending") {
        console.log("STEP 5c - member pending approval, returning 403");
        return res
          .status(403)
          .json({ success: false, message: "Account pending admin approval" });
      }
      if (member.approvalStatus === "Rejected") {
        console.log("STEP 5d - member rejected, returning 403");
        return res
          .status(403)
          .json({ success: false, message: "Account rejected. Contact admin" });
      }
    }
    if (role === "security") {
      if (!staff.isEmailVerified) {
        console.log("STEP 5e - staff not verified, returning 403");
        return res
          .status(403)
          .json({ success: false, message: "Please verify your email first" });
      }
      if (staff.status === "pending") {
        console.log("STEP 5f - staff pending approval, returning 403");
        return res
          .status(403)
          .json({ success: false, message: "Account pending admin approval" });
      }
      if (staff.status === "rejected") {
        console.log("STEP 5g - staff rejected, returning 403");
        return res.status(403).json({
          success: false,
          message: `Rejected${
            staff.rejectionReason ? `: ${staff.rejectionReason}` : ""
          }`,
        });
      }
    }

    // ── password check ──
    console.log(
      "STEP 6 - before bcrypt.compare, user.password exists?",
      !!user.password
    );
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("STEP 7 - password match result", isMatch);

    if (!isMatch) {
      console.log("STEP 7a - password mismatch, returning 401");
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // ── token ──
    console.log("STEP 8 - generating token");
    const token = jwt.sign(
      {
        id: user._id,
        role,
        buildingId: building._id,
        buildingCode: user.buildingCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: role === "security" ? "24h" : "7d" }
    );
    console.log("STEP 9 - token generated, sending 200 response");

    // ── role-specific response payload (purane structure jaisa hi) ──
    let payload;
    if (role === "admin") {
      payload = {
        _id: admin._id,
        adminName: admin.adminName,
        email: admin.email,
        buildingCode: admin.buildingCode,
        buildingId: building._id,
        buildingName: building.buildingName,
      };
    } else if (role === "member") {
      payload = {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        primaryPhone: member.primaryPhone,
        memberType: member.memberType,
        memberStatus: member.memberStatus,
        buildingCode: member.buildingCode,
        buildingName: member.buildingName,
        unitNo: member.unitNo,
        role: member.role,
        approvalStatus: member.approvalStatus,
      };
    } else {
      payload = {
        _id: staff._id,
        workerName: staff.workerName,
        email: staff.email,
        role: staff.role,
        buildingCode: staff.buildingCode,
        buildingId: building._id,
        buildingName: building.buildingName,
        workerPhoto: staff.workerPhoto,
        joiningDate: staff.joiningDate,
        status: staff.status,
      };
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role,
      user: payload,
    });
  } catch (error) {
    console.log("Unified Login Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default unifiedLogin;
