// seedSuperAdmin.js
import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import SuperAdmin from "../../model/superAdmin.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGOURL);

    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    const secretKey = process.env.SUPERADMIN_SECRET_KEY;

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecretKey = await bcrypt.hash(secretKey, 10);

    const existing = await SuperAdmin.findOne({ email: email.toLowerCase() });

    if (existing) {
      existing.password = hashedPassword;
      existing.secretKey = hashedSecretKey;
      existing.role = "superadmin"; // ← add karo
      await existing.save();
      console.log("SuperAdmin updated ✅:", email);
    } else {
      await SuperAdmin.create({
        name: "Ashok",
        email: email.toLowerCase(),
        password: hashedPassword,
        secretKey: hashedSecretKey,
        role: "superadmin", // ← add karo
      });
      console.log("SuperAdmin created ✅:", email);
    }

    process.exit(0);
  } catch (err) {
    console.log("Seed error:", err);
    process.exit(1);
  }
};

seedSuperAdmin();
