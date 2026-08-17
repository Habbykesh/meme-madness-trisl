import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink, createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing_token", req.url));
  }

  const result = await verifyMagicLink(token);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/?error=${result.reason}`, req.url));
  }

  await createSession(result.userId);

  // ?signedIn=1 tells the client this is a fresh sign-in, which is what
  // triggers the 5-second-delayed music autoplay on the home page.
  return NextResponse.redirect(new URL("/?signedIn=1", req.url));
}
