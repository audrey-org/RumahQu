import nodemailer from "nodemailer";
import { env } from "./config.js";

type SendVerificationEmailInput = {
  email: string;
  fullName: string;
  verificationUrl: string;
};

type SendPasswordResetEmailInput = {
  email: string;
  fullName: string;
  resetUrl: string;
};

export type EmailPreviewTemplate = "verification" | "reset-password";

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

type EmailTemplateInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  actionNote: string;
  expiryLabel: string;
  footer: string;
};

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTextEmail(input: EmailTemplateInput, fullName: string) {
  return [
    `Halo ${fullName},`,
    "",
    input.title,
    input.intro,
    "",
    `${input.actionLabel}:`,
    input.actionUrl,
    "",
    input.expiryLabel,
    input.actionNote,
    "",
    input.footer,
    "",
    "RumahQu",
  ].join("\n");
}

function buildHtmlEmail(input: EmailTemplateInput, fullName: string) {
  const safeName = escapeHtml(fullName);
  const safePreheader = escapeHtml(input.preheader);
  const safeEyebrow = escapeHtml(input.eyebrow);
  const safeTitle = escapeHtml(input.title);
  const safeIntro = escapeHtml(input.intro);
  const safeActionLabel = escapeHtml(input.actionLabel);
  const safeActionUrl = escapeHtml(input.actionUrl);
  const safeActionNote = escapeHtml(input.actionNote);
  const safeExpiryLabel = escapeHtml(input.expiryLabel);
  const safeFooter = escapeHtml(input.footer);

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f7f2ea; color: #3f2d20;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
          ${safePreheader}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #fbf6ef 0%, #f4ede3 100%); padding: 24px 12px;">
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="max-width: 640px; background: #fffdf9; border-radius: 28px; overflow: hidden; box-shadow: 0 24px 70px rgba(94, 62, 35, 0.10); border: 1px solid #f0e3d3;"
              >
                <tr>
                  <td
                    style="padding: 34px 32px 28px; background: linear-gradient(135deg, #8b5e3c 0%, #c98d5b 48%, #86b57a 100%); color: #fffaf5; position: relative;"
                  >
                    <div style="display: inline-block; padding: 8px 14px; border-radius: 999px; background: rgba(255, 250, 245, 0.18); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                      ${safeEyebrow}
                    </div>
                    <div style="margin-top: 18px; font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 250, 245, 0.76);">
                      RumahQu
                    </div>
                    <h1 style="margin: 12px 0 10px; font-size: 32px; line-height: 1.2; font-weight: 800;">
                      ${safeTitle}
                    </h1>
                    <p style="margin: 0; font-size: 16px; line-height: 1.75; color: rgba(255, 250, 245, 0.92); max-width: 480px;">
                      ${safeIntro}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.8; color: #4a3425;">
                      Halo <strong style="color: #7c5233;">${safeName}</strong>,
                    </p>
                    <div style="padding: 22px; border: 1px solid #eedfcd; border-radius: 22px; background: linear-gradient(180deg, #fffaf4 0%, #fff6ec 100%);">
                      <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.8; color: #6a4b34;">
                        ${safeActionNote}
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="border-radius: 16px; background: linear-gradient(135deg, #7d5435 0%, #b97b4a 100%); box-shadow: 0 12px 28px rgba(185, 123, 74, 0.24);">
                            <a
                              href="${safeActionUrl}"
                              style="display: inline-block; padding: 14px 24px; color: #fffaf5; text-decoration: none; font-size: 15px; font-weight: 700;"
                            >
                              ${safeActionLabel}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="margin-top: 24px; padding: 18px 20px; border-radius: 20px; background: #eef6ea; color: #4d7c43; border: 1px solid #d9e8d1;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.7;">
                        <strong>Masa berlaku:</strong> ${safeExpiryLabel}
                      </p>
                    </div>
                    <div style="margin-top: 26px; padding: 18px 20px; border-radius: 20px; background: #f6efe5; border: 1px dashed #e2c9a8;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #7a5a3f;">
                        Sedikit pengingat: demi menjaga kenyamanan keluarga di RumahQu, link ini sebaiknya tidak dibagikan ke orang lain.
                      </p>
                    </div>
                    <p style="margin: 24px 0 8px; font-size: 14px; line-height: 1.7; color: #7a6858;">
                      Jika tombol tidak bekerja, buka link berikut secara manual:
                    </p>
                    <p style="margin: 0; word-break: break-word;">
                      <a href="${safeActionUrl}" style="color: #9b6237; text-decoration: none;">${safeActionUrl}</a>
                    </p>
                    <hr style="margin: 30px 0 20px; border: 0; border-top: 1px solid #efe2d3;" />
                    <p style="margin: 0; font-size: 13px; line-height: 1.8; color: #7c6a5a;">
                      ${safeFooter}
                    </p>
                    <p style="margin: 14px 0 0; font-size: 13px; line-height: 1.8; color: #a08c79;">
                      Email otomatis dari RumahQu. Mohon tidak membalas email ini.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildVerificationEmailContent(input: SendVerificationEmailInput): EmailContent {
  const subject = "Verifikasi email akun RumahQu";
  const template: EmailTemplateInput = {
    preheader: "Satu langkah lagi untuk mulai mengatur kebutuhan rumah bersama keluarga di RumahQu.",
    eyebrow: "Rumah Baru Dimulai",
    title: "Selamat datang di RumahQu",
    intro: "Mari aktifkan akun Anda dan mulai menata stok, belanja, dan kebutuhan rumah tangga dengan lebih hangat dan rapi bersama keluarga.",
    actionLabel: "Verifikasi Email",
    actionUrl: input.verificationUrl,
    actionNote: "Klik tombol di bawah ini untuk mengaktifkan akun Anda dan menyelesaikan langkah pertama menuju rumah yang lebih tertata.",
    expiryLabel: `Link ini berlaku selama ${env.EMAIL_VERIFICATION_TTL_HOURS} jam.`,
    footer: "Jika Anda tidak merasa mendaftar di RumahQu, abaikan saja email ini. Tidak ada perubahan apa pun pada data Anda.",
  };

  return {
    subject,
    text: buildTextEmail(template, input.fullName),
    html: buildHtmlEmail(template, input.fullName),
  };
}

function buildPasswordResetEmailContent(input: SendPasswordResetEmailInput): EmailContent {
  const subject = "Reset password akun RumahQu";
  const template: EmailTemplateInput = {
    preheader: "Kami bantu Anda kembali masuk ke RumahQu dengan aman dan nyaman.",
    eyebrow: "Akses RumahQu",
    title: "Buat password baru",
    intro: "Jika Anda sedang kesulitan masuk, gunakan link aman ini untuk membuat password baru dan kembali mengelola kebutuhan rumah tanpa repot.",
    actionLabel: "Buat Password Baru",
    actionUrl: input.resetUrl,
    actionNote: "Demi keamanan akun keluarga Anda, link ini hanya berlaku sementara dan otomatis menggantikan permintaan reset sebelumnya.",
    expiryLabel: `Link ini berlaku selama ${env.PASSWORD_RESET_TTL_HOURS} jam.`,
    footer: "Jika Anda tidak meminta reset password, Anda bisa mengabaikan email ini. Password tidak akan berubah sampai link ini digunakan.",
  };

  return {
    subject,
    text: buildTextEmail(template, input.fullName),
    html: buildHtmlEmail(template, input.fullName),
  };
}

function buildPreviewIndexCard(
  title: string,
  description: string,
  href: string,
  accentStart: string,
  accentEnd: string,
) {
  return `
    <a
      href="${escapeHtml(href)}"
      style="
        display: block;
        padding: 24px;
        border-radius: 24px;
        text-decoration: none;
        background: linear-gradient(135deg, ${accentStart} 0%, ${accentEnd} 100%);
        color: #fffaf5;
        box-shadow: 0 18px 40px rgba(94, 62, 35, 0.12);
      "
    >
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8;">
        Preview
      </div>
      <h2 style="margin: 12px 0 10px; font-size: 26px; line-height: 1.2;">${escapeHtml(title)}</h2>
      <p style="margin: 0; font-size: 15px; line-height: 1.8; color: rgba(255, 250, 245, 0.92);">
        ${escapeHtml(description)}
      </p>
    </a>
  `;
}

export function renderEmailPreviewIndex(baseUrl: string) {
  const verificationHref = `${baseUrl}/api/dev/email-preview?template=verification`;
  const resetHref = `${baseUrl}/api/dev/email-preview?template=reset-password`;

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Preview Email RumahQu</title>
      </head>
      <body style="margin: 0; background: linear-gradient(180deg, #fbf6ef 0%, #f4ede3 100%); color: #3f2d20; font-family: Arial, sans-serif;">
        <div style="max-width: 960px; margin: 0 auto; padding: 48px 20px 64px;">
          <div style="max-width: 700px;">
            <div style="display: inline-block; padding: 8px 14px; border-radius: 999px; background: #f3e3d0; color: #9b6237; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
              RumahQu Email Studio
            </div>
            <h1 style="margin: 18px 0 12px; font-size: 40px; line-height: 1.1;">
              Preview template email RumahQu
            </h1>
            <p style="margin: 0; font-size: 17px; line-height: 1.8; color: #6b5848;">
              Buka salah satu template di bawah untuk melihat versi HTML yang dipakai saat pendaftaran dan lupa password.
            </p>
          </div>
          <div style="display: grid; gap: 20px; margin-top: 32px;">
            ${buildPreviewIndexCard(
              "Verifikasi Pendaftaran",
              "Versi hangat untuk menyambut keluarga baru yang baru mendaftar di RumahQu.",
              verificationHref,
              "#8b5e3c",
              "#c98d5b",
            )}
            ${buildPreviewIndexCard(
              "Reset Password",
              "Versi aman namun tetap ramah saat pengguna perlu mendapatkan kembali akses ke akunnya.",
              resetHref,
              "#6d8e5f",
              "#b97b4a",
            )}
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderEmailPreview(template: EmailPreviewTemplate, baseUrl: string, fullName = "Keluarga RumahQu") {
  if (template === "verification") {
    return buildVerificationEmailContent({
      email: "preview@rumahqu.local",
      fullName,
      verificationUrl: `${baseUrl}/auth?verified=1`,
    });
  }

  return buildPasswordResetEmailContent({
    email: "preview@rumahqu.local",
    fullName,
    resetUrl: `${baseUrl}/auth?mode=reset-password&token=preview-token-rumahqu`,
  });
}

async function getTransporter() {
  if (!env.SMTP_HOST) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
      }),
    );
  }

  return transporterPromise;
}

export async function sendVerificationEmail(input: SendVerificationEmailInput) {
  const transporter = await getTransporter();
  const { subject, text, html } = buildVerificationEmailContent(input);

  if (!transporter) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "SMTP belum dikonfigurasi, link verifikasi ditulis ke log",
        email: input.email,
        verificationUrl: input.verificationUrl,
      }),
    );
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.email,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  const transporter = await getTransporter();
  const { subject, text, html } = buildPasswordResetEmailContent(input);

  if (!transporter) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "SMTP belum dikonfigurasi, link reset password ditulis ke log",
        email: input.email,
        resetUrl: input.resetUrl,
      }),
    );
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.email,
    subject,
    text,
    html,
  });
}
