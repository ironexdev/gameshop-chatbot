export async function sendChat(
  endpoint: string,
  sessionId: string,
  message: string
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) throw new Error(`chat http ${res.status}`);
  const data = (await res.json()) as { reply: string };
  return data.reply;
}
