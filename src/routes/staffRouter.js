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

import multer from "multer";
import staffLogin from "../controller/staff/staffLogin.js";
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
StaffRouter.patch("/admin/approveStaff/:staffId", adminAuth, approveStaff);
StaffRouter.put("/admin/rejectStaff/:staffId", adminAuth, rejectStaff);

export default StaffRouter;
