import express from "express";
import superAdminLoginStep1 from "../controller/superAdmin/superAdminLoginStep1.js";
import superAdminLoginStep2 from "../controller/superAdmin/superAdminLoginStep2.js";
import superAdminResendOtp from "../controller/superAdmin/superAdminResendOtp.js";
import superAdminLogout from "../controller/superAdmin/superAdminLogout.js";
import superAdminAuth from "../middleware/superAdminAuth.js";
import superAdminSaveFcmToken from "../fcmToken/superAdminSaveFcmToken.js";
import superAdminRemoveFcmToken from "../fcmToken/superAdminRemoveFcmToken.js";
const superAdminRouter = express.Router();

superAdminRouter.post("/superAdminLoginStep1", superAdminLoginStep1);
superAdminRouter.post("/superAdminLoginStep2", superAdminLoginStep2);
superAdminRouter.post("/superAdminResendOtp", superAdminResendOtp);
superAdminRouter.post("/superAdminLogout", superAdminAuth, superAdminLogout);
superAdminRouter.post(
  "/superAdminSaveFcmToken",
  superAdminAuth,
  superAdminSaveFcmToken
);
superAdminRouter.post(
  "/superAdminRemoveFcmToken",
  superAdminAuth,
  superAdminRemoveFcmToken
);

export default superAdminRouter;
