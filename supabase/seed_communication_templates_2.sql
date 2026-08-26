insert into public.communication_templates (id, category, name, subject, html, description)
values
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
</html>$html$, 'Duka debt nudge from the credit book.'),
('low-stock', 'transactional', 'Low stock', 'Blue Band 250g is running out', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#B8472E;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">STOCK</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Blue Band 250g</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">is running out.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">4 tins left · reorder point 12</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Blue Band 250g has dropped below your reorder point. Restock before the weekend rush so you do not lose sales.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">SKU</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">BB-250</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">On hand</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">4</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Reorder at</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">12</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Vendor</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Bidco</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/inventory" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open inventory</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#B8472E;">TOO MANY ALERTS?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Adjust reorder points in Inventory, or mute this product from Settings → Alerts.</p>
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
</html>$html$, 'Inventory dropped below reorder point.'),
('trial-ending', 'transactional', 'Trial ending', '3 days left on your InuaBiz trial', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">TRIAL</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">3 days left</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">on trial.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Then KES 3,000 / month to keep the till</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Your 3-day trial is ending. Subscribe with M-Pesa so POS, receipts and stock alerts stay on. Nothing is deleted if you pause — you just cannot sell until you renew.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Plan</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Duka · monthly</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 3,000</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Trial ends</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">21 Aug 2026</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/billing" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Subscribe — KES 3,000</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NEED MORE TIME?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Reply to hello@inuabiz.co.ke if a delivery delayed you. We can extend a trial once.</p>
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
</html>$html$, 'Trial expiry reminder before KES 3,000 STK.'),
('subscription-paid', 'transactional', 'Subscription paid', 'You''re covered this month — KES 3,000', $html$<!DOCTYPE html>
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
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">You&#39;re covered</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">this month.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">KES 3,000 received · M-Pesa</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Asante. Your InuaBiz subscription is active until 18 Sep 2026. This is your receipt for the shop.</p>
                  
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
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Ref</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">THX9K2LP</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Next bill</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">18 Sep 2026</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/billing" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">View billing</a>
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
</html>$html$, 'M-Pesa subscription receipt.'),
('payment-stk-failed', 'transactional', 'Payment / STK failed', 'STK did not go through — KES 3,000', $html$<!DOCTYPE html>
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
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">KES 3,000 · subscription attempt</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">The M-Pesa prompt on 0712 345 678 was cancelled or timed out. Your till stays on trial until 21 Aug. Try again from Billing when you are next to the phone.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Amount</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 3,000</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Phone</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">0712 345 678</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Reason</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">User cancelled</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Time</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">18 Aug 2026, 09:14</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#B8472E;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/billing" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Retry payment</a>
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
</html>$html$, 'Cancelled or timed-out M-Pesa prompt.'),
('daily-summary', 'ops', 'Daily summary', 'Saturday till: KES 18,600 · 34 sales', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">SUMMARY</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Saturday</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">KES 18,600.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">34 sales · Mama Njoroge&#39;s Duka</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Here is yesterday&#39;s till. M-Pesa matched 31 of 34 sales. Three cash sales are waiting for you to confirm in reconciliation.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Sales</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 18,600</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Transactions</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">34</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">M-Pesa</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 16,240</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Credit given</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">KES 760</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Low stock</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Blue Band 250g</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/app/sales" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open the day</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">UNSUBSCRIBE</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Turn off daily email in Settings → Alerts. You will still get receipts and stock warnings.</p>
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
</html>$html$, 'End-of-day email if the vendor opted in under Settings → Alerts.'),
('broadcast-maintenance', 'ops', 'Broadcast — maintenance', 'Till pause tonight · 02:00–04:00 EAT', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#121816;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">NOTICE</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">Till pause</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">tonight.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">Sunday 02:00–04:00 EAT · M-Pesa stays up</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Mama Njoroge,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">We will take InuaBiz offline for a short database upgrade. You can still accept M-Pesa on the till number. Sales will sync when we are back.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Window</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">19 Aug 02:00–04:00 EAT</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">What breaks</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">App + admin</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">What works</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">M-Pesa STK on till</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#121816;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/maintenance" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Status page</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">NEED THE TILL NOW?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Write hello@inuabiz.co.ke if you must sell through the night and we will warn you before we start.</p>
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
</html>$html$, 'Admin broadcast with banner + email (banner_email channel).'),
('contact-ack', 'ops', 'Contact form ack', 'We got your note — InuaBiz', $html$<!DOCTYPE html>
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
                  <span style="display:inline-block;background:#F4A261;color:#1A1510;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">HELLO</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">We got</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">your note.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">hello@inuabiz.co.ke · usually same day</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello James Mwangi,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Asante for writing from the website. A person on the InuaBiz team will reply to this address. For till emergencies, WhatsApp the number on inuabiz.co.ke.</p>
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Topic</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">Wholesale invoices</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Ref</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">TKT-1184</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#0B6E4F;border-radius:999px;">
            <a href="https://app.inuabiz.co.ke/contact" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Visit help</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">THIS IS AN ACKNOWLEDGEMENT</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">Do not reply with OTP codes or M-Pesa PINs. We will never ask for them by email.</p>
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
</html>$html$, 'Acknowledgement from hello@inuabiz.co.ke / website contact.')
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
