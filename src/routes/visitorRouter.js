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
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const visitorRouter = express.Router();

visitorRouter.post(
  "/createVisitorPendingRequest",
  staffAuth,
  checkBuildingSubscription,
  upload.single("photo"),
  createVisitorPendingRequest
);
visitorRouter.post(
  "/visitor/emergency-exit",
  staffAuth,
  checkBuildingSubscription,
  upload.single("photo"),
  emergencyExit
);
visitorRouter.post(
  "/finalizeEntry",
  staffAuth,
  checkBuildingSubscription,
  finalizeEntry
);
visitorRouter.patch(
  "/visitor/:id/exit",
  staffAuth,
  checkBuildingSubscription,
  logExit
);
visitorRouter.get(
  "/visitor/log",
  staffAuth,
  checkBuildingSubscription,
  getVisitorLog
);
visitorRouter.get(
  "/getGuardDashboard",
  staffAuth,
  checkBuildingSubscription,
  getGuardDashboard
);
visitorRouter.post(
  "/memberApproveOrDeny",
  memberAuth,
  checkBuildingSubscription,
  memberApproveOrDeny
);
visitorRouter.get(
  "/memberPendingVisitor",
  memberAuth,
  checkBuildingSubscription,
  memberPendingVisitor
);

export default visitorRouter;
