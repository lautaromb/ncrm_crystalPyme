"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  BarChart3,
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

interface AgencySidebarProps extends React.ComponentProps<typeof Sidebar> {
  agencySlug: string;
  agencyName: string;
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  isSuperadmin: boolean;
  agencies: AgencyRef[];
  businesses: BusinessRef[];
}

function useNavItems(slug: string) {
  const base = `/agency/${slug}`;
  return [
    {
      group: "Agency",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, url: `${base}` },
        { title: "Businesses", icon: Building2, url: `${base}/businesses` },
        { title: "Equipo", icon: Users, url: `${base}/members` },
        { title: "Métricas", icon: BarChart3, url: `${base}/metrics` },
      ],
    },
    {
      group: "Cuenta",
      items: [
        { title: "Facturación", icon: CreditCard, url: `${base}/billing` },
        { title: "Configuración", icon: Settings, url: `${base}/settings` },
      ],
    },
  ];
}

export function AgencySidebar({
  agencySlug,
  agencyName,
  user,
  isSuperadmin,
  agencies,
  businesses,
  ...props
}: AgencySidebarProps) {
  const pathname = usePathname();
  const navGroups = useNavItems(agencySlug);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          isSuperadmin={isSuperadmin}
          agencies={agencies}
          businesses={businesses}
          activeType="AGENCY"
          activeSlug={agencySlug}
          activeName={agencyName}
        />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== `/agency/${agencySlug}` &&
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
        <NavUser user={{ id: user.id, name: user.name, email: user.email, avatar: user.image }} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
