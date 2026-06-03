// controllers/member/getMemberMaintenanceHistory.js
import maintenanceModel from "../../model/maintenance.js";

const getMemberMaintenanceHistory = async (req, res) => {
  try {
    const memberId = req.member._id; // ← was req.memberId

    const records = await maintenanceModel
      .find({ memberId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      history: records.map((r) => ({
        _id: r._id,
        month: r.month,
        amount: r.amount,
        status: r.status,
        paymentMode: r.paymentMode,
        paidDate: r.paidDate,
        receiptNo: r.receiptNo,
        memberType: r.memberType,
        No: r.No,
      })),
    });
  } catch (error) {
    console.error("getMemberMaintenanceHistory error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default getMemberMaintenanceHistory;
