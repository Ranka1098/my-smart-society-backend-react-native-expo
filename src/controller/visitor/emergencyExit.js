import Visitor from "../../model/Visitor.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import memberModel from "../../model/member.js";
import { notifyWorkerToMembers } from "../../controller/notifcation/notifyMembers.js";

const emergencyExit = async (req, res) => {
  try {
    const { buildingCode, flatNo, memberType } = req.body; // ✅ FIX — memberType accept karo

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

    const visitor = await Visitor.create({
      buildingCode,
      name: "Emergency Exit",
      purpose: "Other",
      flatNo,
      memberType: memberType === "Shop" ? "Shop" : "Flat", // ✅ FIX — store karo
      guardId,
      status: "Exited",
      verificationMethod: "ForcedEntry",
      isEmergencyExit: true,
      exitPhotoUrl,
      entryTime: now,
      exitTime: now,
    });

    // ══════════════════════════════════════════════
    // FLAT/SHOP MEMBERS KO NOTIFY KARO
    // ══════════════════════════════════════════════
    const io = req.app.get("io");
    const members = await memberModel
      .find({
        buildingCode,
        unitNo: flatNo,
        ...(memberType === "Shop" ? { memberType: "Shop" } : {}), // ✅ FIX — shop hi filter ho shop query me
      })
      .select("_id fcmToken");

    let flatMatched = true;

    if (members.length) {
      await notifyWorkerToMembers({
        io,
        buildingCode,
        type: "EMERGENCY_EXIT",
        title: "Emergency Exit Logged",
        message: `Guard ne ${
          memberType === "Shop" ? "Shop" : "Flat"
        } ${flatNo} ke liye emergency exit record kiya hai.`, // ✅ FIX — Shop/Flat sahi bole
        referenceId: visitor._id,
        referenceModel: "Visitor",
        data: {
          visitorId: visitor._id.toString(),
          flatNo,
          memberType: memberType === "Shop" ? "Shop" : "Flat", // ✅ FIX
          exitTime: visitor.exitTime,
          exitPhotoUrl,
        },
        members,
      });
    } else {
      flatMatched = false;
    }

    return res.status(201).json({
      success: true,
      message: "Emergency exit logged",
      data: visitor,
      flatMatched,
    });
  } catch (error) {
    console.error("emergencyExit error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default emergencyExit;
