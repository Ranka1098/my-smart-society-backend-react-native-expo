import "dotenv/config";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dns from "dns";
import connectDB from "./src/database/connectDB.js";
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

const PORT = process.env.PORT || 1098;
const SOCKET_DEBUG = process.env.SOCKET_DEBUG === "1";

// ── process safety ──
process.on("unhandledRejection", (err) =>
  console.error("UNHANDLED REJECTION:", err),
);
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1); // state kharab ho sakta hai, host restart kar dega
});

// ── init ──
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
  ),
});
dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();

const app = express();
const server = createServer(app);

// proxy (Render) ke idle timeout se bada
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 30000, // mobile network pe jaldi disconnect na ho
});

app.set("io", io); // controllers: req.app.get("io")
checkSubscriptionExpiry(io);

// ── middleware ──
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/api/webhook", webhookRouter); // raw body chahiye, express.json se PEHLE
app.use(express.json());

// ── health ──
app.get("/test", (req, res) =>
  res.json({ success: true, message: "Server working fine" }),
);
app.get("/api", (req, res) =>
  res.status(200).json({ success: true, message: "API is working fine 🚀" }),
);
app.get("/serverTime", (req, res) => res.json({ serverTime: Date.now() }));

// ── socket rooms ──
// event → room name. Room = group, ek emit se poore group ko message.
const ROOMS = {
  join_building: (v) => v,
  join_admin: (v) => `admin_${v}`,
  join_staff: (v) => `staff_${v}`,
  join_member: (v) => `member_${v}`,
  join_member_building: (v) => `members_${v}`,
  join_guard: (v) => `guard_${v}`,
  // guard building room: pre-approved wale guard_${buildingCode} emits yahin aate
  join_guard_building: (v) => `guard_${v}`,
};

const validId = (v) => typeof v === "string" && v.length > 0 && v.length <= 64;

io.on("connection", (socket) => {
  for (const [event, roomOf] of Object.entries(ROOMS)) {
    socket.on(event, (value) => {
      if (!validId(value)) return;
      socket.join(roomOf(value)); // idempotent
      if (SOCKET_DEBUG) console.log(`[SOCKET] ${socket.id} ${event}: ${value}`);
    });
  }

  socket.on("join_superadmin", () => socket.join("superadmin"));

  socket.on("leave_all_rooms", () => {
    for (const room of [...socket.rooms]) {
      if (room !== socket.id) socket.leave(room);
    }
  });

  socket.on("disconnect", (reason) => {
    if (SOCKET_DEBUG)
      console.log(`[SOCKET] ${socket.id} disconnected: ${reason}`);
  });
});

// ── routes (order same) ──
[
  adminRouter,
  authRouter,
  memberRouter,
  vendorRouter,
  expenseRouter,
  maintenanceRouter,
  meetingRouter,
  noticeRouter,
  staffRouter,
  complaintRouter,
  notifcationRouter,
  visitorRouter,
  guestRouter,
  superAdminRouter,
  workerRouter,
  paymentRouter,
].forEach((router) => app.use("/", router));

// ── start ──
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// ── graceful shutdown (deploy pe SIGTERM) ──
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  io.close(() => process.exit(0)); // sockets + http server band
  setTimeout(() => process.exit(1), 10000).unref(); // atka to force
};
["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));
