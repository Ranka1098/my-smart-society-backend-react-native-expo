import Notification from "../../model/notification.js";
import Member from "../../model/member.js";
import Admin from "../../model/admin.js";
import Staff from "../../model/staff.js";
import { sendFCM } from "./sendFcmNotification.js"; // tera existing FCM utility

// ─── Core sender ───────────────────────────────────────────────────────────
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
  // 1. MongoDB save
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

  // 2. FCM tokens collect + Socket emit
  let tokens = [];
  const socketRoom = buildingCode; // room = buildingCode

  if (audience === "MEMBERS") {
    const members = await Member.find({
      buildingCode,
      fcmToken: { $ne: null },
    }).select("fcmToken");
    tokens = members.map((m) => m.fcmToken).filter(Boolean);
     console.log("Member tokens found:", tokens.length); // ← ADD
  console.log("Socket room:", socketRoom);            // ← ADD
    io.to(socketRoom).emit("notification", { type, title, message, data });
  } else if (audience === "ADMIN") {
    const admin = await Admin.findOne({
      buildingCode,
      fcmToken: { $ne: null },
    }).select("fcmToken");
    if (admin?.fcmToken) tokens = [admin.fcmToken];
    // admin ka apna socket room
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
    const superadmin = await Admin.findOne({
      role: "SUPERADMIN",
      fcmToken: { $ne: null },
    }).select("fcmToken");
    if (superadmin?.fcmToken) tokens = [superadmin.fcmToken];
    io.to("superadmin").emit("notification", { type, title, message, data });
  }

  // 3. FCM multicast (app closed → push with sound)
  // FCM fail hone pe bhi crash na ho, aur log karo
  if (tokens.length > 0) {
    try {
      await sendFCM(tokens, title, message, data);
    } catch (fcmErr) {
      console.error(
        "FCM send failed (notification saved in DB):",
        fcmErr.message
      );
      // notification MongoDB mein already save hai — safe
    }
  }
}
// ─── 1. Admin → Superadmin ─────────────────────────────────────────────────
// Usage: new building register hone pe
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
// Usage: notice post, meeting schedule
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
  // Members ko
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
  // Staff ko
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
// Usage: maintenance calculate, expense add, vendor
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
// Usage: complaint register
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

// ─── 5. Visitor → Specific Member (future: visitor management) ─────────────
// Usage: gate pe visitor aaya, guard us flat ke member ko notify kare
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
  // Save notification (specific member ke liye)
  const notification = await Notification.create({
    buildingCode,
    buildingId,
    type: "VISITOR_ARRIVED", // model enum me add karna baad mein
    audience: "SPECIFIC_MEMBER",
    receiverId: memberId,
    receiverModel: "MEMBER",
    title,
    message,
    data,
    referenceId,
    referenceModel: "Visitor",
  });

  // Socket → specific member room
  io.to(`member_${memberId}`).emit("visitor_notification", {
    title,
    message,
    data,
  });

  // FCM → specific member
  if (memberFcmToken) {
    await sendFCM([memberFcmToken], title, message, data);
  }

  return notification;
}
