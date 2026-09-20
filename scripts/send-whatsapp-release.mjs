const [version, releaseUrl] = process.argv.slice(2);
const required = ["STUDYARC_SUPABASE_URL","STUDYARC_SUPABASE_SERVICE_ROLE_KEY","WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID","WHATSAPP_TEMPLATE_NAME"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required secret: ${key}`);
if (!version || !releaseUrl) throw new Error("Usage: node scripts/send-whatsapp-release.mjs <version> <releaseUrl>");

const sb = process.env.STUDYARC_SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: process.env.STUDYARC_SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.STUDYARC_SUPABASE_SERVICE_ROLE_KEY}` };
const usersRes = await fetch(`${sb}/rest/v1/whatsapp_release_subscribers?select=id,phone_e164&enabled=eq.true&consent_at=not.is.null`, { headers });
if (!usersRes.ok) throw new Error(`Subscriber lookup failed: ${usersRes.status} ${await usersRes.text()}`);
const users = await usersRes.json();
const graphVersion = "v23.0";
let failures = 0;
for (const user of users) {
  const body = {
    messaging_product: "whatsapp",
    to: user.phone_e164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US" },
      components: [{ type: "body", parameters: [
        { type: "text", text: version },
        { type: "text", text: releaseUrl }
      ]}]
    }
  };
  const res = await fetch(`https://graph.facebook.com/${graphVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const responseText = await res.text();
  const status = res.ok ? "sent" : "failed";
  if (!res.ok) failures++;
  await fetch(`${sb}/rest/v1/whatsapp_release_deliveries`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ subscriber_id: user.id, app_version: version, release_url: releaseUrl, status, provider_response: responseText.slice(0, 4000) })
  });
}
console.log(`WhatsApp release delivery complete: ${users.length - failures} sent, ${failures} failed.`);
if (failures) process.exitCode = 1;
