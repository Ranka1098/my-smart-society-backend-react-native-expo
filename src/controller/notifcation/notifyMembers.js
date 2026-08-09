// notifyMembers.js — full updated file

import Notification from "../../model/notification.js";
import Member from "../../model/member.js";
import Admin from "../../model/admin.js";
import Staff from "../../model/staff.js";
import SuperAdmin from "../../model/superAdmin.js";
import { sendFCM } from "./sendFcmNotification.js";

async function createAndSend({
  io,
  buildingCode,
  buildingId,
  type,
  audience,
  title,
  message,
  referenceId = null,
  referenceModel = null,
  data = {},
  receiverId = null,
  receiverModel = null,
}) {
  const notification = await Notification.create({
    buildingCode,
    buildingId,
    type,
    audience,
    title,
    message,
    referenceId,
    referenceModel,
    data,
    receiverId,
    receiverModel,
  });

  let tokens = [];

  if (audience === "MEMBERS") {
    const members = await Member.find({ buildingCode }).select("_id fcmToken");
    tokens = members.map((m) => m.fcmToken).filter(Boolean);

    members.forEach((m) => {
      const room = `member_${m._id.toString()}`;
      console.log("[SOCKET EMIT] notification →", room, "| type:", type);
      io.to(room).emit("notification", {
        _id: notification._id.toString(),
        type,
        title,
        message,
        data, // ✅ real expense fields ab isi ke andar (vendorName, service, amount, photoUrl, createdAt)
        isRead: false,
        createdAt: notification.createdAt,
      });
    });
  } else if (audience === "ADMIN") {
    const admin = await Admin.findOne({
      buildingCode,
      fcmToken: { $ne: null },
    }).select("fcmToken");
    if (admin?.fcmToken) tokens = [admin.fcmToken];
    io.to(`admin_${buildingCode}`).emit("notification", {
      type,
      title,
      message,
      data,
    });
  } else if (audience === "STAFF") {
    const staffList = await Staff.find({
      buildingCode,
      fcmToken: { $ne: null },
    }).select("fcmToken");
    tokens = staffList.map((s) => s.fcmToken).filter(Boolean);
    io.to(`staff_${buildingCode}`).emit("notification", {
      type,
      title,
      message,
      data,
    });
  } else if (audience === "SUPERADMIN") {
    const superadmin = await SuperAdmin.findOne({
      fcmToken: { $ne: null },
    }).select("fcmToken");
    if (superadmin?.fcmToken) tokens = [superadmin.fcmToken];
    io.to("superadmin").emit("notification", { type, title, message, data });
  }

  // notifyMembers.js — createAndSend() ke andar

  if (tokens.length > 0) {
    try {
      await sendFCM(tokens, title, message, {
        ...data,
        type,
        _id: notification._id.toString(), // ✅ fix — DB ka real _id FCM payload me bhi bhejo
      });
    } catch (fcmErr) {
      console.error(
        "FCM send failed (notification saved in DB):",
        fcmErr.message
      );
    }
  }

  return notification;
}

// ─── 1. Admin → Superadmin ─────────────────────────────────────────────────
export async function notifyAdminToSuperadmin({
  io,
  buildingCode,
  buildingId,
  type = "NEW_BUILDING_REGISTERED",
  title,
  message,
  data = {},
}) {
  return createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "SUPERADMIN",
    title,
    message,
    data,
  });
}

// ─── 2. Admin → All Members + Staff ────────────────────────────────────────
export async function notifyAllMembersAndStaff({
  io,
  buildingCode,
  buildingId,
  type,
  title,
  message,
  referenceId,
  referenceModel,
  data = {},
}) {
  await createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "MEMBERS",
    title,
    message,
    referenceId,
    referenceModel,
    data,
  });
  await createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "STAFF",
    title,
    message,
    referenceId,
    referenceModel,
    data,
  });
}

// ─── 3. Admin → All Members only ───────────────────────────────────────────
export async function notifyAllMembers({
  io,
  buildingCode,
  buildingId,
  type,
  title,
  message,
  referenceId = null,
  referenceModel = null,
  data = {},
}) {
  return createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "MEMBERS",
    title,
    message,
    referenceId,
    referenceModel,
    data,
  });
}

// ─── 4. Member → Admin ─────────────────────────────────────────────────────
export async function notifyMemberToAdmin({
  io,
  buildingCode,
  buildingId,
  type,
  title,
  message,
  referenceId = null,
  referenceModel = null,
  data = {},
  senderId,
}) {
  return createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "ADMIN",
    title,
    message,
    referenceId,
    referenceModel,
    data,
    receiverId: senderId,
    receiverModel: "MEMBER",
  });
}

// ─── 5. Visitor → Specific Member ──────────────────────────────────────────
export async function notifyVisitorToMember({
  io,
  buildingCode,
  buildingId,
  memberId,
  memberFcmToken,
  title,
  message,
  data = {},
  referenceId = null,
}) {
  const notification = await Notification.create({
    buildingCode,
    buildingId,
    type: "VISITOR_ARRIVED",
    audience: "SPECIFIC_MEMBER",
    receiverId: memberId,
    receiverModel: "MEMBER",
    title,
    message,
    data,
    referenceId,
    referenceModel: "Visitor",
  });

  io.to(`member_${memberId}`).emit("visitor_notification", {
    title,
    message,
    data,
  });

  if (memberFcmToken) {
    await sendFCM([memberFcmToken], title, message, {
      ...data,
      type: "VISITOR_ARRIVED",
    }); // ✅
  }

  return notification;
}

// ─── 6. Member → Staff (guest pre-approve request) ─────────────────────────
export async function notifyMemberToStaff({
  io,
  buildingCode,
  buildingId,
  type = "GUEST_PRE_APPROVED",
  title,
  message,
  referenceId = null,
  referenceModel = "Visitor",
  data = {},
}) {
  const notification = await createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "STAFF",
    title,
    message,
    referenceId,
    referenceModel,
    data,
  });

  // ✅ guard ke live "PreApprovedDetail" screen ke liye alag raw event —
  // taki list turant update ho, sirf generic notification bell nahi
  io.to(`guard_${buildingCode}`).emit("new_visitor_request", {
    ...data,
    source: "socket",
  });

  return notification;
}

export async function notifyStaffToAdmin({
  io,
  buildingCode,
  buildingId,
  type,
  title,
  message,
  referenceId = null,
  referenceModel = null,
  data = {},
  senderId,
}) {
  return createAndSend({
    io,
    buildingCode,
    buildingId,
    type,
    audience: "ADMIN",
    title,
    message,
    referenceId,
    referenceModel,
    data,
    receiverId: senderId,
    receiverModel: "STAFF",
  });
}

// ─── 7. Staff → Specific Member (guest approve/reject decision) ───────────
export async function notifyStaffToMember({
  io,
  buildingCode,
  buildingId,
  memberId,
  memberFcmToken,
  type, // "GUEST_APPROVED" | "GUEST_REJECTED"
  title,
  message,
  data = {},
  referenceId = null,
}) {
  const notification = await Notification.create({
    buildingCode,
    buildingId,
    type,
    audience: "SPECIFIC_MEMBER",
    receiverId: memberId,
    receiverModel: "MEMBER",
    title,
    message,
    data,
    referenceId,
    referenceModel: "Visitor",
  });

  io.to(`member_${memberId}`).emit("guest_status_updated", {
    title,
    message,
    data, // { visitorId, status, approvedAt/rejectedAt, guardName, name, purpose }
  });

  if (memberFcmToken) {
    await sendFCM([memberFcmToken], title, message, { ...data, type });
  }

  return notification;
}
