// =========================
// Code Name: staffRoutes.js
// =========================

import express from "express";
import staffRegister from "../controller/staff/staffRegister.js";
import verifyStaffOtp from "../controller/staff/verifyStaffOtp.js";
import resendStaffOtp from "../controller/staff/resendStaffOtp.js";
import getPendingStaff from "../controller/staff/getPendingStaff.js";
import getAllStaff from "../controller/staff/getAllStaff.js";
import approveStaff from "../controller/staff/approveStaff.js";
import rejectStaff from "../controller/staff/rejectStaff.js";
import adminAuth from "../middleware/adminAuth.js";
import memberAuth from "../middleware/memberAuth.js";

import multer from "multer";
import staffLogin from "../controller/staff/staffLogin.js";
import staffLogout from "../controller/staff/staffLogout.js";
import searchMembersForVisitor from "../controller/staff/searchMembersForVisitor.js";
import staffAuth from "../middleware/staffAuth.js";

// ✅ NEW — FCM controllers add
import staffSaveFcmToken from "../fcmToken/staffSaveFcmToken.js"; // apna sahi path daalo
import staffRemoveFcmToken from "../fcmToken/staffRemoveFcmToken.js"; // apna sahi path daalo
import getStaffProfile from "../controller/staff/getStaffProfile.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const upload = multer({ storage: multer.memoryStorage() });

const StaffRouter = express.Router();

// ── Public ────────────────────────────────────────────────
StaffRouter.post(
  "/staffRegister",
  upload.fields([
    { name: "workerPhoto", maxCount: 1 },
    { name: "workerIdProof", maxCount: 1 },
  ]),
  staffRegister
);
StaffRouter.get("/getStaffProfile", staffAuth, getStaffProfile);
StaffRouter.post("/verifyStaffOtp", verifyStaffOtp);
StaffRouter.post("/resendStaffOtp", resendStaffOtp);
StaffRouter.post("/staffLogin", staffLogin);
StaffRouter.post("/staffLogout", staffAuth, staffLogout);

// ── Admin Protected ───────────────────────────────────────
StaffRouter.get(
  "/admin/pendingStaff",
  adminAuth,
  checkBuildingSubscription,
  getPendingStaff
);
StaffRouter.get(
  "/admin/allStaff",
  adminAuth,
  checkBuildingSubscription,
  getAllStaff
);
StaffRouter.get(
  "/member/allStaff",
  memberAuth,
  checkBuildingSubscription,
  getAllStaff
);
StaffRouter.patch(
  "/admin/approveStaff/:staffId",
  adminAuth,
  checkBuildingSubscription,
  approveStaff
);
StaffRouter.patch(
  "/admin/rejectStaff/:staffId",
  adminAuth,
  checkBuildingSubscription,
  rejectStaff
);
StaffRouter.get(
  "/staff/searchMembers",
  staffAuth,
  checkBuildingSubscription,
  searchMembersForVisitor
);
StaffRouter.post(
  "/staffSaveFcmToken",
  staffAuth,
  checkBuildingSubscription,
  staffSaveFcmToken
);
StaffRouter.post(
  "/staffRemoveFcmToken",
  staffAuth,
  checkBuildingSubscription,
  staffRemoveFcmToken
);

export default StaffRouter;
