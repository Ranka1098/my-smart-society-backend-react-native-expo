// controller/workerController.js
import WorkerProfile from "../../model/WorkerProfile.js";
import Admin from "../../model/admin.js";
import Member from "../../model/member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import { notifyWorkerToAdmin } from "../notifcation/notifyMembers.js";

const createWorkerPendingRequest = async (req, res) => {
  try {
    const { name, mobile, workerType, category, flatNo } = req.body;
    const buildingCode = req.buildingCode;

    if (!buildingCode) {
      return res
        .status(401)
        .json({ success: false, message: "buildingCode missing in token" });
    }
    if (!name || !mobile || !workerType || !category) {
      return res
        .status(400)
        .json({ success: false, message: "Sab fields required" });
    }
    if (!["SocietyStaff", "FlatStaff"].includes(workerType)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid workerType" });
    }
    if (workerType === "FlatStaff" && !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "FlatStaff ke liye flatNo required" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Photo required" });
    }
    if (!req.file.mimetype.startsWith("image")) {
      return res
        .status(400)
        .json({ success: false, message: "Only image files allowed" });
    }

    // ── Cloudinary upload (visitor wala pattern) ──
    const compressed = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const uploaded = await uploadToCloudinary(compressed, "workerPhotos");
    const photoUrl = uploaded.secure_url;

    let worker = await WorkerProfile.findOne({ buildingCode, mobile });

    if (worker) {
      if (worker.status === "Approved") {
        return res.status(400).json({
          success: false,
          message: "Ye worker already approved hai, dubara request na bhejo",
        });
      }
      worker.name = name;
      worker.workerType = workerType;
      worker.category = category;
      worker.flatNo = workerType === "FlatStaff" ? flatNo : undefined;
      worker.photoUrl = photoUrl;
      worker.status = "PendingApproval";
      worker.approvedBy = undefined;
      worker.approverModel = undefined;
      worker.approvedAt = undefined;
      await worker.save();
    } else {
      worker = await WorkerProfile.create({
        buildingCode,
        name,
        mobile,
        workerType,
        category,
        flatNo: workerType === "FlatStaff" ? flatNo : undefined,
        photoUrl,
        status: "PendingApproval",
      });
    }

    // ── notify — alag try/catch ──
    try {
      const io = req.app.get("io");

      if (workerType === "FlatStaff") {
        // ⛔ ye poora block same rehne do — koi change nahi
        const members = await Member.find({
          buildingCode,
          unitNo: flatNo,
        }).select("_id fcmToken");
        members.forEach((m) => {
          io.to(`member_${m._id}`).emit("worker_pending_request", { worker });
        });
        const tokens = members.map((m) => m.fcmToken).filter(Boolean);
        if (tokens.length) {
          await sendFCM(
            tokens,
            "Naya Worker Approval",
            `${name} (${category}) ne aapke flat ke liye request bheji hai`,
            { type: "WORKER_PENDING", workerId: String(worker._id) }
          );
        }
      } else {
        // ✅ CHANGE — ab proper DB Notification banega (bell icon + count me aayega)
        await notifyWorkerToAdmin({
          io,
          buildingCode,
          buildingId: worker.buildingId || null,
          type: "WORKER_APPROVAL_PENDING", // ✅ ADD — bell/DB me sahi type jayega
          title: "Naya Society Staff Approval",
          message: `${name} (${category}) ne society staff request bheji hai`,
          referenceId: worker._id,
          referenceModel: "WorkerProfile",
          data: { workerId: worker._id.toString(), workerType, category },
        });
      }
    } catch (notifyErr) {
      console.error("worker notify error (non-fatal):", notifyErr.message);
    }

    return res.status(201).json({ success: true, worker });
  } catch (err) {
    console.error("createWorkerPendingRequest error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export default createWorkerPendingRequest;
