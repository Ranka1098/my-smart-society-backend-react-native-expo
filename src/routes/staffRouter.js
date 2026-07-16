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
import searchMembersForVisitor from "../controller/staff/searchMembersForVisitor.js";
import staffAuth from "../middleware/staffAuth.js";

// ✅ NEW — FCM controllers add
import staffSaveFcmToken from "../fcmToken/staffSaveFcmToken.js"; // apna sahi path daalo
import staffRemoveFcmToken from "../fcmToken/staffRemoveFcmToken.js"; // apna sahi path daalo

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
StaffRouter.post("/verifyStaffOtp", verifyStaffOtp);
StaffRouter.post("/resendStaffOtp", resendStaffOtp);
StaffRouter.post("/staffLogin", staffLogin);

// ── Admin Protected ───────────────────────────────────────
StaffRouter.get("/admin/pendingStaff", adminAuth, getPendingStaff);
StaffRouter.get("/admin/allStaff", adminAuth, getAllStaff);
StaffRouter.get("/member/allStaff", memberAuth, getAllStaff);
StaffRouter.patch("/admin/approveStaff/:staffId", adminAuth, approveStaff);
StaffRouter.put("/admin/rejectStaff/:staffId", adminAuth, rejectStaff);

StaffRouter.get("/staff/searchMembers", staffAuth, searchMembersForVisitor);

// ✅ NEW — FCM token routes
StaffRouter.post("/staffSaveFcmToken", staffAuth, staffSaveFcmToken);
StaffRouter.post("/staffRemoveFcmToken", staffAuth, staffRemoveFcmToken);

export default StaffRouter;
