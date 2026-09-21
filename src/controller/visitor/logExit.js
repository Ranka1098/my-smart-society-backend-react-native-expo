import Visitor from "../../model/Visitor.js";
import memberModel from "../../model/member.js";
import {
  notifyWorkerToMembers,
  notifyWorkerToAdmin,
  notifyStaffToMember,
} from "../../controller/notifcation/notifyMembers.js";

/**
 * Marks a visitor as Exited and notifies the relevant audience:
 *  - PreApprovedWorker  → society admin (society staff) or flat/shop members (flat staff)
 *  - FCM-approved guest → the member who approved (visitor.respondedBy)
 *  - ManualCall-verified guest → all members that were originally notified
 *    (visitor.notifiedMembers), since respondedBy is never set for this method
 */
const logExit = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { status: "Exited", exitTime: new Date() },
      { new: true },
    );
    if (!visitor) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor not found" });
    }

    const io = req.app.get("io");

    // Let the guard's own dashboard drop this entry from its live list
    io.to(`guard_${visitor.buildingCode}`).emit("visitor_exited", {
      visitorId: visitor._id,
    });

    // ══════════════════════════════════════════════
    // WORKER EXIT
    // ══════════════════════════════════════════════
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
      const notifTitle = "Worker Exit";
      const notifMessage = `${visitor.name} (${visitor.purpose}) ne ${
        visitor.flatNo === "Society"
          ? "Society"
          : `${visitor.memberType === "Shop" ? "Shop" : "Flat"} ${visitor.flatNo}`
      } ne abhi exit kiya hai.`;

      if (visitor.flatNo === "Society") {
        // Society-level staff → notify admin only
        await notifyWorkerToAdmin({
          io,
          buildingCode: visitor.buildingCode,
          type: "WORKER_EXIT",
          title: notifTitle,
          message: notifMessage,
          referenceId: visitor._id,
          referenceModel: "Visitor",
          data: notifData,
        });
      } else {
        // Flat/shop-level staff → notify that unit's members
        const members = await memberModel
          .find({
            buildingCode: visitor.buildingCode,
            unitNo: visitor.flatNo,
            ...(visitor.memberType ? { memberType: visitor.memberType } : {}),
          })
          .select("_id fcmToken");

        if (members.length) {
          await notifyWorkerToMembers({
            io,
            buildingCode: visitor.buildingCode,
            type: "WORKER_EXIT",
            title: notifTitle,
            message: notifMessage,
            referenceId: visitor._id,
            referenceModel: "Visitor",
            data: notifData,
            members,
          });
        }
      }
    }

    // ══════════════════════════════════════════════
    // GUEST EXIT — FCM approved (member approved in-app, respondedBy set)
    // ══════════════════════════════════════════════
    else if (visitor.respondedBy) {
      const member = await memberModel
        .findById(visitor.respondedBy)
        .select("fcmToken");

      io.to(`member_${visitor.respondedBy}`).emit("visitor_status_update", {
        visitorId: visitor._id,
        status: "Exited",
      });

      await notifyStaffToMember({
        io,
        buildingCode: visitor.buildingCode,
        memberId: visitor.respondedBy,
        memberFcmToken: member?.fcmToken,
        type: "GUEST_EXIT",
        title: "Guest Exited 🚪",
        message: `${visitor.name} ne abhi society se exit kiya hai`,
        referenceId: visitor._id,
        data: {
          visitorId: visitor._id,
          status: "Exited",
          exitTime: visitor.exitTime,
          name: visitor.name,
          purpose: visitor.purpose,
        },
      });
    }

  // ══════════════════════════════════════════════
// GUEST EXIT — ManualCall verified YA Force Entry
// (dono me respondedBy set nahi hota, notifiedMembers se fallback)
// ══════════════════════════════════════════════
else if (
  visitor.verificationMethod === "ManualCall" ||
  visitor.verificationMethod === "ForcedEntry" ||
  visitor.status === "ForcedEntry"   // agar verificationMethod alag rakha hai, status se bhi catch kar
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
      io,
      buildingCode: visitor.buildingCode,
      memberId: m._id,
      memberFcmToken: m.fcmToken,
      type: "GUEST_EXIT",
      title: "Guest Exited 🚪",
      message: `${visitor.name} ne abhi society se exit kiya hai`,
      referenceId: visitor._id,
      data: {
        visitorId: visitor._id,
        status: "Exited",
        exitTime: visitor.exitTime,
        name: visitor.name,
        purpose: visitor.purpose,
      },
    });
  }
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