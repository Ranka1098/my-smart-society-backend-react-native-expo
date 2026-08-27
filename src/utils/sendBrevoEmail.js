import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendBrevoEmail = async ({ to, subject, html }) => {
  try {
    await emailApi.sendTransacEmail({
      sender: { email: process.env.BREVO_FROM_EMAIL, name: "Smart Society" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    return true;
  } catch (error) {
    console.error(
      "❌ Brevo email error:",
      error.response?.body || error.message
    );
    return false;
  }
};

export default sendBrevoEmail;
