import nodemailer, { Transporter } from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type DeliveryResult = {
  delivered: boolean;
  mode: "smtp" | "dev-log";
};

let transporter: Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !portRaw || !user || !pass) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

function getFromAddress() {
  const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@naijapropertyhub.ng";
  const fromName = process.env.SMTP_FROM_NAME || "NaijaProperty Hub";
  return `${fromName} <${fromEmail}>`;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  transporter = nodemailer.createTransport(config);
  return transporter;
}

export async function sendEmail(payload: EmailPayload): Promise<DeliveryResult> {
  const mailer = getTransporter();

  if (!mailer) {
    console.info("[mail:dev-log]", {
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });

    return { delivered: false, mode: "dev-log" };
  }

  await mailer.sendMail({
    from: getFromAddress(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { delivered: true, mode: "smtp" };
}
