import express from "express";
import createMaintenance from "../controller/maintenance/createMaintenance.js";
import adminAuth from "../middleware/adminAuth.js";
import memberAuth from "../middleware/memberAuth.js";
import getMaintenanceByMonth from "../controller/maintenance/getMaintenanceByMonth.js";
import getAllMemberMaintenancePaymentDetail from "../controller/maintenance/getAllMemberMaintenancePaymentDetail.js";
import addMemberMaintenancePayment from "../controller/maintenance/addMemberMaintenancePayment.js";
import getPendingMaintenance from "../controller/maintenance/getPendingMaintenance.js";
import downloadMaintenaceBill from "../controller/maintenance/downloadMaintenaceBill.js";
import singleMemberMaintenanceDetail from "../controller/maintenance/getMemberMaintenanceHistory.js";
import getMemberMaintenanceHistory from "../controller/maintenance/getMemberMaintenanceHistory.js";
import deleteMaintenanceByMonth from "../controller/maintenance/deleteMaintenanceByMonth.js";
import sendReminder from "../controller/maintenance/sendReminder.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const maintenanceRouter = express.Router();

maintenanceRouter.post(
  "/createMaintenanceByMonth",
  adminAuth,
  checkBuildingSubscription,
  createMaintenance
);
maintenanceRouter.get(
  "/getMaintenanceByMonth",
  adminAuth,
  checkBuildingSubscription,
  getMaintenanceByMonth
);
maintenanceRouter.get(
  "/admin/getAllMemberMaintenancePaymentDetail",
  adminAuth,
  checkBuildingSubscription,
  getAllMemberMaintenancePaymentDetail
);
maintenanceRouter.get(
  "/member/getAllMemberMaintenancePaymentDetail",
  memberAuth,
  checkBuildingSubscription,
  getAllMemberMaintenancePaymentDetail
);
maintenanceRouter.post(
  "/addMemberMaintenancePayment",
  adminAuth,
  checkBuildingSubscription,
  addMemberMaintenancePayment
);

maintenanceRouter.get(
  "/getPendingMaintenance",
  adminAuth,
  checkBuildingSubscription,
  getPendingMaintenance
);

// POST for bill download (body me paymentIds array)
maintenanceRouter.post(
  "/downloadMaintenaceBill",
  adminAuth,
  checkBuildingSubscription,
  downloadMaintenaceBill
);

maintenanceRouter.delete(
  "/maintenanceDeleted/:month",
  adminAuth,
  checkBuildingSubscription,
  deleteMaintenanceByMonth
);

maintenanceRouter.get(
  "/getMemberMaintenanceHistory",
  memberAuth,
  checkBuildingSubscription,
  getMemberMaintenanceHistory
);

maintenanceRouter.post(
  "/sendMaintenanceReminder",
  adminAuth,
  checkBuildingSubscription,
  sendReminder
);

export default maintenanceRouter;
