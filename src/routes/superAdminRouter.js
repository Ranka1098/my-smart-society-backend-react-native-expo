import express from "express";
import superAdminLoginStep1 from "../controller/superAdmin/superAdminLoginStep1.js";
import superAdminLoginStep2 from "../controller/superAdmin/superAdminLoginStep2.js";
import superAdminResendOtp from "../controller/superAdmin/superAdminResendOtp.js";
import superAdminLogout from "../controller/superAdmin/superAdminLogout.js";
import superAdminAuth from "../middleware/superAdminAuth.js";
import superAdminSaveFcmToken from "../fcmToken/superAdminSaveFcmToken.js";
import superAdminRemoveFcmToken from "../fcmToken/superAdminRemoveFcmToken.js";
import getAllBuildings from "../controller/superAdmin/building/getAllBuildings.js";
import getActiveBuildings from "../controller/superAdmin/building/getActiveBuildings.js";
import getBlockedBuildings from "../controller/superAdmin/building/getBlockedBuildings.js";
import getExpiredBuildings from "../controller/superAdmin/building/getExpiredBuildings.js";
import getSuperAdminDashboard from "../controller/superAdmin/building/getSuperAdminDashboard.js";
const superAdminRouter = express.Router();

superAdminRouter.post("/superAdminLoginStep1", superAdminLoginStep1);
superAdminRouter.post("/superAdminLoginStep2", superAdminLoginStep2);
superAdminRouter.post("/superAdminResendOtp", superAdminResendOtp);
superAdminRouter.post("/superAdminLogout", superAdminAuth, superAdminLogout);
superAdminRouter.get("/getSuperAdminDashboard", superAdminAuth, getSuperAdminDashboard);

superAdminRouter.get(
  "/superAdmin/buildings/all",
  superAdminAuth,
  getAllBuildings
);
superAdminRouter.get(
  "/superAdmin/buildings/active",
  superAdminAuth,
  getActiveBuildings
);
superAdminRouter.get(
  "/superAdmin/buildings/blocked",
  superAdminAuth,
  getBlockedBuildings
);
superAdminRouter.get(
  "/superAdmin/buildings/expired",
  superAdminAuth,
  getExpiredBuildings
);

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
