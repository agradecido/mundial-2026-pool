export function buildEmailHtml(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#070711;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#070711;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <span style="font-size:32px;">⚽</span>
              <p style="margin:8px 0 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#4b5563;">
                Porra Mundial 2026
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 28px;">

              <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f0f4f8;line-height:1.3;">
                ${subject}
              </h1>

              <div style="font-size:15px;line-height:1.7;color:#9ca3af;">
                ${body}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#374151;">
                Has recibido este email porque tienes una cuenta en la Porra Mundial 2026.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
