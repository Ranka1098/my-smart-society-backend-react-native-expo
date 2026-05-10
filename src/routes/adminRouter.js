import express from "express";
import adminRegister from "../controller/admin/adminRegister.js";
import verifyAdminOtp from "../controller/admin/verifyAdminOtp.js";
import resendAdminOtp from "../controller/admin/resendAdminOtp.js";

const adminRouter = express.Router();

//registration api
adminRouter.post("/adminRegister", adminRegister);
adminRouter.post("/verifyOtp", verifyAdminOtp);
adminRouter.post("/resendOtp", resendAdminOtp);

export default adminRouter;
 