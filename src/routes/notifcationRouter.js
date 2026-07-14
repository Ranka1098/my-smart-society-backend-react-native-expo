import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import memberAuth from "../middleware/memberAuth.js";
import staffAuth from "../middleware/staffAuth.js";

// ── ADMIN ──
import adminNotifications from "../controller/notifcation/admin_notifcation/adminNotifications.js";
import getAdminUnreadNotificationCount from "../controller/notifcation/admin_notifcation/getAdminUnreadNotificationCount.js";
import markSingleAdminNotificationRead from "../controller/notifcation/admin_notifcation/markSingleAdminNotificationRead.js";

// ── MEMBER ──
import memberNotifications from "../controller/notifcation/member_notifcation/memberNotifications.js";
import getUnreadMemberNotificationCount from "../controller/notifcation/member_notifcation/getUnreadMemberNotificationCount.js";
import markSingleMemberNotificationRead from "../controller/notifcation/member_notifcation/markSingleMemberNotificationRead .js";

// staff
import staffNotifications from "../controller/notifcation/staff_notifcation/staffNotifications.js";
import getStaffUnreadNotificationCount from "../controller/notifcation/staff_notifcation/getStaffUnreadNotificationCount.js";
import markSingleStaffNotificationRead from "../controller/notifcation/staff_notifcation/markSingleStaffNotificationRead.js";

const notifcationRouter = express.Router();

// ── ADMIN ──
notifcationRouter.get("/admin/notifications", adminAuth, adminNotifications);
notifcationRouter.get(
  "/admin/notifications/unread-count",
  adminAuth,
  getAdminUnreadNotificationCount
);
notifcationRouter.patch(
  "/admin/notifications/:id/read",
  adminAuth,
  markSingleAdminNotificationRead
);

// ── MEMBER ──
notifcationRouter.get("/member/notifications", memberAuth, memberNotifications);
notifcationRouter.get(
  "/member/notifications/unread-count",
  memberAuth,
  getUnreadMemberNotificationCount
);
notifcationRouter.patch(
  "/member/notifications/:id/read",
  memberAuth,
  markSingleMemberNotificationRead
);
// ── staff ──
notifcationRouter.get("/staff/notifications", staffAuth, staffNotifications);
notifcationRouter.get(
  "/staff/notifications/unread-count",
  staffAuth,
  getStaffUnreadNotificationCount
);
notifcationRouter.patch(
  "/staff/notifications/:id/read",
  staffAuth,
  markSingleStaffNotificationRead
);

export default notifcationRouter;
