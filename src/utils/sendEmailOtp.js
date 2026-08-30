import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmailOtp = async (email, otp, type = "verify") => {
  try {
    let subject = "",
      heading = "",
      message = "";
    if (type === "forgot") {
      subject = "Reset Your Password - OTP";
      heading = "Password Reset Request";
      message = "Use this OTP to reset your password";
    } else {
      subject = "Account Verification OTP";
      heading = "Verify Your Account";
      message = "Use this OTP to verify your account";
    }

    const emailData = {
      to: [{ email }],
      sender: { email: process.env.BREVO_FROM_EMAIL, name: "Smart Society" },
      subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif;">
          <h2>${heading}</h2>
          <p>${message}</p>
          <h1 style="color: #2d89ef;">${otp}</h1>
          <p>This OTP is valid for 1 minute.</p>
        </div>
      `,
    };

    const result = await emailApi.sendTransacEmail(emailData);
    return true;
  } catch (error) {
    console.error(
      "❌ Email send error FULL:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    console.error(
      "❌ error.response:",
      error.response?.body || error.response?.text || "no response body"
    );
    console.error("❌ error.message:", error.message);
    console.error("❌ error status:", error.status || error.statusCode);
    return false;
  }
};

export default sendEmailOtp;
