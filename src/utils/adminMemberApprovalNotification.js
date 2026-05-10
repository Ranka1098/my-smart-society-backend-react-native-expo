import sendBrevoEmail from "./sendBrevoEmail.js";

const adminMemberVerificationEmail = async ({
  adminEmail,
  memberEmail,
  memberType,
  status,
  buildingCode,
  flatNo,
  shopNo,
}) => {
  await sendBrevoEmail({
    to: adminEmail,
    subject: "New Member Verified – Approval Required",
    html: `
      <h3>New Member Verified</h3>
      <p>Email: ${memberEmail}</p>
      <p>Type: ${memberType} (${status})</p>
      <p>Flat/Shop: ${flatNo || shopNo || "N/A"}</p>
      <p>Building Code: ${buildingCode}</p>
    `,
  });
};

export default adminMemberVerificationEmail;
