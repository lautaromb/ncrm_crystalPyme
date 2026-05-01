import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { requireSuperadmin, TenantError } from "@/lib/tenant";
import { getSession } from "@/lib/auth-server";
import { AvatarProvider } from "@/context/avatar-context";
import { PlatformSidebar } from "./_components/platform-sidebar";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx: Awaited<ReturnType<typeof requireSuperadmin>>;
  try {
    ctx = await requireSuperadmin();
  } catch (err) {
    if (err instanceof TenantError) redirect("/sign-in");
    throw err;
  }

  const session = await getSession();
  if (!session) redirect("/sign-in");

  const agencies = ctx.agencyMemberships.map((a) => ({
    agencyId: a.agencyId,
    agencySlug: a.agencySlug,
    agencyName: a.agencyName,
  }));
  const businesses = ctx.businessMemberships.map((b) => ({
    businessId: b.businessId,
    businessSlug: b.businessSlug,
    businessName: b.businessName,
  }));

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <AvatarProvider initialAvatar={user.image}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <PlatformSidebar
          user={user}
          agencies={agencies}
          businesses={businesses}
        />
        <SidebarInset>
          <div className="flex flex-col flex-grow overflow-y-auto h-full w-full min-w-0">
            <div className="flex-grow py-5 w-full min-w-0">
              <div className="w-full px-4 min-w-0">{children}</div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AvatarProvider>
  );
}
