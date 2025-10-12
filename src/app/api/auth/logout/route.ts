import { NextResponse } from "next/server";

function redirectToLogin(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url, { status: 303 });
  // Clear auth cookie
  res.cookies.set("auth_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}

export async function POST(req: Request) {
  return redirectToLogin(req);
}

export async function GET(req: Request) {
  return redirectToLogin(req);
}
