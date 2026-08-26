insert into public.communication_templates (id, category, name, subject, html, description)
values
('unclaimed-payment', 'transactional', 'Unclaimed payment', 'KES 1,200 unmatched on your till', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">OPS</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">KES 1,200</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">unmatched.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">M-Pesa hit the till with no open sale</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Someone paid KES 1,200 to your till but it did not match a sale. Claim it from Unclaimed payments or refund if you do not recognise the name.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 1,200</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Payer</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">J. Kamau</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Time</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">18 Aug 2026, 11:03</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Till</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="https://admin.inuabiz.co.ke/admin/unclaimed" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Claim payment</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">UNKNOWN PAYER?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If the name is not a customer, do not allocate it to a random sale. Use refund from the ops screen.</p>
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
</html>$html$, 'M-Pesa hit the till with no open sale.'),
('password-reset', 'auth', 'Password reset', 'Reset your InuaBiz password', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">RESET</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Reset your</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">password.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">This link works once and expires in 15 minutes.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Someone asked to reset the password for this InuaBiz account. If it was you, tap the button. If not, ignore this email — your password stays the same.</p>
                  
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="{{ .ConfirmationURL }}" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Reset password</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">DIDN&#39;T ASK FOR THIS?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">We will never ask for your password or M-Pesa PIN by email.</p>
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
</html>$html$, 'Auth recovery for email/password vendors. Link works once.'),
('onboarding-incomplete', 'auth', 'Finish shop setup', 'Finish setting up your InuaBiz shop', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">SETUP</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Finish setting</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">up your shop.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">You signed up but POS stays locked until shop setup is done.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Sign in and finish category, location and M-Pesa destination. Your 3-day trial starts when onboarding completes.</p>
                  
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/onboarding" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Continue setup</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">STUCK?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Write hello@inuabiz.co.ke if you cannot get back into setup.</p>
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
</html>$html$, 'Drop-off lock: signed up but did not complete onboarding.'),
('extra-shop-paid', 'transactional', 'Extra shop paid', 'New shop is paid for — KES 3,000', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#0B6E4F;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">PAID</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">New shop is</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">paid for.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Ngara branch · KES 3,000</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Asante. The new location is now on your account. Monthly billing is KES 3,000 times the number of shops.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 3,000</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Method</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">M-Pesa</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Shop</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Ngara branch</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/shops" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open shops</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NOT YOUR PAYMENT?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If this STK was not you, write hello@inuabiz.co.ke with the M-Pesa code.</p>
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
</html>$html$, 'STK succeeded; extra shop row inserted.'),
('extra-shop-failed', 'transactional', 'Extra shop STK failed', 'Extra shop PIN did not go through — KES 3,000', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">FAILED</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">STK did not</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">go through.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">KES 3,000 · extra shop</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">The PIN for the extra shop did not go through. That location was not created. Try again from Shops when you are next to the phone.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 3,000</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Reason</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">User cancelled</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/shops" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Retry from Shops</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">MONEY LEFT YOUR PHONE?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">If you were charged but we show failed, send the M-Pesa SMS to hello@inuabiz.co.ke and we will match it.</p>
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
</html>$html$, 'Extra-shop STK cancelled or timed out; shop was not created.'),
('fiscal-invoice', 'transactional', 'Fiscal invoice', 'Tax invoice INB-2026-0042 — Mama Njoroge''s Duka', $html$<!DOCTYPE html>
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
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Tax invoice</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">INB-2026-0042.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Mama Njoroge&#39;s Duka · audit-ready record</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Peter O.,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">This is your audit-ready tax invoice (ETR) from the till.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Invoice</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">INB-2026-0042</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 905</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">VAT</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Rate A 16%</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Till</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Mama Njoroge&#39;s Duka</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/sales" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open invoice</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NOT A KRA CONTROL UNIT</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">InuaBiz generated this ETR record for your shop. It is not a KRA control-unit printout.</p>
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
</html>$html$, 'Audit-ready INB-YYYY-NNNN invoice after a PAID/CREDIT sale.')
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
