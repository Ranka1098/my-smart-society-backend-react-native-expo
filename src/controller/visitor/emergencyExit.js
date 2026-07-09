import Visitor from "../../model/Visitor.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";

const emergencyExit = async (req, res) => {
  try {
    const { buildingCode, flatNo } = req.body;
    const guardId = req.staff._id;

    if (!buildingCode || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur flatNo required" });
    }

    let exitPhotoUrl = null;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image")) {
        return res
          .status(400)
          .json({ success: false, message: "Only image files allowed" });
      }
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(
        compressed,
        "visitorExitPhotos"
      );
      exitPhotoUrl = uploaded.secure_url;
    }

    if (!exitPhotoUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Exit photo required" });
    }

    const now = new Date();

    // ── Direct entry+exit record — no FCM/approval flow ──
    const visitor = await Visitor.create({
      buildingCode,
      purpose: "Other",
      flatNo,
      guardId,
      status: "Exited",
      verificationMethod: "ForcedEntry",
      isEmergencyExit: true,
      exitPhotoUrl,
      entryTime: now,
      exitTime: now,
    });

    return res.status(201).json({
      success: true,
      message: "Emergency exit logged",
      data: visitor,
    });
  } catch (error) {
    console.error("emergencyExit error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default emergencyExit;
