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
import getAllMembers from "../controller/admin/memberInfo/getAllMembers.js";
import getMemberDetail from "../controller/admin/memberInfo/getMemberDetail.js";
import getMemberFullDetails from "../controller/admin/memberInfo/getMemberDetail.js";
import getDashboardStats from "../controller/admin/dashbaordStat/getDashboardStats.js";
import member from "../model/member.js";
import adminSaveFcmToken from "../fcmToken/adminSaveFcmToken.js";
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

//member detail
adminRouter.get("/getAllMembers", adminAuth, getAllMembers);
adminRouter.get("/getMemberFullDetails/:id", adminAuth, getMemberFullDetails);
//login api
adminRouter.post("/adminLogin", adminLogin);

//logout api
adminRouter.post("/adminLogout", adminLogout);

//getDashboardStats
adminRouter.get("/getDashboardStats", adminAuth, getDashboardStats);

adminRouter.post("/adminSaveFcmToken", adminAuth, adminSaveFcmToken);

export default adminRouter;
