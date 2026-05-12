// =========================
// Code Name: authRoutes.js
// =========================

import express from "express";
import authCheck from "../controller/auth/authCheck.js";
import authMiddleware from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.get("/check", authMiddleware, authCheck);

export default authRouter;