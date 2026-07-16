import express from "express";
import superAdminLoginStep1 from "../controller/superAdmin/superAdminLoginStep1.js";
import superAdminLoginStep2 from "../controller/superAdmin/superAdminLoginStep2.js";

const superAdminRouter = express.Router();

superAdminRouter.post("/superAdminLoginStep1", superAdminLoginStep1);
superAdminRouter.post("/superAdminLoginStep2", superAdminLoginStep2);

export default superAdminRouter;
