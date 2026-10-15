import memberModel from "../model/member.js";
import StaffModel from "../model/staff.js";
import adminModel from "../model/admin.js";
import superAdminModel from "../model/superAdmin.js";

const MODELS = {
  member: memberModel,
  staff: StaffModel,
  admin: adminModel,
  superAdmin: superAdminModel,
};

// string ho, khali na ho, FCM token se lamba na ho
export const isValidToken = (t) =>
  typeof t === "string" && t.trim().length > 0 && t.length <= 4096;

// Ye token ab is user ka hai: baaki sab roles/users se hatao, phir isko do
export const claimFcmToken = async (role, userId, fcmToken) => {
  await Promise.all(
    Object.entries(MODELS).map(([r, Model]) =>
      Model.updateMany(
        r === role ? { fcmToken, _id: { $ne: userId } } : { fcmToken },
        { $unset: { fcmToken: "" } },
      ),
    ),
  );
  await MODELS[role].updateOne({ _id: userId }, { $set: { fcmToken } });
};

// Logout: is user ka token hatao
export const releaseFcmToken = (role, userId) =>
  MODELS[role].updateOne({ _id: userId }, { $unset: { fcmToken: "" } });
