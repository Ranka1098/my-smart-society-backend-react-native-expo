import complaintModel from "../../model/complaint.js";
import memberModel from "../../model/member.js";
import Building from "../../model/building.js";
import Notification from "../../model/notification.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const resolveComplaint = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const buildingId = req.admin?.buildingId;
    const adminId = req.adminId;
    const io = req.app.get("io");
    const complaintId = req.params.id;

    if (!adminId || !buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ===============================
    // ✅ FIND COMPLAINT
    // ===============================
    const complaint = await complaintModel.findOne({
      _id: complaintId,
      buildingCode,
    });

    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status === "RESOLVED") {
      return res
        .status(400)
        .json({ success: false, message: "Already resolved" });
    }

    // ===============================
    // ✅ UPDATE COMPLAINT
    // ===============================
    complaint.status = "RESOLVED";
    complaint.resolvedBy = adminId;
    complaint.resolvedAt = new Date();
    await complaint.save();

    // ===============================
    // ✅ FIND MEMBER
    // ===============================
    const member = await memberModel.findOne({
      _id: complaint.memberId,
      buildingCode,
    });

    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // ===============================
    // ✅ NOTIFY THAT MEMBER ONLY
    // ===============================
    const title = "Complaint Resolved ✅";
    const message = `Your ${complaint.category} complaint has been resolved by admin.`;
    const data = {
      complaintId: complaint._id.toString(),
      category: complaint.category,
      status: "RESOLVED",
      resolvedAt: complaint.resolvedAt.toISOString(), // ✅ add — frontend ko chahiye
    };

    // ✅ fix — result assign kiya, warna notification._id undefined rehta
    const notification = await Notification.create({
      buildingCode,
      buildingId,
      type: "COMPLAINT_RESOLVED",
      audience: "MEMBERS",
      receiverId: member._id,
      receiverModel: "MEMBER",
      title,
      message,
      referenceId: complaint._id,
      referenceModel: "Complaint",
      data,
    });

    // Socket → specific member room
    if (io) {
      io.to(`member_${member._id}`).emit("notification", {
        _id: notification._id.toString(), // ✅ fix — dedupe ke liye zaroori
        type: "COMPLAINT_RESOLVED",
        title,
        message,
        data,
        isRead: false,
        createdAt: notification.createdAt,
        source: "socket", // ✅ fix — member _layout.js sound-gating isi pe depend karta hai
      });
    }

    // FCM → specific member only
    if (member.fcmToken) {
      await sendFCM([member.fcmToken], title, message, {
        ...data,
        type: "COMPLAINT_RESOLVED",
        _id: notification._id.toString(), // ✅ fix — FCM payload me bhi real _id
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complaint resolved",
      complaint,
    });
  } catch (error) {
    console.error("Resolve Complaint Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default resolveComplaint;
