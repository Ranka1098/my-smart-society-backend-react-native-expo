import memberAuth from "../middleware/memberAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import express from "express";
import createComplaint from "../controller/complaint/createComplaint.js";
import getAdminComplaints from "../controller/complaint/getAdminComplaints.js";
import resolveComplaint from "../controller/complaint/resolveComplaint.js";
import getMemberComplaints from "../controller/complaint/getMemberComplaint.js";

const complaintRouter = express.Router();

complaintRouter.post(
  "/createComplaint",
  memberAuth, // 🔥 MUST
  createComplaint
);
complaintRouter.get("/getAdminComplaints", adminAuth, getAdminComplaints);
complaintRouter.patch("/resolveComplaint/:id", adminAuth, resolveComplaint);
complaintRouter.get("/getMemberComplaint", memberAuth, getMemberComplaints);

export default complaintRouter;
