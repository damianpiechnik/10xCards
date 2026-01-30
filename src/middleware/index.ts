import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Public paths - Auth pages and API endpoints that don't require authentication
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/reset-password",
  "/auth/reset-password/confirm",
  "/auth/update-password",
  // Auth API endpoints
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/sign-out",
  "/api/auth/reset-password",
];

// Check if path is public
const isPublicPath = (pathname: string) => {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
};

// Check if path is API endpoint
const isApiPath = (pathname: string) => {
  return pathname.startsWith("/api/");
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request, redirect, locals } = context;
  const { pathname } = url;

  // Create Supabase server instance
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Store supabase client in locals
  locals.supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Store user and session in locals
  locals.user = user;
  locals.session = session;

  // Handle root path redirects
  if (pathname === "/") {
    if (!user) {
      return redirect("/auth/sign-in");
    }
    return redirect("/library");
  }

  // If user is logged in and tries to access auth pages, redirect to library
  if (user && isPublicPath(pathname) && !isApiPath(pathname)) {
    return redirect("/library");
  }

  // If path is public, allow access
  if (isPublicPath(pathname)) {
    return next();
  }

  // For API endpoints that are not public, require authentication
  if (isApiPath(pathname) && !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // For all other non-API paths, require authentication and redirect
  if (!user) {
    // Add redirect parameter to return user to intended destination
    const redirectUrl = `/auth/sign-in?redirect=${encodeURIComponent(pathname)}`;
    return redirect(redirectUrl);
  }

  return next();
});
