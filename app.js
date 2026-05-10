import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./src/database/connectDB.js";
import dns from "dns";
import adminRouter from "./src/routes/adminRouter.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.use("/api/admin", adminRouter);

const PORT = process.env.PORT || 1098;

app.listen(PORT, () => {
  console.log("database connected successfully");
  console.log(`Server running on port ${PORT}`);
});
