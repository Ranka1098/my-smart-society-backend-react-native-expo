import express from "express";
import createOrder from "../controller/rozarpay_payment/createOrder.js";
import verifyPayment from "../controller/rozarpay_payment/verifyPayment.js";
const paymentRouter = express.Router();

paymentRouter.post("/createOrder", createOrder);
paymentRouter.post("/verifyPayment", verifyPayment);


export default paymentRouter;
