// =========================
// Code Name: authRoutes.js
// =========================

import express from "express";
import authCheck from "../controller/auth/authCheck.js";
import authMiddleware from "../middleware/authMiddleware.js";
import unifiedLogin from "../controller/All_login/unifiedLogin.js";
import { forgetPassword } from "../controller/auth/forgetPassword.js";
import { resetPassword } from "../controller/auth/resetPassword.js";

const authRouter = express.Router();

authRouter.get("/check", authMiddleware, authCheck);
authRouter.post("/login", unifiedLogin);
authRouter.post("/forgetPassword", forgetPassword);
authRouter.post("/resetPassword", resetPassword);

export default authRouter;
