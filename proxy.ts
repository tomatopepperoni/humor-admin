import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next's static files and the favicon. No image-extension
    // exception here: the admin area has no public assets.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
