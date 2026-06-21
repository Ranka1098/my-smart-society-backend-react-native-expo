import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./src/database/connectDB.js";
import dns from "dns";
import adminRouter from "./src/routes/adminRouter.js";
import authRouter from "./src/routes/authRoutes.js";
import memberRouter from "./src/routes/memberRouter.js";
import vendorRouter from "./src/routes/vendorRouter.js";
import expenseRouter from "./src/routes/expenseRouter.js";
import maintenanceRouter from "./src/routes/maintenanceRouter.js";
import meetingRouter from "./src/routes/meetingRouter.js";
import noticeRouter from "./src/routes/noticeRouter.js";
import staffRouter from "./src/routes/staffRouter.js";
import complaintRouter from "./src/routes/complaintRouter.js";
import notifcationRouter from "./src/routes/notifcationRouter.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// io globally accessible in controllers
app.set("io", io);

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes
app.get("/test", (req, res) =>
  res.json({ success: true, message: "Server working fine" })
);
app.get("/api", (req, res) =>
  res.status(200).json({ success: true, message: "API is working fine 🚀" })
);

io.on("connection", (socket) => {
  socket.on("join_building", (buildingCode) => {
    socket.join(buildingCode);
    console.log(`Socket ${socket.id} joined building: ${buildingCode}`);
  });

  socket.on("join_admin", (buildingCode) => {
    socket.join(`admin_${buildingCode}`);
  });

  socket.on("join_staff", (buildingCode) => {
    socket.join(`staff_${buildingCode}`);
  });

  socket.on("join_member", (memberId) => {
    socket.join(`member_${memberId}`);
  });

  socket.on("join_superadmin", () => {
    socket.join("superadmin");
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
});

app.use("/", adminRouter);
app.use("/", authRouter);
app.use("/", memberRouter);
app.use("/", vendorRouter);
app.use("/", expenseRouter);
app.use("/", maintenanceRouter);
app.use("/", meetingRouter);
app.use("/", noticeRouter);
app.use("/", staffRouter);
app.use("/", complaintRouter);
app.use("/", notifcationRouter);

const PORT = process.env.PORT || 1098;

// app.listen → server.listen
server.listen(PORT, "0.0.0.0", () => {
  console.log("database connected successfully");
  console.log(`Server running on port ${PORT}`);
});
