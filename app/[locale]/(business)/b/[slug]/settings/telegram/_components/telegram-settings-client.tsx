"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  enableTelegram,
  disableTelegram,
  linkGroupChat,
} from "@/actions/telegram/configure";
import {
  MessageCircle,
  Copy,
  Check,
  Loader2,
  Users,
  Bell,
  Link2,
  ExternalLink,
} from "lucide-react";

interface Props {
  business: {
    id: string;
    name: string;
    slug: string;
    telegramConfigured: boolean;
    telegramChatId: string | null;
  };
  contactCount: number;
}

export function TelegramSettingsClient({ business, contactCount }: Props) {
  const [configured, setConfigured] = useState(business.telegramConfigured);
  const [chatId, setChatId] = useState(business.telegramChatId ?? "");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Deep link derivado del slug (no necesita llamada al servidor)
  const staticDeepLink = `https://t.me/CrystalPymeBot?start=biz_${business.slug}`;
  const displayLink = deepLink ?? staticDeepLink;

  function handleToggle(enabled: boolean) {
    startTransition(async () => {
      if (enabled) {
        const res = await enableTelegram();
        if (res.ok) {
          setConfigured(true);
          if (res.deepLink) setDeepLink(res.deepLink);
          toast.success("Telegram activado ✓");
        } else {
          toast.error(res.error ?? "Error al activar");
        }
      } else {
        const res = await disableTelegram();
        if (res.ok) {
          setConfigured(false);
          toast.success("Telegram desactivado");
        } else {
          toast.error(res.error ?? "Error al desactivar");
        }
      }
    });
  }

  function handleLinkChat() {
    startTransition(async () => {
      const res = await linkGroupChat(chatId);
      if (res.ok) {
        toast.success("Grupo vinculado ✓ — ahora recibirás notificaciones ahí");
      } else {
        toast.error(res.error ?? "Error al vincular");
      }
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(displayLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#229ED9]/15 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#229ED9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Telegram</h1>
          <p className="text-muted-foreground text-sm">
            Conectá clientes con {business.name} a través del bot
          </p>
        </div>
        <Badge className="ml-auto" variant={configured ? "default" : "secondary"}>
          {configured ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {/* Activar / Desactivar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Activar integración</CardTitle>
              <CardDescription>
                Permitir que tus clientes te contacten vía Telegram
              </CardDescription>
            </div>
            <Switch
              checked={configured}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </CardHeader>
      </Card>

      {configured && (
        <>
          {/* Stats */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contactCount}</p>
                  <p className="text-sm text-muted-foreground">Contactos verificados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deep link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Link para compartir con clientes
              </CardTitle>
              <CardDescription>
                Compartí este link. Al abrirlo, el bot les pedirá el teléfono y los vinculará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={displayLink}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
                <Button size="icon" variant="outline" onClick={copyLink} className="flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="outline" asChild className="flex-shrink-0">
                  <a href={displayLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Podés pegarlo en tu Instagram bio, WhatsApp de negocio o sitio web.
              </p>
            </CardContent>
          </Card>

          {/* Notificaciones al grupo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notificaciones al grupo
              </CardTitle>
              <CardDescription>
                Vinculá un grupo o chat de Telegram para recibir los mensajes de tus clientes en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="font-semibold">¿Cómo obtener el Chat ID?</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                  <li>Agregá <code className="bg-muted px-1 rounded">@CrystalPymeBot</code> a tu grupo</li>
                  <li>Enviá cualquier mensaje en el grupo</li>
                  <li>Entrá a <code className="bg-muted px-1 rounded">t.me/getmyid_bot</code> y reenviá el mensaje</li>
                  <li>Copiá el número negativo que aparece (ej: <code>-100123456789</code>)</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="chatId" className="text-xs">Chat ID del grupo</Label>
                  <Input
                    id="chatId"
                    value={chatId}
                    onChange={e => setChatId(e.target.value)}
                    placeholder="-100123456789"
                    className="font-mono"
                  />
                </div>
                <Button
                  onClick={handleLinkChat}
                  disabled={isPending || !chatId.trim()}
                  className="self-end"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
                </Button>
              </div>
              {business.telegramChatId && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Grupo vinculado: {business.telegramChatId}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
