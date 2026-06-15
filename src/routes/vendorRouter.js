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
const vendorRouter = express.Router();

// ======================================================
// VENDOR ROUTES
// ======================================================

// CREATE VENDOR
vendorRouter.post("/createVendor", adminAuth, createVendor);
//get all vendor list
vendorRouter.get("/getAllVendors", adminAuth, getAllVendors);

// CREATE VENDOR EXPENSE
vendorRouter.post(
  "/createVendorExpense",
  upload.single("photo"),
  adminAuth,
  createVendorExpense
);
//get all vendor expense
vendorRouter.get("/admin/getAllVendorExpense", adminAuth, getAllVendorExpenses);
vendorRouter.get(
  "/member/getAllVendorExpense",
  memberAuth,
  getAllVendorExpenses
);

//delete vendor
vendorRouter.post("/deleteVendor", adminAuth, deleteVendor);
//delete vendor expense
vendorRouter.post("/deleteVendorExpense", adminAuth, deleteVendorExpense);

export default vendorRouter;
