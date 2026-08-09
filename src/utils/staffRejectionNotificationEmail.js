// utils/staffRejectionNotificationEmail.js
import sendBrevoEmail from "./sendBrevoEmail.js";

const staffRejectionNotificationEmail = async ({ staffEmail, staffName, reason }) => {
  await sendBrevoEmail({
    to: staffEmail,
    subject: "Your staff account request was not approved",
    html: `
      <h3>Hello ${staffName || "Staff Member"},</h3>
      <p>Unfortunately, your staff registration request was not approved by the admin.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>If you think this was a mistake, please contact your building admin or try registering again with correct details.</p>
    `,
  });
};

export default staffRejectionNotificationEmail;