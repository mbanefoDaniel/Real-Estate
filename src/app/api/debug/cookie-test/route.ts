export const dynamic = "force-dynamic";

export async function GET() {
  const testValue = "test_token_" + Date.now();

  return new Response(
    JSON.stringify({ ok: true, testValue }),
    {
      status: 200,
      headers: [
        ["Content-Type", "application/json"],
        ["Set-Cookie", `nph_auth=${testValue}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure`],
        ["Set-Cookie", "cookie_test_visible=yes; SameSite=Lax; Path=/; Max-Age=300; Secure"],
      ],
    },
  );
}
