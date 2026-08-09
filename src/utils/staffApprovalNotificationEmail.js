// utils/staffApprovalNotificationEmail.js
import sendBrevoEmail from "./sendBrevoEmail.js";

const staffApprovalNotificationEmail = async ({ staffEmail, staffName }) => {
  await sendBrevoEmail({
    to: staffEmail,
    subject: "Your staff account has been approved!",
    html: `
      <h3>Congratulations ${staffName || "Staff Member"}!</h3>
      <p>Your staff account has been approved by the admin. You can now log in and start using the app.</p>
    `,
  });
};

export default staffApprovalNotificationEmail;