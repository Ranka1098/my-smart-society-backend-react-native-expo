// utils/memberRejectionNotificationEmail.js
import sendBrevoEmail from "./sendBrevoEmail.js";

const memberRejectionNotificationEmail = async ({ memberEmail, memberName, reason }) => {
  await sendBrevoEmail({
    to: memberEmail,
    subject: "Your account request was not approved",
    html: `
      <h3>Hello ${memberName || "Member"},</h3>
      <p>Unfortunately, your membership request was not approved by the admin.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>If you think this was a mistake, please contact your building admin or try registering again with correct details.</p>
    `,
  });
};

export default memberRejectionNotificationEmail;