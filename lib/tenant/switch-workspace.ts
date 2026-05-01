/**
 * Helper para cambiar el workspace activo desde el cliente.
 *
 * Setea la cookie `tenant-context` que `lib/tenant/context.ts` lee como
 * hint de contexto activo. Luego redirige a la ruta del tenant seleccionado.
 *
 * Uso (Client Component):
 *   import { switchToAgency, switchToBusiness } from "@/lib/tenant/switch-workspace"
 *   <button onClick={() => switchToAgency("mi-agency")}>...</button>
 */

"use client";

import { TENANT_CONTEXT_COOKIE } from "./context";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function setCookie(value: string) {
  document.cookie = `${TENANT_CONTEXT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Cambia al contexto Platform (superadmin) y navega al admin. */
export function switchToPlatform() {
  setCookie("PLATFORM");
  window.location.href = "/admin";
}

/** Cambia al contexto Agency por slug y navega al portal. */
export function switchToAgency(agencySlug: string) {
  setCookie(`AGENCY:${agencySlug}`);
  window.location.href = `/agency/${agencySlug}`;
}

/** Cambia al contexto Business por slug y navega al workspace. */
export function switchToBusiness(businessSlug: string) {
  setCookie(`BUSINESS:${businessSlug}`);
  window.location.href = `/b/${businessSlug}`;
}
