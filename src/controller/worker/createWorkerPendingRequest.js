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
const phoneRegex = /^[0-9]{10}$/;

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

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
    const base = {
      io,
      buildingCode,
      buildingId: worker.buildingId || null,
      type: "WORKER_APPROVAL_PENDING",
      referenceId: worker._id,
      referenceModel: "WorkerProfile",
      data: { workerId: worker._id.toString(), workerType, category },
    };

    if (workerType === "FlatStaff") {
      // sirf verified + approved member ko
      const members = await Member.find({
        buildingCode,
        unitNo: flatNo,
        isVerified: true,
        approvalStatus: "Approved",
        ...(memberType ? { memberType } : {}),
      }).select("_id fcmToken");

      await notifyWorkerToMembers({
        ...base,
        title: "Naya Worker Approval",
        message: `${worker.name} (${category}) ne aapke ${
          memberType === "Shop" ? "shop" : "flat"
        } ke liye request bheji hai`,
        members,
      });

      members.forEach((m) => {
        io.to(`member_${m._id}`).emit("worker_pending_request", { worker });
      });
    } else {
      await notifyWorkerToAdmin({
        ...base,
        title: "Naya Society Staff Approval",
        message: `${worker.name} (${category}) ne society staff request bheji hai`,
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

    // ── normalize ──
    const name = req.body.name?.trim();
    const mobile = String(req.body.mobile ?? "").trim();
    const category = req.body.category?.trim();
    const workerType = req.body.workerType?.trim();
    const flatNo = req.body.flatNo?.trim().toUpperCase();
    const memberType = req.body.memberType?.trim();

    // ── validate ──
    if (!name || !mobile || !workerType || !category) {
      return fail(res, 400, "Sab fields required");
    }
    if (!WORKER_TYPES.includes(workerType)) {
      return fail(res, 400, "Invalid workerType");
    }
    if (name.length < 2 || name.length > 50) {
      return fail(res, 400, "Name must be 2-50 characters");
    }
    if (category.length > 50) {
      return fail(res, 400, "Category too long (max 50 characters)");
    }
    if (!phoneRegex.test(mobile)) {
      return fail(res, 400, "Mobile must be 10 digits");
    }

    const isFlatStaff = workerType === "FlatStaff";
    if (isFlatStaff && !flatNo) {
      return fail(res, 400, "FlatStaff ke liye flatNo required");
    }
    if (isFlatStaff && memberType && !MEMBER_TYPES.includes(memberType)) {
      return fail(res, 400, "Invalid memberType");
    }

    if (!req.file) {
      return fail(res, 400, "Photo required");
    }
    if (!req.file.mimetype?.startsWith("image")) {
      return fail(res, 400, "Only image files allowed");
    }

    // ── existing worker? (photo upload se PEHLE check, taaki bekaar upload na ho) ──
    let worker = await WorkerProfile.findOne({ buildingCode, mobile });

    if (worker?.status === "Approved") {
      return fail(
        res,
        400,
        "Ye worker already approved hai, dubara request na bhejo",
      );
    }

    // ── photo: compress + upload ──
    const compressed = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const { secure_url: photoUrl } = await uploadToCloudinary(
      compressed,
      "workerPhotos",
    );

    // ── fields jo create aur update dono mein same hain ──
    const fields = {
      name,
      workerType,
      category,
      flatNo: isFlatStaff ? flatNo : undefined,
      memberType: isFlatStaff ? memberType : undefined,
      photoUrl,
      status: "PendingApproval",
    };

    if (worker) {
      // Rejected / Pending record ko reset karke dobara request
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

    // do request ek saath aayein to unique index (agar hai) yahan pakadta hai
    if (err.code === 11000) {
      return fail(res, 409, "Is worker ki request pehle se maujood hai");
    }

    return fail(res, 500, "Server error");
  }
};

export default createWorkerPendingRequest;