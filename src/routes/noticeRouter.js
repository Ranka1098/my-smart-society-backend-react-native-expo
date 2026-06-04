import express from "express";
import createNotice from "../controller/notice/createNotice.js";
import adminAuth from "../middleware/adminAuth.js";
import getNotice from "../controller/notice/getNotice.js";
import deleteNotice from "../controller/notice/deleteNotice.js";
import memberAuth from "../middleware/memberAuth.js";
const noticeRouter = express.Router();

noticeRouter.post("/createNotice", adminAuth, createNotice);
noticeRouter.get("/admin/getNotice", adminAuth, getNotice);
noticeRouter.get("/member/getNotice", memberAuth, getNotice);
noticeRouter.delete("/deleteNotice/:id", adminAuth, deleteNotice);
export default noticeRouter;
