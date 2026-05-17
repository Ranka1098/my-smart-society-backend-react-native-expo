import express from "express";
import adminRegister from "../controller/admin/registration/adminRegister.js";
import verifyAdminOtp from "../controller/admin/registration/verifyAdminOtp.js";
import resendAdminOtp from "../controller/admin/registration/resendAdminOtp.js";
import adminLogin from "../controller/admin/login-logout/adminLogin.js";
import adminLogout from "../controller/admin/login-logout/adminLogout.js";
import adminAuth from "../middleware/adminAuth.js";
import getAdminProfile from "../controller/admin/registration/getAdminProfile.js";
import getPendingMembers from "../controller/admin/memberRequest/getPendingMembers.js";
import approveMember from "../controller/admin/memberRequest/approveMember.js";
import rejectMember from "../controller/admin/memberRequest/rejectMember.js";
const adminRouter = express.Router();

//registration api
adminRouter.post("/adminRegister", adminRegister);
adminRouter.post("/verifyAdminOtp", verifyAdminOtp);
adminRouter.post("/resendAdminOtp", resendAdminOtp);

//memberReuest
adminRouter.get("/getPendingMembers", adminAuth, getPendingMembers);
adminRouter.patch("/approveMember/:memberId", adminAuth, approveMember);
adminRouter.patch("/rejectMember/:memberId", adminAuth, rejectMember);

//profile api
adminRouter.get("/getAdminProfile", adminAuth, getAdminProfile);

//login api
adminRouter.post("/adminLogin", adminLogin);

//logout api
adminRouter.post("/adminLogout", adminLogout);

export default adminRouter;
