import express from "express";
import createMaintenance from "../controller/maintenance/createMaintenance.js";
import adminAuth from "../middleware/adminAuth.js";
import getMaintenanceByMonth from "../controller/maintenance/getMaintenanceByMonth.js";
import getAllMemberMaintenancePaymentDetail from "../controller/maintenance/getAllMemberMaintenancePaymentDetail.js";

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
  "/getAllMemberMaintenancePaymentDetail",
  adminAuth,
  getAllMemberMaintenancePaymentDetail
);
export default maintenanceRouter;
