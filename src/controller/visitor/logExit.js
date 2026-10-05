import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import memberModel from "../../model/member.js";
import {
  notifyWorkerToMembers,
  notifyWorkerToAdmin,
  notifyStaffToMember,
} from "../../controller/notifcation/notifyMembers.js";

// Sirf wahi exit ho sakta hai jo abhi andar hai
const EXITABLE_STATUSES = ["Approved", "ForcedEntry"];

const unitLabel = (v) =>
  v.flatNo === "Society"
    ? "Society"
    : `${v.memberType === "Shop" ? "Shop" : "Flat"} ${v.flatNo}`;

/**
 * Exit ke baad sahi audience ko notify karo:
 *  - PreApprovedWorker         → society admin (Society staff) ya us flat/shop ke members
 *  - respondedBy set (FCM/OTP) → wahi member
 *  - ManualCall / ForcedEntry  → notifiedMembers (respondedBy set nahi hota)
 */
const notifyExit = async (io, visitor) => {
  // ── WORKER ──
  if (visitor.verificationMethod === "PreApprovedWorker") {
    const notifData = {
      visitorId: visitor._id.toString(),
      name: visitor.name,
      category: visitor.purpose,
      flatNo: visitor.flatNo,
      memberType: visitor.memberType,
      exitTime: visitor.exitTime,
      workerType: visitor.flatNo === "Society" ? "SocietyStaff" : "FlatStaff",
    };
    const common = {
      io,
      buildingCode: visitor.buildingCode,
      type: "WORKER_EXIT",
      title: "Worker Exit",
      message: `${visitor.name} (${visitor.purpose}) ne ${unitLabel(visitor)} se abhi exit kiya hai.`,
      referenceId: visitor._id,
      referenceModel: "Visitor",
      data: notifData,
    };

    if (visitor.flatNo === "Society") {
      await notifyWorkerToAdmin(common);
      return;
    }

    const members = await memberModel
      .find({
        buildingCode: visitor.buildingCode,
        unitNo: visitor.flatNo,
        ...(visitor.memberType ? { memberType: visitor.memberType } : {}),
      })
      .select("_id fcmToken");

    if (members.length) {
      await notifyWorkerToMembers({ ...common, members });
    }
    return;
  }

  const guestData = {
    visitorId: visitor._id,
    status: "Exited",
    exitTime: visitor.exitTime,
    name: visitor.name,
    purpose: visitor.purpose,
  };
  const guestNotif = {
    io,
    buildingCode: visitor.buildingCode,
    type: "GUEST_EXIT",
    title: "Guest Exited 🚪",
    message: `${visitor.name} ne abhi society se exit kiya hai`,
    referenceId: visitor._id,
    data: guestData,
  };

  // ── GUEST: member ne approve kiya (respondedBy set) ──
  if (visitor.respondedBy) {
    const member = await memberModel
      .findById(visitor.respondedBy)
      .select("fcmToken");

    io.to(`member_${visitor.respondedBy}`).emit("visitor_status_update", {
      visitorId: visitor._id,
      status: "Exited",
    });

    await notifyStaffToMember({
      ...guestNotif,
      memberId: visitor.respondedBy,
      memberFcmToken: member?.fcmToken,
    });
    return;
  }

  // ── GUEST: ManualCall / ForcedEntry (respondedBy set nahi hota) ──
  if (
    visitor.verificationMethod === "ManualCall" ||
    visitor.verificationMethod === "ForcedEntry"
  ) {
    const members = await memberModel
      .find({ _id: { $in: visitor.notifiedMembers || [] } })
      .select("_id fcmToken");

    for (const m of members) {
      io.to(`member_${m._id}`).emit("visitor_status_update", {
        visitorId: visitor._id,
        status: "Exited",
      });

      await notifyStaffToMember({
        ...guestNotif,
        memberId: m._id,
        memberFcmToken: m.fcmToken,
      });
    }
  }
};

const logExit = async (req, res) => {
  try {
    const { id } = req.params;
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;

    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid visitor id" });
    }

    // ATOMIC: sirf apni building ka, abhi andar wala visitor. Dobara exit nahi hoga.
    const visitor = await Visitor.findOneAndUpdate(
      {
        _id: id,
        buildingCode,
        status: { $in: EXITABLE_STATUSES },
        exitTime: null,
      },
      { $set: { status: "Exited", exitTime: new Date() } },
      { new: true },
    );

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor nahi mila ya pehle hi exit ho chuka hai",
      });
    }

    const io = req.app.get("io");

    // Guard dashboard live count update
    io?.to(`guard_${visitor.buildingCode}`).emit("visitor_exited", {
      visitorId: visitor._id,
    });

    // Exit save ho chuka hai. Notification fail ho to bhi success return karo.
    try {
      if (io) await notifyExit(io, visitor);
    } catch (notifyError) {
      console.error("logExit notify error:", notifyError);
    }

    return res
      .status(200)
      .json({ success: true, message: "Exit logged", data: visitor });
  } catch (error) {
    console.error("logExit error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default logExit;
