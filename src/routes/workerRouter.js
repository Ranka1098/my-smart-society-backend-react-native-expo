import express from "express";
import upload from "../cloudinary/multerConfig.js";
import staffAuth from "../middleware/staffAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import memberAuth from "../middleware/memberAuth.js";
import createWorkerPendingRequest from "../controller/worker/createWorkerPendingRequest.js";
import getAdminWorkerRequests from "../controller/worker/getAdminWorkerRequests.js"
import getMemberWorkerRequests from "../controller/worker/getMemberWorkerRequests.js";
import approveWorkerByAdmin from "../controller/worker/approveWorkerByAdmin.js";
import rejectWorkerByAdmin from "../controller/worker/rejectWorkerByAdmin.js";
import approveWorkerByMember from "../controller/worker/approveWorkerByMember.js";
import rejectWorkerByMember from "../controller/worker/rejectWorkerByMember.js";
import { searchApprovedWorkers } from "../controller/worker/searchApprovedWorkers.js";
import quickWorkerEntry from "../controller/worker/quickWorkerEntry.js";
import getApprovedAdminWorkers from "../controller/worker/getApprovedAdminWorkers.js"

const workerRouter = express.Router();
workerRouter.post(
  "/createWorkerPendingRequest",
  staffAuth,
  upload.single("photo"),
  createWorkerPendingRequest
);

workerRouter.get("/getAdminWorkerRequests", adminAuth, getAdminWorkerRequests);

workerRouter.get(
  "/getMemberWorkerRequests",
  memberAuth,
  getMemberWorkerRequests
);

workerRouter.post(
  "/approveWorkerByAdmin/:workerId",
  adminAuth,
  approveWorkerByAdmin
);
workerRouter.post(
  "/rejectWorkerByAdmin/:workerId",
  adminAuth,
  rejectWorkerByAdmin
);

workerRouter.post(
  "/approveWorkerByMember/:workerId",
  memberAuth,
  approveWorkerByMember
);
workerRouter.post(
  "/rejectWorkerByMember/:workerId",
  memberAuth,
  rejectWorkerByMember
);

workerRouter.get("/searchApprovedWorkers", staffAuth, searchApprovedWorkers);
workerRouter.post("/quickWorkerEntry", staffAuth, quickWorkerEntry);

workerRouter.get("/getApprovedAdminWorkers",adminAuth,getApprovedAdminWorkers)
export default workerRouter;
