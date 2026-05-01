"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  Users,
  Package,
  Settings,
  ShieldCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { NavUser } from "@/app/[locale]/(routes)/components/nav-user";
import { WorkspaceSwitcher } from "@/components/tenant/workspace-switcher";
import type { AgencyRef, BusinessRef } from "@/components/tenant/workspace-switcher";
import { cn } from "@/lib/utils";

interface PlatformSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  agencies: AgencyRef[];
  businesses: BusinessRef[];
}

const NAV_GROUPS = [
  {
    group: "Platform",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/admin" },
      { title: "Agencies", icon: Briefcase, url: "/admin/agencies" },
      { title: "Planes", icon: Package, url: "/admin/plans" },
      { title: "Usuarios", icon: Users, url: "/admin/users" },
    ],
  },
  {
    group: "Finanzas",
    items: [
      { title: "Facturación", icon: CreditCard, url: "/admin/billing" },
      { title: "Invoices", icon: CreditCard, url: "/admin/invoices" },
    ],
  },
  {
    group: "Sistema",
    items: [
      { title: "Configuración", icon: Settings, url: "/admin/settings" },
    ],
  },
];

export function PlatformSidebar({
  user,
  agencies,
  businesses,
  ...props
}: PlatformSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          isSuperadmin={true}
          agencies={agencies}
          businesses={businesses}
          activeType="PLATFORM"
          activeName="CrystalPyme Admin"
        />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/admin" &&
                    pathname.startsWith(item.url + "/"));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon className={cn("size-4", isActive && "text-primary")} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3" />
            <span>Superadmin</span>
          </div>
        </div>
        <NavUser user={{ id: user.id, name: user.name, email: user.email, avatar: user.image }} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
