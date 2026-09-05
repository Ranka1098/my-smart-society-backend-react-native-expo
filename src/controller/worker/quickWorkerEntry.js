import WorkerProfile from "../../model/WorkerProfile.js";
import Visitor from "../../model/Visitor.js";
import memberModel from "../../model/member.js";
import {
  notifyWorkerToMembers,
  notifyWorkerToAdmin,
} from "../../controller/notifcation/notifyMembers.js";

const quickWorkerEntry = async (req, res) => {
  try {
    const { workerId } = req.body;
    const buildingCode = req.buildingCode;
    const guardId = req.staff._id;
    const io = req.app.get("io");

    if (!workerId) {
      return res
        .status(400)
        .json({ success: false, message: "workerId required" });
    }

    const worker = await WorkerProfile.findOne({
      _id: workerId,
      buildingCode,
      status: "Approved",
    });
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Approved worker nahi mila" });
    }

    const visitor = await Visitor.create({
      buildingCode,
      name: worker.name,
      mobile: worker.mobile,
      purpose: worker.category,
      photoUrl: worker.photoUrl,
      flatNo: worker.workerType === "FlatStaff" ? worker.flatNo : "Society",
      memberType:
        worker.workerType === "FlatStaff" ? worker.memberType : undefined, // ✅ NAYA
      guardId,
      status: "Approved",
      verificationMethod: "PreApprovedWorker",
      approvedAt: new Date(),
      entryTime: new Date(),
    });

    // ✅ ADD — guard dashboard ko turant batao: visitorCount + currentlyInsideCount dono +1.
    // Pehle koi guard-room event emit hi nahi hota tha, isliye realtime update nahi ho raha tha.
    io.to(`guard_${buildingCode}`).emit("visitor_finalized", {
      visitorId: visitor._id,
    });

    const notifData = {
      visitorId: visitor._id.toString(),
      name: worker.name,
      category: worker.category,
      flatNo: visitor.flatNo,
      memberType: worker.memberType, // ✅ NAYA
      entryTime: visitor.entryTime,
    };
    const notifTitle = "Worker Entry";
    const notifMessage = `${worker.name} (${worker.category}) ne ${
      worker.workerType === "FlatStaff"
        ? `${worker.memberType === "Shop" ? "Shop" : "Flat"} ${worker.flatNo}`
        : "Society"
    } me abhi entry ki hai.`;

    if (worker.workerType === "FlatStaff") {
      const members = await memberModel
        .find({
          buildingCode,
          unitNo: worker.flatNo,
          ...(worker.memberType ? { memberType: worker.memberType } : {}), // ✅ NAYA
        })
        .select("_id fcmToken");

      if (members.length) {
        await notifyWorkerToMembers({
          io,
          buildingCode,
          type: "WORKER_ENTRY",
          title: notifTitle,
          message: notifMessage,
          referenceId: visitor._id,
          referenceModel: "Visitor",
          data: notifData,
          members,
        });
      }
    } else {
      await notifyWorkerToAdmin({
        io,
        buildingCode,
        type: "WORKER_ENTRY",
        title: notifTitle,
        message: notifMessage,
        referenceId: visitor._id,
        referenceModel: "Visitor",
        data: notifData,
      });
    }

    const insideList = await Visitor.find({
      buildingCode,
      status: "Approved",
      exitTime: null,
    })
      .sort({ entryTime: -1 })
      .limit(100);

    return res.status(201).json({ success: true, data: visitor, insideList });
  } catch (err) {
    console.error("quickWorkerEntry error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export default quickWorkerEntry;
