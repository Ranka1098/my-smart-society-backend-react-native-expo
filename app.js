import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./src/database/connectDB.js";
import dns from "dns";
import adminRouter from "./src/routes/adminRouter.js";
import authRouter from "./src/routes/authRoutes.js";
import memberRouter from "./src/routes/memberRouter.js"

dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();

const app = express();

// middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// test route
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Server working fine" });
});
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working fine 🚀",
  });
});
app.use("/", adminRouter);
app.use("/", authRouter);
app.use("/",memberRouter)
const PORT = process.env.PORT || 1098;

app.listen(PORT, "0.0.0.0", () => {
  console.log("database connected successfully");
  console.log(`Server running on port ${PORT}`);
});
