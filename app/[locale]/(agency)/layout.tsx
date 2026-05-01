import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { requireAgencyContext, TenantError } from "@/lib/tenant";
import { getSession } from "@/lib/auth-server";
import { AvatarProvider } from "@/context/avatar-context";
import { AgencySidebar } from "./_components/agency-sidebar";
import { prismadb } from "@/lib/prisma";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let agencyId: string;
  let ctx: Awaited<ReturnType<typeof requireAgencyContext>>["ctx"];
  try {
    const result = await requireAgencyContext();
    agencyId = result.agencyId;
    ctx = result.ctx;
  } catch (err) {
    if (err instanceof TenantError) redirect("/sign-in");
    throw err;
  }

  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.userStatus === "PENDING") redirect("/pending");
  if (session.user.userStatus === "INACTIVE") redirect("/inactive");

  const agency = await prismadb.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true, slug: true },
  });
  if (!agency) redirect("/sign-in");

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
        <AgencySidebar
          agencySlug={agency.slug}
          agencyName={agency.name}
          user={user}
          isSuperadmin={ctx.isSuperadmin}
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
