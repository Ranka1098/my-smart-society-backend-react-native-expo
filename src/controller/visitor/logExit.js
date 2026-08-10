import Visitor from "../../model/Visitor.js";
import memberModel from "../../model/member.js"; // ✅ ADD
import {
  notifyWorkerToMembers,
  notifyWorkerToAdmin,
} from "../../controller/notifcation/notifyMembers.js"; // ✅ ADD — apna actual path

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

    // ══════════════════════════════════════════════
    // ✅ ADD — WORKER EXIT NOTIFICATION
    // ══════════════════════════════════════════════
    if (visitor.verificationMethod === "PreApprovedWorker") {
      const io = req.app.get("io");
      const notifData = {
        visitorId: visitor._id.toString(),
        name: visitor.name,
        category: visitor.purpose,
        flatNo: visitor.flatNo,
        exitTime: visitor.exitTime,
      };
      const notifTitle = "Worker Exit";
      const notifMessage = `${visitor.name} (${visitor.purpose}) exit ho gaya.`;

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
          .find({ buildingCode: visitor.buildingCode, unitNo: visitor.flatNo })
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

    return res
      .status(200)
      .json({ success: true, message: "Exit logged", data: visitor });
  } catch (error) {
    console.error("logExit error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default logExit;
