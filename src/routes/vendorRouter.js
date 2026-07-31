import express from "express";

import adminAuth from "../middleware/adminAuth.js";

import createVendor from "../controller/vendor/createVendor.js";
import createVendorExpense from "../controller/vendor/createVendorExpense.js";
import getAllVendors from "../controller/vendor/getAllVendors.js";
import getAllVendorExpenses from "../controller/vendor/getAllVendorExpenses.js";
import VendorExpense from "../model/VendorExpense.js";
import { deleteVendor } from "../controller/vendor/deleteVendor.js";
import deleteVendorExpense from "../controller/vendor/deleteVendorExpense.js";
import memberAuth from "../middleware/memberAuth.js";
import upload from "../cloudinary/multerConfig.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const vendorRouter = express.Router();

// ======================================================
// VENDOR ROUTES
// ======================================================

vendorRouter.post(
  "/createVendor",
  adminAuth,
  checkBuildingSubscription,
  createVendor
);
vendorRouter.get(
  "/getAllVendors",
  adminAuth,
  checkBuildingSubscription,
  getAllVendors
);
vendorRouter.post(
  "/createVendorExpense",
  upload.single("photo"),
  adminAuth,
  checkBuildingSubscription,
  createVendorExpense
);
vendorRouter.get(
  "/admin/getAllVendorExpense",
  adminAuth,
  checkBuildingSubscription,
  getAllVendorExpenses
);
vendorRouter.get(
  "/member/getAllVendorExpense",
  memberAuth,
  checkBuildingSubscription,
  getAllVendorExpenses
);
vendorRouter.post(
  "/deleteVendor",
  adminAuth,
  checkBuildingSubscription,
  deleteVendor
);
vendorRouter.post(
  "/deleteVendorExpense",
  adminAuth,
  checkBuildingSubscription,
  deleteVendorExpense
);

export default vendorRouter;
