import memberModel from "../../model/member.js";
import maintenanceModel from "../../model/maintenance.js";
import Notification from "../../model/notification.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const addMemberMaintenancePayment = async (req, res) => {
  try {
    const { memberType, no, selectedBillIds, paymentMode } = req.body;
    const buildingCode = req.admin.buildingCode;
    const buildingId = req.admin.buildingId;
    const io = req.app.get("io");

    if (!selectedBillIds?.length)
      return res.status(400).json({ message: "No bills selected" });
    if (!paymentMode)
      return res.status(400).json({ message: "Payment mode required" });

    // Verify member
    const member = await memberModel.findOne({
      buildingCode,
      unitNo: no?.trim(),
      memberType,
      role: "primary",
    });
    if (!member) return res.status(404).json({ message: "Member not found" });

    // Fetch & validate bills
    const bills = await maintenanceModel.find({
      _id: { $in: selectedBillIds },
      memberId: member._id,
      buildingCode,
      status: "Pending",
    });

    if (bills.length !== selectedBillIds.length)
      return res
        .status(400)
        .json({ message: "Some bills already paid or not found" });

    // Next receipt no (per building sequential)
    const lastPaid = await maintenanceModel
      .findOne({ buildingCode, status: "Paid", receiptNo: { $ne: null } })
      .sort({ receiptNo: -1 })
      .select("receiptNo");
    let nextReceiptNo = (lastPaid?.receiptNo ?? 0) + 1;

    // Bulk ref for multi-month
    const bulkRef = bills.length > 1 ? `BULK-${Date.now()}` : null;
    const now = new Date();
    const paymentIds = [];
    let totalAmount = 0;

    for (const bill of bills) {
      bill.status = "Paid";
      bill.paidDate = now;
      bill.paymentMode = paymentMode;
      bill.receiptNo = nextReceiptNo++;
      bill.bulkPaymentRef = bulkRef;
      await bill.save();
      paymentIds.push(String(bill._id));
      totalAmount += bill.amount || 0;
    }

    // ── Notification to member ──
    const monthsStr = bills.map((b) => b.month).join(", ");
    const title = "Maintenance Received ✅";
    const message = `Dear ${member.fullName}, payment of ₹${totalAmount} for ${monthsStr} has been received. Thank you!`;
    const data = {
      months: monthsStr,
      amount: String(totalAmount),
      unitNo: String(member.unitNo),
      paymentMode,
    };

    if (buildingId) {
      await Notification.create({
        buildingCode,
        buildingId,
        memberId: member._id,
        type: "MAINTENANCE_PAID",
        audience: "MEMBERS",
        title,
        message,
        referenceId: bills[0]._id,
        referenceModel: "Maintenance",
        data,
      });
    }

    if (io) {
      io.to(buildingCode).emit("notification", {
        type: "MAINTENANCE_PAID",
        title,
        message,
        data,
      });
    }

    if (member.fcmToken) {
      await sendFCM([member.fcmToken], title, message, data);
    }

    return res.json({
      success: true,
      paymentIds,
      bulkRef,
      totalPaid: bills.length,
    });
  } catch (err) {
    console.error("addMemberMaintenancePayment:", err.message);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

export default addMemberMaintenancePayment;
