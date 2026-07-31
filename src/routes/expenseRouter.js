import express from "express";
import createExpense from "../controller/expense/createExpense.js";
import upload from "../cloudinary/multerConfig.js";
import adminAuth from "../middleware/adminAuth.js";
import getExpense from "../controller/expense/getExpense.js";
import memberAuth from "../middleware/memberAuth.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";
const expenseRouter = express.Router();

expenseRouter.post(
  "/createExpense",
  upload.single("billProof"),
  adminAuth,
  checkBuildingSubscription,
  createExpense
);
expenseRouter.get(
  "/admin/getExpense",
  adminAuth,
  checkBuildingSubscription,
  getExpense
);
expenseRouter.get(
  "/member/getExpense",
  memberAuth,
  checkBuildingSubscription,
  getExpense
);

export default expenseRouter;
