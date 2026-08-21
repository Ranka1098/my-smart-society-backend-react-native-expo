import express from "express";
import webhookHandler from "../controller/rozarpay_payment/webhookHandler.js";

const webhookRouter = express.Router();
webhookRouter.post("/razorpay", express.raw({ type: "application/json" }), webhookHandler);

export default webhookRouter;