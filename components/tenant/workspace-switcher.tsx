"use client";

/**
 * WorkspaceSwitcher
 *
 * Dropdown en el header del sidebar para cambiar entre workspaces:
 * Platform, agencies y businesses del usuario.
 *
 * Setea la cookie `tenant-context` y navega a la ruta del workspace elegido.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  Building2,
  Briefcase,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgencyRef {
  agencyId: string;
  agencySlug: string;
  agencyName: string;
}

export interface BusinessRef {
  businessId: string;
  businessSlug: string;
  businessName: string;
}

export interface WorkspaceSwitcherProps {
  isSuperadmin: boolean;
  agencies: AgencyRef[];
  businesses: BusinessRef[];
  /** Tipo de workspace actual: "PLATFORM" | "AGENCY" | "BUSINESS" */
  activeType: "PLATFORM" | "AGENCY" | "BUSINESS";
  /** Slug del tenant activo (para marcar el item seleccionado) */
  activeSlug?: string;
  /** Nombre para mostrar del workspace activo */
  activeName: string;
}

// ---------------------------------------------------------------------------
// Cookie helper (solo cliente)
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setTenantCookie(value: string) {
  document.cookie = `tenant-context=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkspaceSwitcher({
  isSuperadmin,
  agencies,
  businesses,
  activeType,
  activeSlug,
  activeName,
}: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const ActiveIcon =
    activeType === "PLATFORM"
      ? ShieldCheck
      : activeType === "AGENCY"
        ? Briefcase
        : Building2;

  function navigate(
    hint: string,
    path: string
  ) {
    setTenantCookie(hint);
    setOpen(false);
    router.push(path);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ActiveIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeName}</span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {activeType.toLowerCase()}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Platform */}
            {isSuperadmin && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Platform
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate("PLATFORM", "/admin")}
                  className="gap-2"
                >
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>Superadmin</span>
                  {activeType === "PLATFORM" && (
                    <Check className="ml-auto size-3" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Agencies */}
            {agencies.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Agencies
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {agencies.map((a) => (
                    <DropdownMenuItem
                      key={a.agencyId}
                      onClick={() =>
                        navigate(
                          `AGENCY:${a.agencySlug}`,
                          `/agency/${a.agencySlug}`
                        )
                      }
                      className="gap-2"
                    >
                      <Briefcase className="size-4 shrink-0" />
                      <span className="truncate">{a.agencyName}</span>
                      {activeType === "AGENCY" &&
                        activeSlug === a.agencySlug && (
                          <Check className="ml-auto size-3" />
                        )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Businesses */}
            {businesses.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Businesses
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {businesses.map((b) => (
                    <DropdownMenuItem
                      key={b.businessId}
                      onClick={() =>
                        navigate(
                          `BUSINESS:${b.businessSlug}`,
                          `/b/${b.businessSlug}`
                        )
                      }
                      className="gap-2"
                    >
                      <Building2 className="size-4 shrink-0" />
                      <span className="truncate">{b.businessName}</span>
                      {activeType === "BUSINESS" &&
                        activeSlug === b.businessSlug && (
                          <Check className="ml-auto size-3" />
                        )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
