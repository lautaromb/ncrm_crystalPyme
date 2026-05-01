/**
 * Página de configuración de Telegram del business.
 * Permite: activar/desactivar, obtener deep link, vincular grupo de notificaciones.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { TelegramSettingsClient } from "./_components/telegram-settings-client";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function TelegramSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const business = await prismadb.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      telegramConfigured: true,
      telegramChatId: true,
    },
  });

  if (!business) redirect("/");

  const contactCount = await prismadb.telegramContact.count({
    where: { businessId: business.id, isVerified: true },
  });

  return (
    <TelegramSettingsClient
      business={business}
      contactCount={contactCount}
    />
  );
}
