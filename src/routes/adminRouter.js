import express from "express";
import adminRegister from "../controller/admin/registration/adminRegister.js";
import verifyAdminOtp from "../controller/admin/registration/verifyAdminOtp.js";
import resendAdminOtp from "../controller/admin/registration/resendAdminOtp.js";
import adminLogin from "../controller/admin/login-logout/adminLogin.js"
import adminLogout from "../controller/admin/login-logout/adminLogout.js"
const adminRouter = express.Router();

//registration api
adminRouter.post("/adminRegister", adminRegister);
adminRouter.post("/verifyOtp", verifyAdminOtp);
adminRouter.post("/resendOtp", resendAdminOtp);

//login api
adminRouter.post("/adminLogin", adminLogin);

//logout api
adminRouter.post("/adminLogout", adminLogout);


export default adminRouter;
 