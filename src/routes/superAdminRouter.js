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
import getBuildingFullDetail from "../controller/superAdmin/building/getBuildingFullDetail.js";
import renewSubscription from "../controller/superAdmin/subscription/renewSubscription.js";
import getBuildingByCode from "../controller/superAdmin/subscription/getBuildingByCode.js";
import toggleBuildingStatus from "../controller/superAdmin/building/toggleBuildingStatus.js";
import getSubscriptionPlans from "../controller/superAdmin/subscription/getSubscriptionPlans.js";
import setDummyExpiry from "../controller/superAdmin/subscription/setDummyExpiry.js";
const superAdminRouter = express.Router();

superAdminRouter.post("/superAdminLoginStep1", superAdminLoginStep1);
superAdminRouter.post("/superAdminLoginStep2", superAdminLoginStep2);
superAdminRouter.post("/superAdminResendOtp", superAdminResendOtp);
superAdminRouter.post("/superAdminLogout", superAdminAuth, superAdminLogout);
superAdminRouter.get(
  "/getSuperAdminDashboard",
  superAdminAuth,
  getSuperAdminDashboard
);
superAdminRouter.get(
  "/getBuildingFullDetail/:id",
  superAdminAuth,
  getBuildingFullDetail
);

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

superAdminRouter.patch(
  "/superAdmin/buildings/:id/toggle-status",
  superAdminAuth,
  toggleBuildingStatus
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

superAdminRouter.patch(
  "/renewSubscription/:id",
  superAdminAuth,
  renewSubscription
);

superAdminRouter.get(
  "/getBuildingByCode/:code",
  superAdminAuth,
  getBuildingByCode
);

superAdminRouter.get("/subscriptionPlans", superAdminAuth, getSubscriptionPlans);

superAdminRouter.patch("/superAdmin/buildings/:buildingId/dummy-expiry", superAdminAuth, setDummyExpiry);

export default superAdminRouter;
