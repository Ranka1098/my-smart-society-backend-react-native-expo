import PDFDocument from "pdfkit";
import maintenanceModel from "../../model/maintenance.js";
import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";

const MONTH_ORDER = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];


const parseMonth = (monthStr) => {
  const [mon, year] = monthStr.split("-");
  const idx = MONTH_ORDER.indexOf(mon.toUpperCase());
  return Number(year) * 12 + (idx === -1 ? 0 : idx);
};

const downloadMaintenaceBill = async (req, res) => {
  try {
    const { paymentIds } = req.body;

    if (!paymentIds?.length)
      return res
        .status(400)
        .json({ success: false, message: "paymentIds required" });

    const formatDate = (date) => {
      if (!date) return "-";
      const ist = new Date(
        new Date(date).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const dd = String(ist.getDate()).padStart(2, "0");
      const mm = String(ist.getMonth() + 1).padStart(2, "0");
      const yyyy = ist.getFullYear();
      let h = ist.getHours();
      const min = String(ist.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = String(h % 12 || 12).padStart(2, "0");
      return `${dd}-${mm}-${yyyy}  ${h}:${min} ${ampm}`;
    };

    // Fetch all payments
    const payments = (
      await maintenanceModel
        .find({ _id: { $in: paymentIds }, status: "Paid" })
        .sort({ month: 1 })
    ).sort((a, b) => parseMonth(a.month) - parseMonth(b.month));

    if (!payments.length)
      return res
        .status(404)
        .json({ success: false, message: "No paid records found" });

    const [admin, member] = await Promise.all([
      adminModel.findOne({ buildingCode: payments[0].buildingCode }),
      memberModel.findById(payments[0].memberId),
    ]);

    const buildingName = admin?.buildingName || "Society";
    const buildingAddr = admin?.address || "";
    const memberNo = member?.unitNo || "—";
    const memberType = member?.memberType === "Flat" ? "Flat" : "Shop";
    const memberName =
      member?.memberStatus === "Rent"
        ? member?.renterName || member?.ownerName || "—"
        : member?.ownerName || "—";

    const isBulk = payments.length > 1;
    const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);


    
    // Headers
    const safeMemberNo = String(memberNo).replace(/[^\w\-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Bill-${payments[0].month}-${safeMemberNo}.pdf"`
    );

    // PDF setup
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const W = 595.28;
    const H = 841.89;
    const MARGIN = 45;

    doc.on("error", (err) => {
      console.error("PDFKit:", err);
      if (!res.headersSent)
        res.status(500).json({ success: false, message: "PDF failed" });
      else res.end();
    });

    doc.pipe(res);

    // Helpers
    const labelValue = (label, value, y) => {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#555555")
        .text(label, MARGIN + 10, y);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#111111")
        .text(value, MARGIN + 190, y);
    };

    const hRule = (y, color = "#dddddd", thickness = 0.5) => {
      doc
        .moveTo(MARGIN, y)
        .lineTo(W - MARGIN, y)
        .strokeColor(color)
        .lineWidth(thickness)
        .stroke();
    };

    const sectionHeader = (title, y) => {
      doc.rect(MARGIN, y, W - MARGIN * 2, 22).fill("#1a1a2e");
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#EAB308")
        .text(title, MARGIN + 10, y + 6);
    };

    // ══ HEADER ════════════════════════════════════
    doc.rect(0, 0, W, 130).fill("#1a1a2e");
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text(buildingName.toUpperCase(), 0, 28, { align: "center", width: W });
    if (buildingAddr)
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#aaaacc")
        .text(buildingAddr, 0, 58, { align: "center", width: W });
    doc.rect((W - 200) / 2, 76, 200, 24).fill("#EAB308");
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("MAINTENANCE BILL RECEIPT", (W - 200) / 2, 82, {
        align: "center",
        width: 200,
      });

    // ══ MEMBER DETAILS ═════════════════════════════
    const secY = 145;
    sectionHeader("MEMBER DETAILS", secY);

    let rowY = secY + 30;
    [
      ["Member Name", memberName],
      ["Unit Type", memberType],
      [`${memberType} No.`, memberNo],
    ].forEach(([label, value], idx) => {
      if (idx % 2 === 0)
        doc.rect(MARGIN, rowY, W - MARGIN * 2, 22).fill("#fafafa");
      labelValue(label, value, rowY + 5);
      rowY += 22;
    });

    hRule(rowY + 2, "#eeeeee");

    // ══ PAYMENT DETAILS ════════════════════════════
    const paySecY = rowY + 16;
    sectionHeader("PAYMENT DETAILS", paySecY);

    let payRowY = paySecY + 30;
    [
      ["Payment Mode", payments[0].paymentMode || "Cash"],
      ["Payment Date", formatDate(payments[0].paidDate)],
    ].forEach(([label, value], idx) => {
      if (idx % 2 === 0)
        doc.rect(MARGIN, payRowY, W - MARGIN * 2, 22).fill("#fafafa");
      labelValue(label, value, payRowY + 5);
      payRowY += 22;
    });

    hRule(payRowY + 2, "#eeeeee");

    // ══ MONTHS BREAKDOWN (bulk only) ═══════════════
    if (isBulk) {
      const brkSecY = payRowY + 16;
      sectionHeader("MONTHS BREAKDOWN", brkSecY);

      let brkY = brkSecY + 30;
      payments.forEach((p, idx) => {
        if (idx % 2 === 0)
          doc.rect(MARGIN, brkY, W - MARGIN * 2, 22).fill("#fafafa");
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#555555")
          .text(p.month, MARGIN + 10, brkY + 5);
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor("#111111")
          .text(
            `Rs. ${Number(p.amount).toLocaleString("en-IN")}`,
            MARGIN + 190,
            brkY + 5
          );
        brkY += 22;
      });

      // Subtotal row
      doc.rect(MARGIN, brkY, W - MARGIN * 2, 22).fill("#f1f5f9");
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text(`${payments.length} months total`, MARGIN + 10, brkY + 5);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#1a1a2e")
        .text(
          `Rs. ${totalAmount.toLocaleString("en-IN")}`,
          MARGIN + 190,
          brkY + 5
        );
      brkY += 22;

      hRule(brkY + 2, "#eeeeee");
      payRowY = brkY;
    }

    // ══ AMOUNT BOX ═════════════════════════════════
    const amtY = payRowY + 20;
    doc
      .rect(MARGIN, amtY, W - MARGIN * 2, 64)
      .fill("#FFFBEB")
      .stroke("#FDE68A");
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#92400E")
      .text("Total Amount Paid", MARGIN + 16, amtY + 12);
    doc
      .fontSize(26)
      .font("Helvetica-Bold")
      .fillColor("#92400E")
      .text(
        `Rs. ${totalAmount.toLocaleString("en-IN")}`,
        MARGIN + 16,
        amtY + 28
      );

    // ══ FOOTER ═════════════════════════════════════
    const footerY = H - 90;
    doc.rect(0, footerY, W, 90).fill("#f4f4f8");
    hRule(footerY, "#dddddd", 1);
    doc
      .fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#888888")
      .text(
        "This is a computer generated receipt and does not require a physical signature.",
        0,
        footerY + 16,
        { align: "center", width: W }
      );
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("Thank you for your timely maintenance payment!", 0, footerY + 36, {
        align: "center",
        width: W,
      });
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaaaaa")
      .text(`Generated on: ${formatDate(new Date())}`, 0, footerY + 58, {
        align: "center",
        width: W,
      });

    doc.end();
  } catch (error) {
    console.error("Bill Error:", error.message);
    if (!res.headersSent)
      return res.status(500).json({
        success: false,
        message: error.message || "Bill generation failed",
      });
    res.end();
  }
};

export default downloadMaintenaceBill;
