export async function GET(request: Request) {
  const response = await fetch(new URL("/openapi-spec.yaml", request.url));
  if (!response.ok) return new Response("OpenAPI document is unavailable.", { status: 500 });
  const body = await response.text();
  return new Response(body, { headers: { "content-type": "application/yaml; charset=utf-8", "cache-control": "no-store" } });
}
