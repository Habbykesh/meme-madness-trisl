import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendMagicLinkEmail(email: string, username: string, rawToken: string) {
  const link = `${APP_URL}/api/auth/verify?token=${rawToken}`;

  await resend.emails.send({
    from: "Meme Madness Trial <trial@yourdomain.com>", // TODO: your verified sending domain
    to: email,
    subject: "Enter the Arena — your sign-in link",
    html: `
      <div style="font-family: monospace; background:#0A0A10; color:#F3EEE1; padding:32px;">
        <h1 style="color:#F4B942;">MEME MADNESS TRIAL</h1>
        <p>Hey ${username},</p>
        <p>Tap below to enter the arena. This link expires in 15 minutes and works once.</p>
        <p><a href="${link}" style="background:#FF5A5F;color:#0A0A10;padding:12px 24px;text-decoration:none;font-weight:bold;display:inline-block;">ENTER THE ARENA</a></p>
        <p style="color:#6B6B78;font-size:12px;">Unofficial fan build. Not affiliated with Cade Market Inc. No cash value.</p>
      </div>
    `,
  });
}
