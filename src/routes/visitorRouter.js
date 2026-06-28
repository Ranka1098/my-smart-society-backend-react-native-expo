import express from "express";
import staffAuth from "../middleware/staffAuth.js";
import memberAuth from "../middleware/memberAuth.js";
import createVisitorPendingRequest from "../controller/visitor/CerateVisitorPendingRequest.js";
import memberApproveOrDeny from "../controller/visitor/memberApproveOrDeny.js";
import finalizeEntry from "../controller/visitor/finalizeEntry.js";
import logExit from "../controller/visitor/logExit.js";
import getVisitorLog from "../controller/visitor/getVisitorLog.js";

const visitorRouter = express.Router();

// Guard routes
visitorRouter.post(
  "/visitor/create-pending",
  staffAuth,
  createVisitorPendingRequest
);
visitorRouter.post("/visitor/finalize-entry", staffAuth, finalizeEntry);
visitorRouter.patch("/visitor/:id/exit", staffAuth, logExit);
visitorRouter.get("/visitor/log", staffAuth, getVisitorLog);

// Member routes
visitorRouter.post("/visitor/approve-or-deny", memberAuth, memberApproveOrDeny);

export default visitorRouter;
