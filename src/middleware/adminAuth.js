import jwt from "jsonwebtoken";
import adminModel from "../model/admin.js";

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ✅ buildingCode token se aayega
    const admin = await adminModel
      .findOne({ _id: decoded.id, buildingCode: decoded.buildingCode })
      .select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    req.admin = admin;
    req.buildingCode = decoded.buildingCode;

    next();
  } catch (error) {
    console.log("Admin Auth Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default adminAuth;