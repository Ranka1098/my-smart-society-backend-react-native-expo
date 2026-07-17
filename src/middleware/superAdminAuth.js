import jwt from "jsonwebtoken";

// ======================================================
// SUPER ADMIN AUTH MIDDLEWARE
// ======================================================
const superAdminAuth = (req, res, next) => {
  try {
    // ======================================================
    // GET AUTH HEADER
    // ======================================================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    // ======================================================
    // VALIDATE BEARER TOKEN FORMAT
    // ======================================================
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // ======================================================
    // EXTRACT TOKEN
    // ======================================================
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    // ======================================================
    // VERIFY TOKEN
    // ======================================================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ======================================================
    // ROLE VALIDATION
    // ======================================================
    if (decoded.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ======================================================
    // REQUIRED PAYLOAD VALIDATION
    // ======================================================
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // ======================================================
    // ATTACH SUPERADMIN DATA TO REQUEST
    // ======================================================
    req.superAdmin = {
      id: decoded.id,
      role: decoded.role,
    };

    // backward compatibility
    req.superAdminId = decoded.id;

    next();
  } catch (error) {
    console.error("SuperAdmin Auth Error:", error.message);

    // ======================================================
    // TOKEN EXPIRED
    // ======================================================
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    // ======================================================
    // INVALID TOKEN
    // ======================================================
    if (error.name === "JsonWebTokenError") {
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
      message: "Authentication failed",
    });
  }
};

export default superAdminAuth;
