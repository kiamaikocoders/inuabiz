/**
 * InuaBiz transactional email chrome (Figma page "emails").
 * 560px column, forest + gold, rust for alerts. Email-safe tables only.
 */

export const FOREST = "#0B6E4F";
export const GOLD = "#F4A261";
export const CREAM = "#F7F4EF";
export const INK = "#121816";
export const MUTED = "#66736B";
export const WASH = "#F0EDE8";
export const WHITE = "#FFFFFF";
export const RUST = "#B8472E";
export const INK_GOLD = "#1A1510";

export type DetailRow = { label: string; value: string };

export type EmailTone = "forest" | "rust";

export type InuaBizEmailOpts = {
  siteUrl: string;
  badge: string;
  badgeFill?: string;
  badgeText?: string;
  headlineLine1: string;
  headlineLine2: string;
  heroSub: string;
  greeting?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  ctaFill?: string;
  ctaText?: string;
  details?: DetailRow[];
  noticeTitle?: string;
  noticeBody?: string;
  noticeColor?: string;
  heroTone?: EmailTone;
  /** Large 6-digit code. Pass `{{ .Token }}` for Gotrue auth HTML. */
  otpCode?: string;
};

/** Escape text for HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Public PNG of Option A · lifted duka (forest squircle, gold awning). */
export const LOGO_MARK_PATH = "/emails/inuabiz-logo.png";

function asset(siteUrl: string, path: string): string {
  const base = (siteUrl || "https://inuabiz.co.ke").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function logoSrc(siteUrl: string): string {
  return asset(siteUrl, LOGO_MARK_PATH);
}

function detailsBlock(rows: DetailRow[]): string {
  if (!rows.length) return "";
  const inner = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:${MUTED};width:120px;vertical-align:top;">${escapeHtml(r.label)}</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:${INK};font-weight:600;">${escapeHtml(r.value)}</td>
        </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:${WASH};border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${GOLD};letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner}</table>
      </td></tr>
    </table>`;
}

/** Muted paragraph matching the Figma body copy. */
export function p(text: string): string {
  return `<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:${MUTED};">${escapeHtml(text)}</p>`;
}

/**
 * Render a full HTML email matching the InuaBiz Figma templates.
 */
export function renderInuaBizEmail(opts: InuaBizEmailOpts): string {
  const site = opts.siteUrl.replace(/\/$/, "") || "https://inuabiz.co.ke";
  const greeting = opts.greeting ?? "Hello,";
  const heroBg = opts.heroTone === "rust" ? RUST : FOREST;
  const heroBgDark = opts.heroTone === "rust" ? "#471A14" : "#053828";
  const badgeFill = opts.badgeFill ?? GOLD;
  const badgeText = opts.badgeText ?? INK_GOLD;
  const ctaFill = opts.ctaFill ?? FOREST;
  const ctaText = opts.ctaText ?? CREAM;
  const noticeColor = opts.noticeColor ?? GOLD;
  const ctaHref = opts.ctaUrl || site;
  const otp = opts.otpCode
    ? `<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:32px;line-height:40px;font-weight:800;letter-spacing:0.18em;color:${INK};text-align:center;">${opts.otpCode}</p>`
    : "";
  const cta = opts.ctaLabel
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:${ctaFill};border-radius:999px;">
            <a href="${ctaHref}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:${ctaText};text-decoration:none;">${escapeHtml(opts.ctaLabel)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const notice =
    opts.noticeTitle && opts.noticeBody
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH};border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${noticeColor};">${escapeHtml(opts.noticeTitle)}</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:${MUTED};">${escapeHtml(opts.noticeBody)}</p>
        </td></tr>
      </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="${logoSrc(site)}" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:${INK};letter-spacing:-0.02em;">Inua<span style="color:${GOLD};">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${heroBg};border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:${heroBg};background-image:linear-gradient(135deg,${heroBg},${heroBgDark});border-radius:12px;">
                    <img src="${logoSrc(site)}" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH};border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:${badgeFill};color:${badgeText};font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">${escapeHtml(opts.badge)}</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:${INK};">${escapeHtml(opts.headlineLine1)}</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:${GOLD};">${escapeHtml(opts.headlineLine2)}</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:${MUTED};">${escapeHtml(opts.heroSub)}</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WHITE};border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:${INK};">${escapeHtml(greeting)}</p>
                  ${opts.bodyHtml}
                  ${otp}
                  ${detailsBlock(opts.details ?? [])}
                  ${cta}
                  ${notice}
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH};border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:${MUTED};">
                    <a href="${asset(site, "/contact")}" style="color:${MUTED};text-decoration:none;">Support</a>
                    ·
                    <a href="${asset(site, "/privacy")}" style="color:${MUTED};text-decoration:none;">Privacy</a>
                    ·
                    <a href="${asset(site, "/terms")}" style="color:${MUTED};text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:${MUTED};">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
