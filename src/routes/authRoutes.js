// =========================
// Code Name: authRoutes.js
// =========================

import express from "express";
import authCheck from "../controller/auth/authCheck.js";
import authMiddleware from "../middleware/authMiddleware.js";
import unifiedLogin from "../controller/All_login/unifiedLogin.js";

const authRouter = express.Router();

authRouter.get("/check", authMiddleware, authCheck);
authRouter.post("/login", unifiedLogin);

export default authRouter;
