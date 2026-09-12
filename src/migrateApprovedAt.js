import mongoose from "mongoose";
import dotenv from "dotenv";
import Member from "./model/member.js";
import dns from "dns";
dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);
const run = async () => {
  await mongoose.connect(process.env.MONGOURL);

  const result = await Member.updateMany(
    { approvalStatus: "Approved", approvedAt: null },
    [{ $set: { approvedAt: "$createdAt" } }],
    { updatePipeline: true }
  );

  console.log("Migrated:", result.modifiedCount, "members");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});