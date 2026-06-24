// staffAuth.js
import jwt from "jsonwebtoken";
import staffModel from "../model/staff.js"; // ya jo bhi model hai

const staffAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "security") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const staff = await staffModel.findById(decoded.id).select("-password");

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    req.staff = staff;
    req.buildingCode = decoded.buildingCode;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default staffAuth;
