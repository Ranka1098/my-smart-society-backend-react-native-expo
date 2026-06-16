// =========================
// Code Name: getMemberFullDetails.js (Member + Maintenance History)
// =========================

import memberModel from "../../../model/member.js";
import maintenanceModel from "../../../model/maintenance.js";

const getMemberFullDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const buildingCode = req.buildingCode;

    const [member, history] = await Promise.all([
      memberModel.findOne({ _id: id, buildingCode }),
      maintenanceModel.find({ memberId: id }).sort({ createdAt: -1 }),
    ]);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
      history: history.map((r) => ({
        _id: r._id,
        month: r.month,
        amount: r.amount,
        status: r.status,
        paymentMode: r.paymentMode,
        paidDate: r.paidDate,
        receiptNo: r.receiptNo,
        memberType: r.memberType,
        unitNo: r.unitNo,
      })),
    });
  } catch (error) {
    console.error("getMemberFullDetails Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getMemberFullDetails;
