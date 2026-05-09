import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const loginRes = await fetch("https://boardgamegeek.com/login/api/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        credentials: { username, password },
      }),
      redirect: "manual",
    });

    // BGG returns 200 or 202 on success, 401 on bad credentials
    // Session cookies come back in set-cookie headers
    if (loginRes.status === 401 || loginRes.status === 403) {
      return NextResponse.json(
        { error: "Invalid BGG username or password" },
        { status: 401 }
      );
    }

    const setCookies = loginRes.headers.getSetCookie?.() ?? [];
    const bggCookies = setCookies
      .map((c) => c.split(";")[0])
      .filter((c) => c.startsWith("bggusername") || c.startsWith("bggpassword") || c.startsWith("SessionID"))
      .join("; ");

    if (!bggCookies) {
      return NextResponse.json(
        { error: "Login failed — no session returned. Check your credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json({ bggCookies, username });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
