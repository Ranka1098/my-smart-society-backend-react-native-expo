import jwt from "jsonwebtoken";

// ======================================================
// ADMIN AUTH MIDDLEWARE
// ======================================================
const adminAuthOptimized = (
  req,
  res,
  next
) => {
  try {
    // ======================================================
    // GET AUTH HEADER
    // ======================================================
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization header missing",
      });
    }

    // ======================================================
    // VALIDATE BEARER TOKEN FORMAT
    // ======================================================
    if (
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // ======================================================
    // EXTRACT TOKEN
    // ======================================================
    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    // ======================================================
    // VERIFY TOKEN
    // ======================================================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ======================================================
    // ROLE VALIDATION
    // ======================================================
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ======================================================
    // REQUIRED PAYLOAD VALIDATION
    // ======================================================
    if (
      !decoded.id ||
      !decoded.buildingCode
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token payload",
      });
    }

    // ======================================================
    // ATTACH ADMIN DATA TO REQUEST
    // ======================================================
    req.admin = {
      id: decoded.id,
      buildingCode:
        decoded.buildingCode,
      role: decoded.role,
    };

    // backward compatibility
    req.adminId = decoded.id;
    req.buildingCode =
      decoded.buildingCode;

    next();
  } catch (error) {
    console.error(
      "Admin Auth Error:",
      error.message
    );

    // ======================================================
    // TOKEN EXPIRED
    // ======================================================
    if (
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    // ======================================================
    // INVALID TOKEN
    // ======================================================
    if (
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // ======================================================
    // DEFAULT ERROR
    // ======================================================
    return res.status(401).json({
      success: false,
      message:
        "Authentication failed",
    });
  }
};

export default adminAuthOptimized;