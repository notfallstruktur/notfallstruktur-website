export const heute = () => new Date().toISOString().slice(0, 10);

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function leseJSON(request, maxBytes = 20000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("zu gross");
  return JSON.parse(text);
}
