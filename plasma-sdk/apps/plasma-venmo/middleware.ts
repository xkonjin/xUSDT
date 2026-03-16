import { NextRequest, NextResponse } from "next/server";

const PASSWORD = "plasma2026";
const COOKIE_NAME = "plasma-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE_NAME)?.value === PASSWORD) {
    return NextResponse.next();
  }

  const pw = request.nextUrl.searchParams.get("pw");
  if (pw === PASSWORD) {
    const url = new URL(request.nextUrl.pathname, request.url);
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  }

  return new NextResponse(LOGIN_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Access Required</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; color: #fff; }
  .card { background: #141414; border: 1px solid #222; border-radius: 16px; padding: 40px; width: 100%; max-width: 380px; }
  h1 { font-size: 20px; font-weight: 500; margin-bottom: 8px; }
  p { font-size: 14px; color: #707070; margin-bottom: 24px; }
  input { width: 100%; padding: 12px 16px; background: #0a0a0a; border: 1px solid #333; border-radius: 10px; color: #fff; font-size: 16px; outline: none; margin-bottom: 16px; }
  input:focus { border-color: #0088ff; }
  button { width: 100%; padding: 12px; background: #0088ff; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; }
  button:hover { background: #0077e6; }
</style>
</head>
<body>
<div class="card">
  <h1>Access Required</h1>
  <p>Enter the password to continue.</p>
  <form onsubmit="return go()">
    <input id="pw" type="password" placeholder="Password" autofocus />
    <button type="submit">Continue</button>
  </form>
</div>
<script>
function go() {
  var pw = document.getElementById('pw').value;
  if (!pw) return false;
  window.location.href = window.location.pathname + '?pw=' + encodeURIComponent(pw);
  return false;
}
</script>
</body>
</html>`;
