"use client";
/**
 * components/site-builder/site-editor.tsx
 *
 * Editor fool-proof: panel izquierdo con secciones colapsables + preview en vivo a la derecha.
 * Cada campo es un input/textarea simple. Sin drag-and-drop, sin complejidad.
 */
import { useState, useTransition, useCallback } from "react";
import type { SiteContent, TemplateId } from "@/lib/site-builder/types";
import { SiteRenderer } from "./site-renderer";
import { updateSite, publishSite } from "@/actions/site-builder/manage-site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronDown, Eye, Save, Globe, Loader2,
  Building2, Image, Palette, Phone, Layout, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  siteId: string;
  templateId: TemplateId;
  initialContent: SiteContent;
  businessSlug: string;
  isPublished: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Section({ icon, title, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 font-semibold text-sm">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="p-4 space-y-4 border-t">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SiteEditor({ siteId, templateId, initialContent, businessSlug, isPublished }: Props) {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  const update = useCallback(<K extends keyof SiteContent>(
    section: K,
    value: Partial<SiteContent[K]> | SiteContent[K]
  ) => {
    setContent(prev => ({
      ...prev,
      [section]: typeof value === "object" && !Array.isArray(value)
        ? { ...(prev[section] as object), ...(value as object) }
        : value,
    }));
  }, []);

  function handleSave() {
    startSave(async () => {
      const res = await updateSite(siteId, content);
      if (res.ok) toast.success("Cambios guardados ✓");
      else toast.error(res.error ?? "Error al guardar");
    });
  }

  function handlePublish() {
    startPublish(async () => {
      const res = await publishSite(siteId);
      if (res.ok) {
        toast.success(isPublished ? "Sitio actualizado en línea ✓" : "¡Sitio publicado! 🚀");
      } else {
        toast.error(res.error ?? "Error al publicar");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // PREVIEW ONLY
  // ---------------------------------------------------------------------------
  if (previewMode) {
    return (
      <div className="relative">
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full shadow-2xl border bg-background/90 backdrop-blur-md">
          <span className="text-sm font-medium text-muted-foreground">Vista previa</span>
          <Button size="sm" variant="outline" onClick={() => setPreviewMode(false)}>← Volver al editor</Button>
          <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
            {isPublished ? "Actualizar" : "Publicar"}
          </Button>
        </div>
        <div className="pt-16">
          <SiteRenderer templateId={templateId} content={content} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EDITOR (split panel)
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Panel izquierdo: formularios ── */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <span className="text-sm font-semibold">Editor de contenido</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreviewMode(true)}>
              <Eye className="w-4 h-4 mr-1" />Vista
            </Button>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> :
                <Globe className="w-4 h-4 mr-1" />}
              {isPublished ? "Actualizar" : "Publicar"}
            </Button>
          </div>
        </div>

        {/* Secciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ── Marca ── */}
          <Section icon={<Building2 className="w-4 h-4" />} title="Tu negocio" defaultOpen>
            <Field label="Nombre del negocio">
              <Input value={content.brand.name}
                onChange={e => update("brand", { name: e.target.value })} />
            </Field>
            <Field label="Slogan">
              <Input value={content.brand.tagline}
                onChange={e => update("brand", { tagline: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <Input value={content.brand.phone}
                onChange={e => update("brand", { phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={content.brand.email}
                onChange={e => update("brand", { email: e.target.value })} />
            </Field>
            <Field label="Dirección">
              <Input value={content.brand.address}
                onChange={e => update("brand", { address: e.target.value })} />
            </Field>
            <Field label="WhatsApp (con código de país)" hint="Ej: +5491123456789">
              <Input value={content.brand.whatsapp}
                onChange={e => update("brand", { whatsapp: e.target.value })} />
            </Field>
          </Section>

          {/* ── Hero ── */}
          <Section icon={<Layout className="w-4 h-4" />} title="Sección principal (hero)">
            <Field label="Título principal">
              <Textarea rows={2} value={content.hero.title}
                onChange={e => update("hero", { title: e.target.value })} />
            </Field>
            <Field label="Palabra(s) destacadas" hint="Se muestran con el color de acento">
              <Input value={content.hero.titleAccent}
                onChange={e => update("hero", { titleAccent: e.target.value })} />
            </Field>
            <Field label="Subtítulo">
              <Textarea rows={2} value={content.hero.subtitle}
                onChange={e => update("hero", { subtitle: e.target.value })} />
            </Field>
            <Field label="Botón principal (texto)">
              <Input value={content.hero.ctaPrimary}
                onChange={e => update("hero", { ctaPrimary: e.target.value })} />
            </Field>
            <Field label="Botón secundario (texto)">
              <Input value={content.hero.ctaSecondary}
                onChange={e => update("hero", { ctaSecondary: e.target.value })} />
            </Field>
            <Field label="URL de imagen de fondo" hint="Pegá el link de la imagen (jpg, png, webp)">
              <Input value={content.hero.imageUrl}
                onChange={e => update("hero", { imageUrl: e.target.value })} />
            </Field>
          </Section>

          {/* ── Servicios ── */}
          <Section icon={<Star className="w-4 h-4" />} title="Servicios / Productos">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Mostrar sección</span>
              <Switch checked={content.services.enabled}
                onCheckedChange={v => update("services", { enabled: v })} />
            </div>
            {content.services.enabled && (
              <>
                <Field label="Título de sección">
                  <Input value={content.services.title}
                    onChange={e => update("services", { title: e.target.value })} />
                </Field>
                <Field label="Subtítulo de sección">
                  <Input value={content.services.subtitle}
                    onChange={e => update("services", { subtitle: e.target.value })} />
                </Field>
                <div className="space-y-3">
                  {content.services.items.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <Input className="h-7 text-sm" value={item.title}
                          onChange={e => {
                            const items = [...content.services.items];
                            items[i] = { ...items[i], title: e.target.value };
                            update("services", { items });
                          }} />
                      </div>
                      <Textarea rows={2} className="text-xs resize-none" value={item.description}
                        onChange={e => {
                          const items = [...content.services.items];
                          items[i] = { ...items[i], description: e.target.value };
                          update("services", { items });
                        }} />
                      <Input className="h-7 text-sm" placeholder="Precio (opcional)" value={item.price ?? ""}
                        onChange={e => {
                          const items = [...content.services.items];
                          items[i] = { ...items[i], price: e.target.value };
                          update("services", { items });
                        }} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* ── Sobre nosotros ── */}
          <Section icon={<Building2 className="w-4 h-4" />} title="Sobre nosotros">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Mostrar sección</span>
              <Switch checked={content.about.enabled}
                onCheckedChange={v => update("about", { enabled: v })} />
            </div>
            {content.about.enabled && (
              <>
                <Field label="Título">
                  <Input value={content.about.title}
                    onChange={e => update("about", { title: e.target.value })} />
                </Field>
                <Field label="Texto">
                  <Textarea rows={4} value={content.about.body}
                    onChange={e => update("about", { body: e.target.value })} />
                </Field>
                <Field label="URL de imagen">
                  <Input value={content.about.imageUrl}
                    onChange={e => update("about", { imageUrl: e.target.value })} />
                </Field>
              </>
            )}
          </Section>

          {/* ── Galería ── */}
          <Section icon={<Image className="w-4 h-4" />} title="Galería de fotos">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Mostrar sección</span>
              <Switch checked={content.gallery.enabled}
                onCheckedChange={v => update("gallery", { enabled: v })} />
            </div>
            {content.gallery.enabled && (
              <>
                <Field label="Título de galería">
                  <Input value={content.gallery.title}
                    onChange={e => update("gallery", { title: e.target.value })} />
                </Field>
                <div className="space-y-2">
                  {content.gallery.images.map((img, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input className="text-xs" placeholder={`URL foto ${i + 1}`} value={img.url}
                        onChange={e => {
                          const images = [...content.gallery.images];
                          images[i] = { ...images[i], url: e.target.value };
                          update("gallery", { images });
                        }} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* ── Colores ── */}
          <Section icon={<Palette className="w-4 h-4" />} title="Colores del tema">
            {(["primary", "accent", "surface", "text", "textMuted"] as const).map(key => (
              <Field key={key} label={
                ({ primary: "Fondo principal", accent: "Color de acento (botones)", surface: "Fondo secundario", text: "Texto", textMuted: "Texto secundario" })[key]
              }>
                <div className="flex items-center gap-2">
                  <input type="color" value={content.colors[key]}
                    onChange={e => update("colors", { [key]: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer p-0.5 bg-transparent" />
                  <Input value={content.colors[key]}
                    onChange={e => update("colors", { [key]: e.target.value })}
                    className="font-mono text-sm" />
                </div>
              </Field>
            ))}
          </Section>

          {/* ── Contacto ── */}
          <Section icon={<Phone className="w-4 h-4" />} title="Sección de contacto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Mostrar sección</span>
              <Switch checked={content.contact.enabled}
                onCheckedChange={v => update("contact", { enabled: v })} />
            </div>
            {content.contact.enabled && (
              <>
                <Field label="Título"><Input value={content.contact.title}
                  onChange={e => update("contact", { title: e.target.value })} /></Field>
                <Field label="Subtítulo"><Input value={content.contact.subtitle}
                  onChange={e => update("contact", { subtitle: e.target.value })} /></Field>
                {(["showPhone", "showEmail", "showAddress"] as const).map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{{ showPhone: "Teléfono", showEmail: "Email", showAddress: "Dirección" }[key]}</span>
                    <Switch checked={content.contact[key]}
                      onCheckedChange={v => update("contact", { [key]: v })} />
                  </div>
                ))}
              </>
            )}
          </Section>

        </div>
      </div>

      {/* ── Panel derecho: preview en vivo ── */}
      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="p-2 bg-muted/20 border-b flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="w-3.5 h-3.5" />
          Vista previa en vivo — los cambios se aplican al instante
        </div>
        <div className="origin-top-left" style={{ transform: "scale(0.65)", width: "154%", height: "154%" }}>
          <SiteRenderer templateId={templateId} content={content} />
        </div>
      </div>
    </div>
  );
}
