import Mailgen from "mailgen";
import nodemailer from "nodemailer";

// @ts-ignore
export const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "My App",
      // @ts-ignore
      link: process.env.APP_URL,
    },
  });
  // @ts-ignore
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    // @ts-ignore
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    secure: false,
    auth: {
      pass: process.env.MAILTRAP_SMTP_PASS,
      user: process.env.MAILTRAP_SMTP_USER,
    },
  });

  const mail = {
    from: process.env.MAIL_FROM || "noreply@myapp.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mail);
    console.log(`✅ Email sent to ${options.email}`);
  } catch (error) {
    console.error(
      // @ts-ignore
      `❌ Failed to send email to ${options.email}: ${error.message}`,
    );
  }
};

// @ts-ignore
export const emailVerificationMailGenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro:
        "Welcome to our app! Please verify your email address by clicking the button below.",
      action: {
        instructions: "Click the button to verify your email:",
        button: {
          color: "#22BC66",
          text: "Verify Email",
          link: verificationUrl,
        },
      },
      outro:
        "If you didn't create an account with us, please ignore this email.",
    },
  };
};

// @ts-ignore
export const forgotPasswordMailGenContent = (username, resetUrl) => {
  return {
    body: {
      name: username,
      intro:
        "You have requested to reset your password. Please click the button below to proceed.",
      action: {
        instructions: "Click the button to reset your password:",
        button: {
          color: "#EA4335",
          text: "Reset Password",
          link: resetUrl,
        },
      },
      outro:
        "If you didn't request a password reset, please ignore this email.",
    },
  };
};
