import Visitor from "../../model/Visitor.js";
import memberModel from "../../model/member.js";
import {
  notifyWorkerToMembers,
  notifyWorkerToAdmin,
  notifyStaffToMember,
} from "../../controller/notifcation/notifyMembers.js";

const logExit = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { status: "Exited", exitTime: new Date() },
      { new: true }
    );
    if (!visitor) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor not found" });
    }

    const io = req.app.get("io");
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
        memberType: visitor.memberType, // ✅ NAYA
        exitTime: visitor.exitTime,
      };
      const notifTitle = "Worker Exit";
      // ✅ FIX — "worker" nahi "visitor" use karo, field names bhi sahi karo
      const notifMessage = `${visitor.name} (${visitor.purpose}) ne ${
        visitor.flatNo === "Society"
          ? "Society"
          : `${visitor.memberType === "Shop" ? "Shop" : "Flat"} ${
              visitor.flatNo
            }`
      } ne abhi exit kiya hai.`;

      if (visitor.flatNo === "Society") {
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
        const members = await memberModel
          .find({
            buildingCode: visitor.buildingCode,
            unitNo: visitor.flatNo,
            ...(visitor.memberType ? { memberType: visitor.memberType } : {}), // ✅ NAYA
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
    // GUEST EXIT
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
        message: `${visitor.name} exit ho gaya (${new Date(
          visitor.exitTime
        ).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })})`,
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

    return res
      .status(200)
      .json({ success: true, message: "Exit logged", data: visitor });
  } catch (error) {
    console.error("logExit error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default logExit;
