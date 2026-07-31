import memberAuth from "../middleware/memberAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import express from "express";
import createComplaint from "../controller/complaint/createComplaint.js";
import getAdminComplaints from "../controller/complaint/getAdminComplaints.js";
import resolveComplaint from "../controller/complaint/resolveComplaint.js";
import getMemberComplaints from "../controller/complaint/getMemberComplaint.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const complaintRouter = express.Router();

complaintRouter.post(
  "/createComplaint",
  memberAuth,
  checkBuildingSubscription,
  createComplaint
);
complaintRouter.get(
  "/getAdminComplaints",
  adminAuth,
  checkBuildingSubscription,
  getAdminComplaints
);
complaintRouter.patch(
  "/resolveComplaint/:id",
  adminAuth,
  checkBuildingSubscription,
  resolveComplaint
);
complaintRouter.get(
  "/getMemberComplaint",
  memberAuth,
  checkBuildingSubscription,
  getMemberComplaints
);

export default complaintRouter;
