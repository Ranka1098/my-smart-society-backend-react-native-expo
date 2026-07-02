import express from "express";

// Registration
import memberRegister from "../controller/member/registration/memberRegister.js";
import verifyMemberOtp from "../controller/member/registration/verifyMemberOtp.js";
import resendMemberOtp from "../controller/member/registration/resendMemberOtp.js";
import getMemberProfile from "../controller/member/registration/getMemberProfile.js";

// Login / Logout
import memberLogin from "../controller/member/login-logout/memberLogin.js";
import memberLogout from "../controller/member/login-logout/memberLogout.js";

// Family Member
import addFamilyMember from "../controller/familymember/addFamilyMember.js";
import verifyFamilyMemberOtp from "../controller/familymember/verifyFamilyMemberOtp.js";
import verifyFamilyMemberResendOtp from "../controller/familymember/verifyFamilyMemberResendOtp.js";
import getFamilyMembers from "../controller/familymember/getFamilyMembers.js";

// Misc
import getDashboardStats from "../controller/admin/dashbaordStat/getDashboardStats.js";
import deleteMember from "../controller/member/deleteMember/deleteMember.js";
import memberSaveFcmToken from "../fcmToken/memberSaveFcmToken.js";
import memberRemoveFcmToken from "../fcmToken/memberRemoveFcmToken.js";

// Middleware
import memberAuth from "../middleware/memberAuth.js";
import adminAuth from "../middleware/adminAuth.js";

// Admin Family Approval — adminRouter mein daalo, yahan nahi
import approveFamilyMemberRequest from "../controller/familymember/approveFamilyMemberRequest.js";
import rejectFamilyMemberRequest from "../controller/familymember/rejectFamilyMemberRequest.js";
import getFamilyMembersPendingRequest from "../controller/familymember/getFamilyMembersPendingRequest.js";

const memberRouter = express.Router();

// =========================
// REGISTRATION
// =========================
memberRouter.post("/memberRegister", memberRegister);
memberRouter.post("/verifyMemberOtp", verifyMemberOtp);
memberRouter.post("/resendMemberOtp", resendMemberOtp);

// =========================
// AUTH
// =========================
memberRouter.post("/memberLogin", memberLogin);
memberRouter.post("/memberLogout", memberLogout);

// =========================
// PROFILE
// =========================
memberRouter.get("/getMemberProfile", memberAuth, getMemberProfile);
memberRouter.get("/member/getDashboardStats", memberAuth, getDashboardStats);

// =========================
// FCM TOKEN
// =========================
memberRouter.post("/memberSaveFcmToken", memberAuth, memberSaveFcmToken);
memberRouter.post("/memberRemoveFcmToken", memberAuth, memberRemoveFcmToken);

// =========================
// FAMILY MEMBER
// =========================
memberRouter.post("/member/addFamilyMember", memberAuth, addFamilyMember);
memberRouter.post(
  "/member/verifyFamilyMemberOtp",
  memberAuth,
  verifyFamilyMemberOtp
);
memberRouter.post(
  "/member/verifyFamilyResendOtp",
  memberAuth,
  verifyFamilyMemberResendOtp
);
memberRouter.get("/member/getFamilyMembers", memberAuth, getFamilyMembers);

// =========================
// ADMIN ONLY
// =========================
memberRouter.delete("/deleteMember/:id", adminAuth, deleteMember);
memberRouter.get(
  "/admin/pendingFamilyMembers",
  adminAuth,
  getFamilyMembersPendingRequest
);
memberRouter.patch(
  "/admin/approveFamilyMember/:id",
  adminAuth,
  approveFamilyMemberRequest
);
memberRouter.patch(
  "/admin/rejectFamilyMember/:id",
  adminAuth,
  rejectFamilyMemberRequest
);

export default memberRouter;
