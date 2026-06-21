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

const maintenanceRouter = express.Router();

maintenanceRouter.post(
  "/createMaintenanceByMonth",
  adminAuth,
  createMaintenance
);
maintenanceRouter.post(
  "/getMaintenanceByMonth",
  adminAuth,
  getMaintenanceByMonth
);
maintenanceRouter.get(
  "/admin/getAllMemberMaintenancePaymentDetail",
  adminAuth,
  getAllMemberMaintenancePaymentDetail
);
maintenanceRouter.get(
  "/member/getAllMemberMaintenancePaymentDetail",
  memberAuth,
  getAllMemberMaintenancePaymentDetail
);
maintenanceRouter.post(
  "/addMemberMaintenancePayment",
  adminAuth, // ✅ buildingCode verify here
  addMemberMaintenancePayment
);

maintenanceRouter.get(
  "/getPendingMaintenance",
  adminAuth,
  getPendingMaintenance
);

// POST for bill download (body me paymentIds array)
maintenanceRouter.post(
  "/downloadMaintenaceBill",
  adminAuth,
  downloadMaintenaceBill
);

maintenanceRouter.delete(
  "/maintenanceDeleted/:month",
  adminAuth,
  deleteMaintenanceByMonth
);

maintenanceRouter.get(
  "/getMemberMaintenanceHistory",
  memberAuth,
  getMemberMaintenanceHistory
);

maintenanceRouter.post("/sendMaintenanceReminder", adminAuth, sendReminder);

export default maintenanceRouter;
