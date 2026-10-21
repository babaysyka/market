import { NextResponse } from "next/server";
import { destroyServerSession, getSessionUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return NextResponse.json({ user });
}

export async function DELETE(request: Request) {
  await destroyServerSession(request);
  return NextResponse.json({ signedOut: true });
}
