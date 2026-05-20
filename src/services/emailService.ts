import transporter from '../config/mailer';
import { IUser }   from '../types/index';

const FROM = process.env.MAIL_FROM || 'noreply@streamcart.dev';

// ── SHARED STYLES ─────────────────────────────────────────────
// Inline CSS is required for emails — most email clients strip <style> tags
const emailWrapper = (content: string): string => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
              max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;
              overflow:hidden;border:1px solid #E5E7EB">

    <!-- Header -->
    <div style="background:#7C3AED;padding:28px 32px">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">
        🛒 StreamCart
      </h1>
      <p style="color:#DDD6FE;margin:4px 0 0;font-size:13px">
        Live Shopping Platform
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB">
      <p style="color:#9CA3AF;font-size:12px;margin:0;text-align:center">
        StreamCart · Built with Node.js, MySQL, Socket.io & GraphQL<br>
        This is a college project email — not a real service
      </p>
    </div>
  </div>
`;

// ── 1. WELCOME EMAIL ──────────────────────────────────────────
// Sent after successful registration
export async function sendWelcomeEmail(user: Pick<IUser, 'name' | 'email' | 'role'>): Promise<void> {
  const isSeller = user.role === 'seller';

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:20px">
      Welcome to StreamCart, ${user.name}! 🎉
    </h2>
    <p style="color:#6B7280;font-size:15px;margin:0 0 24px;line-height:1.6">
      Your account has been created successfully as a
      <strong style="color:#7C3AED">${user.role}</strong>.
    </p>

    ${isSeller ? `
      <div style="background:#F5F3FF;border-radius:8px;padding:20px;margin-bottom:24px">
        <h3 style="color:#5B21B6;margin:0 0 12px;font-size:15px">
          As a seller you can:
        </h3>
        <ul style="color:#6B7280;font-size:14px;margin:0;padding-left:20px;line-height:2">
          <li>Create live streams to showcase your products</li>
          <li>Launch flash deals with real-time countdown timers</li>
          <li>Track orders and revenue from your dashboard</li>
          <li>Reach buyers watching your stream in real-time</li>
        </ul>
      </div>
      <a href="http://localhost:5000/dashboard.html"
         style="display:inline-block;background:#7C3AED;color:#ffffff;
                padding:12px 24px;border-radius:8px;font-weight:600;
                font-size:14px;text-decoration:none">
        Go to Dashboard →
      </a>
    ` : `
      <div style="background:#F0FDF4;border-radius:8px;padding:20px;margin-bottom:24px">
        <h3 style="color:#065F46;margin:0 0 12px;font-size:15px">
          As a buyer you can:
        </h3>
        <ul style="color:#6B7280;font-size:14px;margin:0;padding-left:20px;line-height:2">
          <li>Watch live streams and chat with sellers</li>
          <li>Buy products instantly during a stream</li>
          <li>Catch flash deals before they expire</li>
          <li>Track all your orders in one place</li>
        </ul>
      </div>
      <a href="http://localhost:5000/index.html"
         style="display:inline-block;background:#059669;color:#ffffff;
                padding:12px 24px;border-radius:8px;font-weight:600;
                font-size:14px;text-decoration:none">
        Browse Live Streams →
      </a>
    `}
  `);

  await transporter.sendMail({
    from:    `StreamCart <${FROM}>`,
    to:      `${user.name} <${user.email}>`,
    subject: `Welcome to StreamCart, ${user.name}!`,
    html,
  });

  console.log(`Welcome email sent to ${user.email}`);
}

// ── 2. ORDER CONFIRMATION EMAIL ───────────────────────────────
// Sent to buyer immediately after a successful checkout

interface OrderEmailData {
  buyerName:     string;
  buyerEmail:    string;
  orderId:       number;
  productName:   string;
  quantity:      number;
  totalPrice:    number;
  streamTitle:   string;
  usedFlashDeal: boolean;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const {
    buyerName, buyerEmail, orderId,
    productName, quantity, totalPrice,
    streamTitle, usedFlashDeal,
  } = data;

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 4px;font-size:20px">
      Order Confirmed! ✅
    </h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px">
      Order #${orderId}
    </p>

    ${usedFlashDeal ? `
      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;
                  padding:12px 16px;margin-bottom:20px;font-size:13px;color:#92400E">
        ⚡ <strong>Flash deal price applied!</strong>
        You caught this deal at the right moment.
      </div>
    ` : ''}

    <!-- Order summary table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="background:#F9FAFB">
        <td style="padding:10px 14px;font-size:13px;color:#6B7280;
                   border:1px solid #E5E7EB;font-weight:500">Product</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;
                   border:1px solid #E5E7EB">${productName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#6B7280;
                   border:1px solid #E5E7EB;font-weight:500">Stream</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;
                   border:1px solid #E5E7EB">${streamTitle}</td>
      </tr>
      <tr style="background:#F9FAFB">
        <td style="padding:10px 14px;font-size:13px;color:#6B7280;
                   border:1px solid #E5E7EB;font-weight:500">Quantity</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;
                   border:1px solid #E5E7EB">${quantity}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#6B7280;
                   border:1px solid #E5E7EB;font-weight:500">Total paid</td>
        <td style="padding:10px 14px;font-size:16px;font-weight:700;
                   color:#7C3AED;border:1px solid #E5E7EB">
          ₹${Number(totalPrice).toLocaleString('en-IN')}
        </td>
      </tr>
    </table>

    <p style="color:#6B7280;font-size:14px;margin:0 0 20px;line-height:1.6">
      Hi <strong>${buyerName}</strong>, your order has been confirmed.
      Thank you for shopping on StreamCart!
    </p>

    <a href="http://localhost:5000/index.html"
       style="display:inline-block;background:#7C3AED;color:#ffffff;
              padding:12px 24px;border-radius:8px;font-weight:600;
              font-size:14px;text-decoration:none">
      Browse More Streams →
    </a>
  `);

  await transporter.sendMail({
    from:    `StreamCart <${FROM}>`,
    to:      `${buyerName} <${buyerEmail}>`,
    subject: `Order confirmed — ${productName} 🛍️`,
    html,
  });

  console.log(`Order confirmation sent to ${buyerEmail} for order #${orderId}`);
}

// ── 3. STREAM STARTED EMAIL ───────────────────────────────────
// Sent to all buyers who previously ordered from this seller

interface StreamStartedData {
  sellerName:  string;
  streamTitle: string;
  streamId:    number;
  recipients:  Array<{ name: string; email: string }>;
}

export async function sendStreamStartedEmail(data: StreamStartedData): Promise<void> {
  const { sellerName, streamTitle, streamId, recipients } = data;

  if (!recipients.length) return;

  // Send to all recipients in parallel using Promise.all
  await Promise.all(
    recipients.map(recipient => {
      const html = emailWrapper(`
        <h2 style="color:#111827;margin:0 0 8px;font-size:20px">
          🔴 ${sellerName} is Live Now!
        </h2>
        <p style="color:#6B7280;font-size:15px;margin:0 0 24px;line-height:1.6">
          Hi <strong>${recipient.name}</strong>, a seller you've bought from before
          just started a new live stream.
        </p>

        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;
                    padding:20px;margin-bottom:24px;text-align:center">
          <div style="font-size:13px;color:#991B1B;font-weight:500;
                      margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">
            Now streaming
          </div>
          <div style="font-size:20px;font-weight:700;color:#7C3AED">
            ${streamTitle}
          </div>
        </div>

        <p style="color:#6B7280;font-size:14px;margin:0 0 20px">
          Flash deals are available during live streams only — 
          don't miss out!
        </p>

        <a href="http://localhost:5000/stream.html?id=${streamId}"
           style="display:inline-block;background:#DC2626;color:#ffffff;
                  padding:14px 28px;border-radius:8px;font-weight:700;
                  font-size:15px;text-decoration:none">
          🔴 Watch Live Now →
        </a>
      `);

      return transporter.sendMail({
        from:    `StreamCart <${FROM}>`,
        to:      `${recipient.name} <${recipient.email}>`,
        subject: `🔴 ${sellerName} is live — ${streamTitle}`,
        html,
      });
    })
  );

  console.log(`Stream-started emails sent to ${recipients.length} recipients`);
}

// ── 4. PASSWORD RESET EMAIL ───────────────────────────────────
// Bonus — useful for CE-2 viva

export async function sendPasswordResetEmail(
  email: string,
  name:  string,
  token: string
): Promise<void> {
  const resetUrl = `http://localhost:5000/reset-password?token=${token}`;

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:20px">
      Reset your password
    </h2>
    <p style="color:#6B7280;font-size:15px;margin:0 0 24px;line-height:1.6">
      Hi <strong>${name}</strong>, you requested a password reset.
      Click the button below — this link expires in 1 hour.
    </p>

    <a href="${resetUrl}"
       style="display:inline-block;background:#7C3AED;color:#ffffff;
              padding:12px 24px;border-radius:8px;font-weight:600;
              font-size:14px;text-decoration:none;margin-bottom:24px">
      Reset Password →
    </a>

    <p style="color:#9CA3AF;font-size:13px;margin:0">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);

  await transporter.sendMail({
    from:    `StreamCart <${FROM}>`,
    to:      `${name} <${email}>`,
    subject: 'Reset your StreamCart password',
    html,
  });

  console.log(`Password reset email sent to ${email}`);
}