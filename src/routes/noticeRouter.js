import express from "express";
import createNotice from "../controller/notice/createNotice.js";
import adminAuth from "../middleware/adminAuth.js";
import getNotice from "../controller/notice/getNotice.js";
import deleteNotice from "../controller/notice/deleteNotice.js";
import memberAuth from "../middleware/memberAuth.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js"
const noticeRouter = express.Router();



noticeRouter.post("/createNotice", adminAuth, checkBuildingSubscription, createNotice);
noticeRouter.get("/admin/getNotice", adminAuth, checkBuildingSubscription, getNotice);
noticeRouter.get("/member/getNotice", memberAuth, checkBuildingSubscription, getNotice);
noticeRouter.delete("/deleteNotice/:id", adminAuth, checkBuildingSubscription, deleteNotice);
export default noticeRouter;
