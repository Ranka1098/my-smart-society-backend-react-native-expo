import express from "express";
import staffAuth from "../middleware/staffAuth.js";
import memberAuth from "../middleware/memberAuth.js";
import createVisitorPendingRequest from "../controller/visitor/CerateVisitorPendingRequest.js";
import memberApproveOrDeny from "../controller/visitor/memberApproveOrDeny.js";
import finalizeEntry from "../controller/visitor/finalizeEntry.js";
import logExit from "../controller/visitor/logExit.js";
import getVisitorLog from "../controller/visitor/getVisitorLog.js";
import upload from "../cloudinary/multerConfig.js";
import emergencyExit from "../controller/visitor/emergencyExit.js";
import memberPendingVisitor from "../controller/visitor/memberPendingVisitor.js";
import getGuardDashboard from "../controller/visitor/getGuardDashboard.js";
const visitorRouter = express.Router();

// Guard routes
visitorRouter.post(
  "/createVisitorPendingRequest",
  staffAuth,
  upload.single("photo"), // ← add this
  createVisitorPendingRequest
);

visitorRouter.post(
  "/visitor/emergency-exit",
  staffAuth,
  upload.single("photo"),
  emergencyExit
);

visitorRouter.post("/finalizeEntry", staffAuth, finalizeEntry);
visitorRouter.patch("/visitor/:id/exit", staffAuth, logExit);
visitorRouter.get("/visitor/log", staffAuth, getVisitorLog);
visitorRouter.get("/getGuardDashboard", staffAuth, getGuardDashboard);

// Member routes
visitorRouter.post("/memberApproveOrDeny", memberAuth, memberApproveOrDeny);
visitorRouter.get("/memberPendingVisitor", memberAuth, memberPendingVisitor);

// society member entry
// visitorRouter.post("/societyMemberEntry", staffAuth, upload.single("photo"), societyMemberEntry);

export default visitorRouter;
