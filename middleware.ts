/**
 * Next.js middleware para CrystalPyme.
 *
 * Responsabilidades:
 *  1. Internacionalización (next-intl): detecta/redirige locale.
 *  2. Tenant context: inyecta `x-tenant-context` a partir de la URL o
 *     subdominio, para que `lib/tenant/context.ts` lo lea sin DB en Edge.
 *  3. Auth guard ligero: redirige a /sign-in si no hay sesión de Better Auth.
 *     La validación completa ocurre en los layouts (server components).
 *
 * Formato del header `x-tenant-context`:
 *   PLATFORM          → superadmin area
 *   AGENCY:<slug>     → portal de agency (slug resuelto a UUID en context.ts)
 *   BUSINESS:<slug>   → workspace de business
 *
 * Subdominios (plan SUBDOMAIN / CUSTOM_DOMAIN):
 *   <agencySlug>.crystalpyme.app   → AGENCY:<agencySlug>
 *   <businessSlug>.crystalpyme.app → BUSINESS:<businessSlug>
 *   <custom>.com                   → BUSINESS:<custom> (custom domain, phase 11)
 */

import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { type NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "crystalpyme.app";
const TENANT_CONTEXT_HEADER = "x-tenant-context";

// Rutas que no requieren sesión (Better Auth + páginas públicas).
const PUBLIC_PATHS = [
  "/sign-in",
  "/api/auth",
  "/api/crm/leads/create-lead-from-web",
  "/api/crm/contacts/create-from-remote",
  "/api/campaigns/webhooks",
  "/api/campaigns/unsubscribe",
  "/api/webhooks/lemonsqueezy",
  "/api/webhooks/mercadopago",
  "/api/telegram/webhook",       // webhook del bot de Telegram
  "/s/",                         // sitios públicos generados por el site builder
];

// Rutas que requieren sesión pero NO memberships (onboarding, perfil).
const SEMI_PUBLIC_PATHS = ["/onboarding"];

// ---------------------------------------------------------------------------
// Internacionalización (next-intl)
// ---------------------------------------------------------------------------

const intlMiddleware = createMiddleware(routing);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrae el locale del pathname  (/en/...) o null si no hay. */
function extractLocale(pathname: string): string | null {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

/** Quita el prefijo de locale del pathname. */
function stripLocale(pathname: string, locale: string): string {
  if (pathname === `/${locale}`) return "/";
  if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  return pathname;
}

/**
 * Infiere el hint de tenant desde el pathname (sin locale).
 *
 * /admin/**              → PLATFORM
 * /agency/<slug>/**      → AGENCY:<slug>
 * /b/<slug>/**           → BUSINESS:<slug>
 * todo lo demás          → null (sin hint de ruta — usa cookie o fallback)
 */
function tenantHintFromPath(localelessPath: string): string | null {
  if (localelessPath === "/admin" || localelessPath.startsWith("/admin/")) {
    return "PLATFORM";
  }
  const agencyMatch = localelessPath.match(/^\/agency\/([^/]+)/);
  if (agencyMatch) return `AGENCY:${agencyMatch[1]}`;

  const businessMatch = localelessPath.match(/^\/b\/([^/]+)/);
  if (businessMatch) return `BUSINESS:${businessMatch[1]}`;

  return null;
}

/**
 * Infiere el hint de tenant desde el subdominio del host.
 *
 * <slug>.crystalpyme.app → necesitamos saber si es agency o business.
 * Como el middleware no tiene DB, setea `SUBDOMAIN:<slug>` y context.ts
 * resuelve revisando agencies primero y luego businesses.
 *
 * Para dominios custom (no *.crystalpyme.app), igual pasamos el host
 * completo y context.ts lo resuelve via TelegramContact o Site en fase 11.
 */
function tenantHintFromSubdomain(host: string): string | null {
  // Quitar puerto si lo hay (localhost:3000)
  const hostname = host.split(":")[0];

  // Subdominio de la plataforma: slug.crystalpyme.app
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = hostname.slice(0, -(PLATFORM_DOMAIN.length + 1));
    if (slug && slug !== "www") {
      // context.ts aceptará "slug" y buscará en agencies/businesses
      return `SUBDOMAIN:${slug}`;
    }
  }

  // Dominio custom (no es la plataforma ni localhost)
  if (
    !hostname.includes(PLATFORM_DOMAIN) &&
    !hostname.includes("localhost") &&
    !hostname.includes("127.0.0.1")
  ) {
    return `CUSTOM_DOMAIN:${hostname}`;
  }

  return null;
}

/**
 * Chequeo ligero de sesión Better Auth: verifica que exista la cookie de sesión.
 * La validación criptográfica completa la hace `getSession()` en server components.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token")
  );
}

/** True si el path es semi-público (requiere sesión, no memberships). */
function isSemiPublicPath(localelessPath: string): boolean {
  return SEMI_PUBLIC_PATHS.some(
    (p) => localelessPath === p || localelessPath.startsWith(p + "/")
  );
}

/** True si el path (sin locale) es público y no requiere sesión. */
function isPublicPath(localelessPath: string): boolean {
  for (const pub of PUBLIC_PATHS) {
    if (localelessPath === pub || localelessPath.startsWith(pub + "/")) {
      return true;
    }
  }
  // Archivos estáticos y rutas de Next.js internals
  if (
    localelessPath.startsWith("/_next/") ||
    localelessPath.startsWith("/favicon") ||
    localelessPath.startsWith("/images/") ||
    localelessPath.startsWith("/icons/")
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Middleware principal
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // 1. Delegar a next-intl (detecta locale, redirige /en → /)
  //    next-intl devuelve la respuesta final o NextResponse.next()
  const intlResponse = intlMiddleware(request);

  // Detectar el locale del pathname actual
  const locale = extractLocale(pathname) ?? routing.defaultLocale;
  const localelessPath = stripLocale(pathname, locale);

  // 2. Rutas públicas: no chequeamos sesión, pero igual inyectamos tenant hint
  if (isPublicPath(localelessPath)) {
    return intlResponse;
  }

  // 3. Auth guard: si no hay cookie de sesión, redirigir a sign-in.
  //    Excepción: /api/** no redirige, devuelve 401.
  if (!hasSessionCookie(request)) {
    if (localelessPath.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 3b. Si la ruta es semi-pública (onboarding), dejarla pasar con sesión.
  if (isSemiPublicPath(localelessPath)) {
    return intlResponse ?? NextResponse.next();
  }

  // 4. Tenant hint: ruta tiene prioridad sobre subdominio.
  const hint =
    tenantHintFromPath(localelessPath) ?? tenantHintFromSubdomain(host);

  // 5. Construir la respuesta final inyectando el header.
  //    Clonamos los headers de intlResponse para no perder lo que next-intl haya seteado.
  const response = intlResponse ?? NextResponse.next();
  if (hint) {
    response.headers.set(TENANT_CONTEXT_HEADER, hint);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Matcher: excluir archivos estáticos y rutas internas de Next.js
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Todas las rutas excepto _next/static, _next/image y archivos con extensión
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
