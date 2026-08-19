insert into public.communication_templates (id, category, name, subject, html, description)
values
('welcome-trial', 'auth', 'Welcome — trial started', 'Your till is live — 14-day trial', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">WELCOME</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Your till</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">is live.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Karibu to InuaBiz, Mama Njoroge.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Your 14-day trial is on. POS, M-Pesa reconciliation, duka debt and stock alerts are ready on this phone.</p>
                  
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open the till</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">DIDN&#39;T REQUEST THIS?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If this was not you, ignore this email or write hello@inuabiz.co.ke.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Sent after onboarding when a vendor starts the 14-day trial.'),
('invite-staff', 'auth', 'Invite staff', 'You''re invited to the till', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">INVITE</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">You&#39;re invited</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">to the till.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Mama Njoroge added you as a cashier.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Faith Wanjiku,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">You have been invited to sell on Mama Njoroge&#39;s duka. Open the link on this phone to join with OTP — no password to remember.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Shop</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Role</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Cashier</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Invited by</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="{{ .ConfirmationURL }}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Accept invite</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">WRONG PERSON?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If you do not work at this duka, ignore this email. The invite expires in 7 days.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Vendor admin invites a cashier. Join with OTP — no password.'),
('confirm-email', 'auth', 'Confirm email', 'Confirm this email for receipts & alerts', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">VERIFY</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Confirm this</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">email.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Receipts and alerts will land here.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Confirm njoroge.duka@gmail.com so we can send sale receipts, invoice copies and stock alerts. This does not change how you sign in — you still use your phone and OTP.</p>
                  
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="{{ .ConfirmationURL }}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Confirm email</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">DIDN&#39;T ADD THIS EMAIL?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If you did not add this address in Settings, ignore this message. Nothing changes until you tap confirm.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Settings → confirm address for receipts. Sign-in stays phone OTP.'),
('magic-link-admin', 'auth', 'Magic link — admin', 'Sign in to the InuaBiz desk', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#0B6E4F;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">ADMIN</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Sign in to</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">the desk.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">One-time link for zack@inuabiz.co.ke</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Zack,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Use this link on your laptop to open the InuaBiz command centre. It expires in 15 minutes and works once.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Account</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">zack@inuabiz.co.ke</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Expires</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">15 minutes</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Device</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Desktop</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="{{ .ConfirmationURL }}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open admin</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NOT YOU?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If you did not ask for a desktop session, ignore this email and tell the team in #ops.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'One-time desktop link for super-admin (zack@inuabiz.co.ke).'),
('confirm-its-you', 'auth', 'Confirm it''s you', 'Confirm it''s you — shop impersonation', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#B8472E;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#B8472E;background-image:linear-gradient(135deg,#B8472E,#471A14);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">SECURITY</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Confirm it&#39;s</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">you.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Someone is about to impersonate a shop.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Zack,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Support asked to view Mama Njoroge&#39;s Duka as an operator. Confirm this is you before the session starts. This is logged.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Shop</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Action</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Impersonate</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">IP</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">41.90.xx.xx</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="{{ .ConfirmationURL }}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Yes, it&#39;s me</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">DIDN&#39;T ASK FOR THIS?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Do not tap the button. Write hello@inuabiz.co.ke immediately — someone may be trying to open a shop as you.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Re-auth before impersonation or sensitive billing.'),
('sale-receipt', 'transactional', 'Sale receipt', 'Receipt for KES 905 — Mama Njoroge''s Duka', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#0B6E4F;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">RECEIPT</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Receipt for</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">KES 905.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Mama Njoroge&#39;s Duka · 18 Aug 2026, 16:42</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Peter O.,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Thank you for shopping with us. Your M-Pesa payment went through. Keep this for your records.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Till</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Method</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">M-Pesa</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Ref</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">QJI7XK2M</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Items</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Blue Band 250g · 2kg sugar</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/sales" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">View receipt</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NEED A COPY?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">This is a customer receipt, not a tax invoice. For wholesale invoices ask the shopkeeper.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'POS “Send email receipt” after an M-Pesa sale.'),
('wholesale-invoice', 'transactional', 'Wholesale invoice sent', 'Invoice INV-2041 from Mama Njoroge''s Duka', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#0B6E4F;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">INVOICE</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Invoice</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">INV-2041.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Kariobangi Wholesalers · due 25 Aug</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Kariobangi Wholesalers,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Mama Njoroge&#39;s Duka has sent you a wholesale invoice. Pay by M-Pesa or on delivery as agreed. A PDF copy is attached when we send live mail.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">From</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 12,400</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Due</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">25 Aug 2026</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Terms</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Net 7</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/invoices" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open invoice</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NOT YOUR ORDER?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Reply to this email or call the duka before the due date so we can void it.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Wholesale invoice emailed to a buyer (Kariobangi Wholesalers).'),
('invoice-overdue', 'transactional', 'Invoice overdue', 'INV-2041 is overdue — KES 12,400', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#B8472E;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#B8472E;background-image:linear-gradient(135deg,#B8472E,#471A14);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">OVERDUE</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">INV-2041</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">is overdue.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">KES 12,400 · 3 days past due</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Kariobangi Wholesalers,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">This invoice is now 3 days past the due date. Please settle so we can keep your credit line open for the next delivery.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Invoice</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">INV-2041</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 12,400</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Was due</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">25 Aug 2026</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Shop</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/invoices" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Pay now</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">ALREADY PAID?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If you have paid, send the M-Pesa code to the duka so they can mark it received.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Net-7 invoice past due; keep the credit line open.'),
('credit-reminder', 'transactional', 'Credit reminder', 'Ali Hassan still owes KES 760', $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="{{ .SiteURL }}/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">CREDIT</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Ali Hassan</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">owes KES 760.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Duka debt · 5 days on the book</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">A gentle nudge you asked us to send. Ali Hassan still has KES 760 on credit from last Thursday&#39;s sale. You can mark it paid from the till when he settles.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Customer</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Ali Hassan</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Balance</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 760</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Since</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">14 Aug 2026</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Last sale</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Sugar 2kg + cooking oil</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/credit" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open credit book</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">CUSTOMER COPY</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">This reminder was also sent to the number on Ali&#39;s profile if one is saved.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="{{ .SiteURL }}/contact" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$, 'Duka debt nudge from the credit book.')
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
