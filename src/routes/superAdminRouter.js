import express from "express";
import superAdminLoginStep1 from "../controller/superAdmin/superAdminLoginStep1.js";
import superAdminLoginStep2 from "../controller/superAdmin/superAdminLoginStep2.js";
import superAdminResendOtp from "../controller/superAdmin/superAdminResendOtp.js";
import superAdminLogout from "../controller/superAdmin/superAdminLogout.js";
import superAdminAuth from "../middleware/superAdminAuth.js";
import AdminAuth from "../middleware/adminAuth.js";
import superAdminSaveFcmToken from "../fcmToken/superAdminSaveFcmToken.js";
import superAdminRemoveFcmToken from "../fcmToken/superAdminRemoveFcmToken.js";
import getAllBuildings from "../controller/superAdmin/building/getAllBuildings.js";
import getActiveBuildings from "../controller/superAdmin/building/getActiveBuildings.js";
import getBlockedBuildings from "../controller/superAdmin/building/getBlockedBuildings.js";
import getExpiredBuildings from "../controller/superAdmin/building/getExpiredBuildings.js";
import getSuperAdminDashboard from "../controller/superAdmin/building/getSuperAdminDashboard.js";
import getBuildingFullDetail from "../controller/superAdmin/building/getBuildingFullDetail.js";
import toggleBuildingStatus from "../controller/superAdmin/building/toggleBuildingStatus.js";
import getBuildingByCode from "../controller/superAdmin/subscription/getBuildingByCode.js";

// ✅ naya clean subscription system
import { superAdminRenewSubscription } from "../controller/superAdmin/subscription/superAdminRenewSubscription.js";
import { getSubscriptionHistory } from "../controller/superAdmin/subscription/getSubscriptionHistory.js";
import { dummyExpiryTest } from "../controller/superAdmin/subscription/dummyExpiryTest.js";
import { getRenewalPreview } from "../controller/superAdmin/subscription/getRenewalPreview.js";
import { getPublicRenewalPreview } from "../controller/superAdmin/subscription/getPublicRenewalPreview.js";

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

// ✅ Path 1 — superadmin manual renewal (cash/manual/upi offline collected)
superAdminRouter.post(
  "/superAdmin/buildings/:buildingId/renew",
  superAdminAuth,
  superAdminRenewSubscription
);

// ✅ superadmin kisi bhi building ka history dekh sakta
superAdminRouter.get(
  "/superAdmin/buildings/:buildingCode/subscription-history",
  superAdminAuth,
  getSubscriptionHistory
);

superAdminRouter.get(
  "/admin/buildings/:buildingCode/subscription-history",
  AdminAuth,
  getSubscriptionHistory
);

superAdminRouter.get(
  "/superAdmin/getBuildingByCode/:code",
  superAdminAuth,
  getBuildingByCode
);

superAdminRouter.patch(
  "/superAdmin/buildings/:buildingId/dummy-expiry",
  superAdminAuth,
  dummyExpiryTest
);

superAdminRouter.get(
  "/superAdmin/buildings/:buildingId/renewal-preview",
  superAdminAuth,
  getRenewalPreview
);

// route — auth middleware LAGANA MAT
superAdminRouter.get(
  "/public/renewal-preview/:buildingCode",
  getPublicRenewalPreview
);
export default superAdminRouter;
