"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Briefcase,
  FileText,
  Mail,
  Receipt,
  KanbanSquare,
  BarChart3,
  Megaphone,
  Settings,
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
import type {
  AgencyRef,
  BusinessRef,
} from "@/components/tenant/workspace-switcher";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessSidebarProps extends React.ComponentProps<typeof Sidebar> {
  businessSlug: string;
  businessName: string;
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  isSuperadmin: boolean;
  agencies: AgencyRef[];
  businesses: BusinessRef[];
}

// ---------------------------------------------------------------------------
// Nav items para el workspace de business
// Rutas relativas al slug: /b/[slug]/...
// Rutas de CRM existentes apuntan a /(routes) mientras no se migren.
// ---------------------------------------------------------------------------

function useNavItems(slug: string) {
  const base = `/b/${slug}`;
  return [
    {
      group: "CRM",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, url: `${base}/crm/dashboard` },
        { title: "Contactos", icon: Users, url: `/crm/contacts` },
        { title: "Leads", icon: Target, url: `/crm/leads` },
        { title: "Oportunidades", icon: Briefcase, url: `/crm/opportunities` },
        { title: "Cuentas", icon: FileText, url: `/crm/accounts` },
        { title: "Contratos", icon: FileText, url: `/crm/contracts` },
        { title: "Productos", icon: Receipt, url: `/crm/products` },
      ],
    },
    {
      group: "Operaciones",
      items: [
        { title: "Kanban", icon: KanbanSquare, url: `/projects` },
        { title: "Campañas", icon: Megaphone, url: `/campaigns` },
        { title: "Emails", icon: Mail, url: `/emails` },
        { title: "Documentos", icon: FileText, url: `/documents` },
        { title: "Facturas", icon: Receipt, url: `/invoices` },
      ],
    },
    {
      group: "Análisis",
      items: [
        { title: "Reportes", icon: BarChart3, url: `/reports` },
      ],
    },
    {
      group: "Configuración",
      items: [
        { title: "Settings", icon: Settings, url: `${base}/settings` },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BusinessSidebar({
  businessSlug,
  businessName,
  user,
  isSuperadmin,
  agencies,
  businesses,
  ...props
}: BusinessSidebarProps) {
  const pathname = usePathname();
  const navGroups = useNavItems(businessSlug);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          isSuperadmin={isSuperadmin}
          agencies={agencies}
          businesses={businesses}
          activeType="BUSINESS"
          activeSlug={businessSlug}
          activeName={businessName}
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
                  pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon
                          className={cn(
                            "size-4",
                            isActive && "text-primary"
                          )}
                        />
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
