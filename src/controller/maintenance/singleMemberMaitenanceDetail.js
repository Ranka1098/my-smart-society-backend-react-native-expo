import maintenanceModel from "../../model/maintenance.js"; // path apne hisab se

const singleMemberMaintenanceDetail = async (req, res) => {
  try {
    const memberId = req.memberId; // token se aaya

    // Member ke saare maintenance records fetch karo
    const maintenanceRecords = await maintenanceModel
      .find({ memberId })
      .sort({ createdAt: 1 }); // oldest to newest

    if (!maintenanceRecords || maintenanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No maintenance records found for this member",
      });
    }

    // Response structure
    const history = maintenanceRecords.map((record) => ({
      month: record.month,
      amount: record.amount,
      status: record.status,
      paidDate: record.paidDate,
      paymentMode: record.paymentMode,
    }));

    return res.status(200).json({
      success: true,
      memberId,
      history,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default singleMemberMaintenanceDetail;
