import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { OnboardingWizard } from "./_components/onboarding-wizard";

/**
 * Página de onboarding.
 *
 * Acceso:
 *  - Requiere sesión activa. Sin sesión → /sign-in.
 *  - Si el usuario ya tiene al menos una membership (agency o business) →
 *    redirige a su workspace (no tiene sentido repetir el onboarding).
 */
export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const userId = session.user.id;

  // Verificar si ya completó el onboarding
  const [agencyCount, businessCount] = await Promise.all([
    prismadb.agencyMember.count({ where: { userId } }),
    prismadb.businessMember.count({ where: { userId } }),
  ]);

  if (agencyCount > 0 || businessCount > 0) {
    // Ya tiene memberships → ir al primer workspace disponible
    if (businessCount > 0) {
      const membership = await prismadb.businessMember.findFirst({
        where: { userId },
        include: { business: { select: { slug: true } } },
        orderBy: { joinedAt: "asc" },
      });
      if (membership?.business) redirect(`/b/${membership.business.slug}`);
    }
    if (agencyCount > 0) {
      const membership = await prismadb.agencyMember.findFirst({
        where: { userId },
        include: { agency: { select: { slug: true } } },
        orderBy: { joinedAt: "asc" },
      });
      if (membership?.agency) redirect(`/agency/${membership.agency.slug}`);
    }
    redirect("/");
  }

  return <OnboardingWizard userName={session.user.name} />;
}
