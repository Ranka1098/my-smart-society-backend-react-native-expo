import sendBrevoEmail from "./sendBrevoEmail.js";

const memberApprovalNotificationEmail = async ({ memberEmail, memberName }) => {
  await sendBrevoEmail({
    to: memberEmail,
    subject: "Your account has been approved!",
    html: `
      <h3>Congratulations ${memberName || "Member"}!</h3>
      <p>Your membership account has been approved by admin.</p>
    `,
  });
};

export default memberApprovalNotificationEmail;
