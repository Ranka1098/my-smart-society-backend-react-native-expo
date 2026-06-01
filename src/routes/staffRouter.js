import express from "express";
import upload from "../cloudinary/multerConfig.js";
import adminAuth from "../middleware/adminAuth.js";
import createdStaffMember from "../controller/staff/createdStaffMember.js";
import getStaffMember from "../controller/staff/getStaffMember.js";
import deleteStaffMember from "../controller/staff/deleteStaffMember.js";

const staffRouter = express.Router();

staffRouter.post(
  "/createStaff",
  adminAuth,
  upload.fields([
    { name: "workerPhoto", maxCount: 1 },
    { name: "workerIdProof", maxCount: 1 },
  ]),
  createdStaffMember
);

staffRouter.get("/getStaff", adminAuth, getStaffMember);
staffRouter.delete("/deleteStaff/:id", adminAuth, deleteStaffMember);

export default staffRouter;
