import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
import visitorRouter from "./src/routes/visitorRouter.js";
import guestRouter from "./src/routes/guestRouter.js";
import superAdminRouter from "./src/routes/superAdminRouter.js";
import workerRouter from "./src/routes/workerRouter.js";
import paymentRouter from "./src/routes/paymentRouter.js";
import webhookRouter from "./src/routes/webhookRouter.js";
import checkSubscriptionExpiry from "./src/cron/checkSubscriptionExpiry.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();

const app = express();
const server = createServer(app);

// new server se socket create karte hai
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

checkSubscriptionExpiry(io);

// io use karke jo socket banaya tha usko controler se kahi bhi use kar sakte hai
app.set("io", io);

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/webhook", webhookRouter);


app.use(express.json());

// Routes
app.get("/test", (req, res) =>
  res.json({ success: true, message: "Server working fine" })
);
app.get("/api", (req, res) =>
  res.status(200).json({ success: true, message: "API is working fine 🚀" })
);

io.on("connection", (socket) => {
  socket.on("leave_all_rooms", () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.leave(r));
    console.log(`Socket ${socket.id} left previous rooms:`, rooms);
  });

  socket.on("join_building", (buildingCode) => {
    socket.join(buildingCode);
    console.log(`Socket ${socket.id} joined building: ${buildingCode}`);
  });
  // Jab koi naya phone (app) connect hota hai (member app khulta hai), ye function fire hota hai automatically.
  // socket = us specific user ka individual phone line. Ek user = ek socket.
  //Socket abc123xyz disconnected   // (ya connection wala log agar likhte)

  socket.on("join_admin", (buildingCode) => {
    socket.join(`admin_${buildingCode}`);
  });

  socket.on("join_staff", (buildingCode) => {
    socket.join(`staff_${buildingCode}`);
  });

  socket.on("join_member", (memberId) => {
    console.log(`✅ Member joined room: member_${memberId}`); // ADD
    socket.join(`member_${memberId}`);
  });

  socket.on("join_member_building", (buildingCode) => {
    socket.join(`members_${buildingCode}`);
    console.log(`✅ Member joined building room: members_${buildingCode}`);
  });
  // Rooms — sabse important part
  // Socket.IO me "room" = ek group jisme multiple sockets ko daal sakte ho, phir us pure group ko ek saath message bhej sakte ho.

  socket.on("join_guard", (guardId) => {
    socket.join(`guard_${guardId}`);
    console.log(`Guard ${guardId} joined room`);
  });

  // ✅ NEW: guard apne building room me bhi join kare, taki
  // createPreApproved.js ka guard_${buildingCode} emit usko mile
  socket.on("join_guard_building", (buildingCode) => {
    socket.join(`guard_${buildingCode}`);
    console.log(`Guard joined building room: guard_${buildingCode}`);
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
app.use("/", visitorRouter);
app.use("/", guestRouter);
app.use("/", superAdminRouter);
app.use("/", workerRouter);
app.use("/", paymentRouter);
const PORT = process.env.PORT || 1098;

// app.listen → server.listen
server.listen(PORT, "0.0.0.0", () => {
  console.log("database connected successfully");
  console.log(`Server running on port ${PORT}`);
});
