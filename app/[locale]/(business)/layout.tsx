import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { requireBusinessContext, TenantError } from "@/lib/tenant";
import { getSession } from "@/lib/auth-server";
import { AvatarProvider } from "@/context/avatar-context";
import { CurrencyProvider } from "@/context/currency-context";
import { getEnabledCurrencies, getDefaultCurrency } from "@/lib/currency";
import { BusinessSidebar } from "./_components/business-sidebar";
import { prismadb } from "@/lib/prisma";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug?: string }>;
}) {
  // Auth y contexto
  let businessId: string;
  let ctx: Awaited<ReturnType<typeof requireBusinessContext>>["ctx"];
  try {
    const result = await requireBusinessContext();
    businessId = result.businessId;
    ctx = result.ctx;
  } catch (err) {
    if (err instanceof TenantError) redirect("/sign-in");
    throw err;
  }

  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.userStatus === "PENDING") redirect("/pending");
  if (session.user.userStatus === "INACTIVE") redirect("/inactive");

  // Datos del business activo
  const business = await prismadb.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true },
  });
  if (!business) redirect("/sign-in");

  // Memberships para el WorkspaceSwitcher
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

  // Sidebar state y currency
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const enabledCurrencies = await getEnabledCurrencies();
  const defaultCurrency = await getDefaultCurrency();
  const cookieCurrency = cookieStore.get("display_currency")?.value;
  const displayCurrency =
    cookieCurrency &&
    enabledCurrencies.some((c: { code: string }) => c.code === cookieCurrency)
      ? cookieCurrency
      : defaultCurrency;
  const currencyList = enabledCurrencies.map(
    (c: { code: string; name: string; symbol: string }) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
    })
  );

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <AvatarProvider initialAvatar={user.image}>
      <CurrencyProvider
        initialCurrency={displayCurrency}
        currencies={currencyList}
      >
        <SidebarProvider defaultOpen={sidebarOpen}>
          <BusinessSidebar
            businessSlug={business.slug}
            businessName={business.name}
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
      </CurrencyProvider>
    </AvatarProvider>
  );
}
