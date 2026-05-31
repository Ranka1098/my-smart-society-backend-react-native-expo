import memberModel from "../../model/member.js";
import maintenanceModel from "../../model/maintenance.js";

const addMemberMaintenancePayment = async (req, res) => {
  try {
    const { memberType, no, selectedBillIds, paymentMode } = req.body;
    const buildingCode = req.admin.buildingCode;

    if (!selectedBillIds?.length)
      return res.status(400).json({ message: "No bills selected" });
    if (!paymentMode)
      return res.status(400).json({ message: "Payment mode required" });

    // Verify member
    const member = await memberModel.findOne({
      buildingCode, unitNo: no?.trim(), memberType, role: "primary",
    });
    if (!member)
      return res.status(404).json({ message: "Member not found" });

    // Fetch & validate bills
    const bills = await maintenanceModel.find({
      _id: { $in: selectedBillIds },
      memberId: member._id,
      buildingCode,
      status: "Pending",
    });

    if (bills.length !== selectedBillIds.length)
      return res.status(400).json({ message: "Some bills already paid or not found" });

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

    for (const bill of bills) {
      bill.status      = "Paid";
      bill.paidDate    = now;
      bill.paymentMode = paymentMode;
      bill.receiptNo   = nextReceiptNo++;
      bill.bulkPaymentRef = bulkRef;
      await bill.save();
      paymentIds.push(String(bill._id));
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