import sendBrevoEmail from "./sendBrevoEmail.js";

const sendBuildingCode = async (email, buildingCode) => {
  await sendBrevoEmail({
    to: email,
    subject: "Your Building Code",
    html: `
      <h2>Smart Society Building Code</h2>
      <p>Your building code:</p>
      <h1>${buildingCode}</h1>
    `,
  });
};

export default sendBuildingCode;
