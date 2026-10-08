// =========================
// Code Name: createWorkerPendingRequest.js
// =========================

import WorkerProfile from "../../model/WorkerProfile.js";
import Member from "../../model/member.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import {
  notifyWorkerToAdmin,
  notifyWorkerToMembers,
} from "../notifcation/notifyMembers.js";

const WORKER_TYPES = ["SocietyStaff", "FlatStaff"];
const MEMBER_TYPES = ["Flat", "Shop"];
const CATEGORIES = [
  "Maid",
  "Cook",
  "Driver",
  "Cleaner",
  "Gardener",
  "Security",
];
const phoneRegex = /^[0-9]{10}$/;

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const compressAndUpload = async (file, { width, quality }, folder) => {
  const buf = await sharp(file.buffer)
    .rotate() // EXIF orientation fix
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
  const { secure_url } = await uploadToCloudinary(buf, folder);
  return secure_url;
};

// ── notification (non-fatal: fail hone par request save rehti hai) ──
const notifyAboutRequest = async ({
  req,
  worker,
  buildingCode,
  workerType,
  category,
  flatNo,
  memberType,
}) => {
  try {
    const io = req.app.get("io");
    const byGuard = `guard ${worker.requestedByName || ""}${
      worker.requestedGate ? ` (Gate ${worker.requestedGate})` : ""
    }`.trim();

    const base = {
      io,
      buildingCode,
      buildingId: worker.buildingId || null,
      type: "WORKER_APPROVAL_PENDING",
      referenceId: worker._id,
      referenceModel: "WorkerProfile",
      data: {
        workerId: worker._id.toString(),
        workerType,
        category,
        requestedByName: worker.requestedByName || "",
        requestedGate: worker.requestedGate || "",
      },
    };

    if (workerType === "FlatStaff") {
      const members = await Member.find({
        buildingCode,
        unitNo: flatNo,
        isVerified: true,
        approvalStatus: "Approved",
        ...(memberType ? { memberType } : {}),
      }).select("_id fcmToken");

      if (members.length) {
        await notifyWorkerToMembers({
          ...base,
          title: "Naya Worker Approval",
          message: `${worker.name} (${category}) ki request ${byGuard} ne aapke ${
            memberType === "Shop" ? "shop" : "flat"
          } ke liye bheji hai`,
          members,
        });

        members.forEach((m) => {
          io.to(`member_${m._id}`).emit("worker_pending_request", { worker });
        });
      }
    } else {
      await notifyWorkerToAdmin({
        ...base,
        title: "Naya Society Staff Approval",
        message: `${worker.name} (${category}) ki society staff request ${byGuard} ne bheji hai`,
      });
    }
  } catch (err) {
    console.error("worker notify error (non-fatal):", err.message);
  }
};

// ── main ──
const createWorkerPendingRequest = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    if (!buildingCode) {
      return fail(res, 401, "buildingCode missing in token");
    }
    if (!req.staff?._id) {
      return fail(res, 401, "Guard identify nahi hua");
    }

    // ── normalize ──
    const name = req.body.name?.trim();
    const mobile = String(req.body.mobile ?? "").trim();
    const category = req.body.category?.trim();
    const workerType = req.body.workerType?.trim();
    const flatNo = req.body.flatNo?.trim().toUpperCase();
    const memberType = req.body.memberType?.trim();

    // gate: body se, nahi to guard ke profile se
    const requestedGate =
      req.body.gate?.toString().trim() ||
      req.staff.gate?.toString().trim() ||
      undefined;

    // ── validate ──
    if (!name || !mobile || !workerType || !category) {
      return fail(res, 400, "Sab fields required");
    }
    if (!WORKER_TYPES.includes(workerType)) {
      return fail(res, 400, "Invalid workerType");
    }
    if (!CATEGORIES.includes(category)) {
      return fail(res, 400, "Invalid category");
    }
    if (name.length < 2 || name.length > 50) {
      return fail(res, 400, "Name must be 2-50 characters");
    }
    if (!phoneRegex.test(mobile)) {
      return fail(res, 400, "Mobile must be 10 digits");
    }
    if (requestedGate && requestedGate.length > 30) {
      return fail(res, 400, "Gate name too long (max 30 characters)");
    }

    const isFlatStaff = workerType === "FlatStaff";
    if (isFlatStaff && !flatNo) {
      return fail(res, 400, "FlatStaff ke liye flatNo required");
    }
    if (isFlatStaff && memberType && !MEMBER_TYPES.includes(memberType)) {
      return fail(res, 400, "Invalid memberType");
    }

    // ── files (upload.fields: photo + idPhoto) ──
    const photoFile = req.files?.photo?.[0];
    const idPhotoFile = req.files?.idPhoto?.[0];

    if (!photoFile) return fail(res, 400, "Photo required");
    if (!idPhotoFile) return fail(res, 400, "Worker ID photo required");
    if (
      !photoFile.mimetype?.startsWith("image") ||
      !idPhotoFile.mimetype?.startsWith("image")
    ) {
      return fail(res, 400, "Only image files allowed");
    }

    // ── existing worker? (upload se PEHLE check, taaki bekaar upload na ho) ──
    let worker = await WorkerProfile.findOne({ buildingCode, mobile });

    if (worker?.status === "Approved") {
      return fail(
        res,
        400,
        "Ye worker already approved hai, dubara request na bhejo",
      );
    }

    // ── dono photo parallel compress + upload ──
    const [photoUrl, idPhotoUrl] = await Promise.all([
      compressAndUpload(
        photoFile,
        { width: 1200, quality: 70 },
        "workerPhotos",
      ),
      compressAndUpload(
        idPhotoFile,
        { width: 1600, quality: 80 },
        "workerIdPhotos",
      ),
    ]);

    // ── fields jo create aur update dono mein same hain ──
    const fields = {
      name,
      workerType,
      category,
      flatNo: isFlatStaff ? flatNo : undefined,
      memberType: isFlatStaff ? memberType : undefined,
      photoUrl,
      idPhotoUrl,
      requestedBy: req.staff._id,
      requestedByName: req.staff.workerName,   // pehle: req.staff.name
      requestedGate,
      status: "PendingApproval",
    };

    if (worker) {
      // Rejected / Pending record reset karke dobara request
      Object.assign(worker, fields, {
        approvedBy: undefined,
        approverModel: undefined,
        approvedAt: undefined,
      });
      await worker.save();
    } else {
      worker = await WorkerProfile.create({ buildingCode, mobile, ...fields });
    }

    await notifyAboutRequest({
      req,
      worker,
      buildingCode,
      workerType,
      category,
      flatNo,
      memberType,
    });

    return res.status(201).json({ success: true, worker });
  } catch (err) {
    console.error("createWorkerPendingRequest error:", err);

    // do request ek saath aayein to unique index yahan pakadta hai
    if (err.code === 11000) {
      return fail(res, 409, "Is worker ki request pehle se maujood hai");
    }

    return fail(res, 500, "Server error");
  }
};

export default createWorkerPendingRequest;
