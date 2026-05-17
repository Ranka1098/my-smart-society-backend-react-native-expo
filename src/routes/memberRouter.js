import express from "express";
import memberRegister from "../controller/member/registration/memberRegister.js";
import verifyMemberOtp from "../controller/member/registration/verifyMemberOtp.js";
import resendMemberOtp from "../controller/member/registration/resendMemberOtp.js";
import memberLogin from "../controller/member/login-logout/memberLogin.js";
import memberAuth from "../middleware/memberAuth.js";
import getMemberProfile from "../controller/member/registration/getMemberProfile.js";
import memberLogout from "../controller/member/login-logout/memberLogout.js";
const memberRouter = express.Router();

//registration
memberRouter.post("/memberRegister", memberRegister);
memberRouter.post("/verifyMemberOtp", verifyMemberOtp);
memberRouter.post("/resendMemberOtp", resendMemberOtp);
memberRouter.get("/getMemberProfile", memberAuth, getMemberProfile);

//login
memberRouter.post("/memberLogin", memberLogin);
memberRouter.post("/memberLogout", memberLogout);

export default memberRouter;
