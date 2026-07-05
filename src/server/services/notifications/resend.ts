// Resend — transakční emaily (magic link, petition milestone, watch alert)

import { Resend } from "resend";
import { env } from "~/lib/env";
import { logger } from "~/lib/logger";

const resend = env.AUTH_RESEND_KEY ? new Resend(env.AUTH_RESEND_KEY) : null;

const FROM_DEFAULT = "Sněmovna ČR <noreply@snemovna-cr.cz>";

export interface SendParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendParams) {
  if (!resend) {
    logger.warn({ to, subject }, "Resend není nakonfigurován — email přeskočen");
    return { id: "skipped" as const };
  }
  const result = await resend.emails.send({
    from: FROM_DEFAULT,
    to,
    subject,
    html: html ?? `<p>${text ?? subject}</p>`,
    text,
  });
  return result;
}

export async function sendNotificationEmail({
  to,
  subject,
  targetType,
  targetId,
}: {
  to: string;
  subject: string;
  targetType: string;
  targetId: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/${targetType === "HLASOVANI" ? "hlasovani" : targetType === "TISK" ? "navrhy" : targetType.toLowerCase()}/${targetId}`;

  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">${subject}</h2>
        <p>Sledujete <strong>${targetType}</strong> v aplikaci Sněmovna ČR.</p>
        <p><a href="${url}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none;">Otevřít detail</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="font-size: 12px; color: #6b7280;">Tuto notifikaci jste dostali, protože sledujete daný cíl. Spravovat můžete ve svém dashboardu.</p>
      </div>
    `,
    text: `${subject}\n\nOtevřít: ${url}`,
  });
}