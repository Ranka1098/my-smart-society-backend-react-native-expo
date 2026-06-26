const express = require("express");
const router = express.Router();
const {
  createVisitorPendingRequest,
  memberApproveOrDeny,
  finalizeEntry,
  logExit,
  getVisitorLog,
} = require("../controllers/visitorController");

// middleware stubs — replace with your actual auth middleware
const authGuard  = (req, res, next) => next(); // guard JWT verify
const authMember = (req, res, next) => next(); // member JWT verify
const authAdmin  = (req, res, next) => next(); // admin JWT verify

// ── GUARD routes ──
router.post("/create-pending", authGuard, createVisitorPendingRequest);
router.post("/finalize-entry", authGuard, finalizeEntry);
router.patch("/:id/exit",      authGuard, logExit);

// ── MEMBER route (called from FCM deep link / in-app) ──
router.post("/approve-or-deny", authMember, memberApproveOrDeny);

// ── ADMIN / GUARD log ──
router.get("/log", authAdmin, getVisitorLog);

module.exports = router;