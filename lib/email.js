const FROM = "Framework <onboarding@resend.dev>";

// Best-effort only, same pattern as fetchOEmbed/fetchYoutubeDescription -
// a failed or unconfigured send must never block signup.
export async function sendWelcomeEmail(email) {
  if (!process.env.RESEND_API_KEY || !email) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: "Welcome to Framework",
        html: "<p>Welcome to Framework — your account is ready.</p><p>Share a DIY video from Instagram, TikTok, or YouTube into the app to turn it into a project, or paste a link in Import to get started.</p>",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("sendWelcomeEmail failed:", res.status, await res.text());
  } catch (err) {
    console.error("sendWelcomeEmail error:", err);
  }
}
