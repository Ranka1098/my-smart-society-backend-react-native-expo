import express from "express";
import createExpense from "../controller/expense/createExpense.js";
import upload from "../cloudinary/multerConfig.js";
import adminAuth from "../middleware/adminAuth.js"
import getExpense from "../controller/expense/getExpense.js";
const expenseRouter = express.Router();

expenseRouter.post("/createExpense", upload.single("billProof"),adminAuth, createExpense);

expenseRouter.get("/admin/getExpense",adminAuth,getExpense)

export default expenseRouter;
