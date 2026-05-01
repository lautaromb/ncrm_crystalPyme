"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateImageAction } from "@/actions/ai/generate-image";
import type { BusinessQuotaStatus } from "@/lib/ai/quota";
import { QuotaBar } from "./quota-bar";
import {
  Sparkles,
  Loader2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Wand2,
} from "lucide-react";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Tipos de imágenes generadas (local state)
// ---------------------------------------------------------------------------

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt: string;
  size: string;
  style: string;
  quality: string;
  createdAt: string;
}

interface Props {
  quota: BusinessQuotaStatus;
  initialImages: GeneratedImage[];
}

// ---------------------------------------------------------------------------
// Opciones de generación
// ---------------------------------------------------------------------------

const SIZE_OPTIONS = [
  { value: "1024x1024", label: "Cuadrada (1:1)", description: "1024 × 1024" },
  { value: "1792x1024", label: "Paisaje (16:9)", description: "1792 × 1024" },
  { value: "1024x1792", label: "Retrato (9:16)", description: "1024 × 1792" },
] as const;

const STYLE_OPTIONS = [
  {
    value: "vivid",
    label: "Vívido",
    description: "Colores intensos, dramático",
  },
  {
    value: "natural",
    label: "Natural",
    description: "Más realista y suave",
  },
] as const;

const QUALITY_OPTIONS = [
  { value: "standard", label: "Estándar", description: "Más rápido" },
  { value: "hd", label: "HD", description: "Mayor detalle, consume +1" },
] as const;

// Prompts de ejemplo por industria para inspirar al usuario
const EXAMPLE_PROMPTS = [
  "Logo minimalista para un negocio de tecnología con colores azul marino y dorado",
  "Banner publicitario para una concesionaria de autos de lujo, fondo oscuro, estilo cinematográfico",
  "Fotografía de producto para un spa de lujo, luz suave, flores blancas, estética premium",
  "Portada para redes sociales de una agencia de viajes, playa tropical al atardecer",
  "Imagen para promoción de café especial, bokeh, tonos cálidos, estética artesanal",
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ImageGenerator({ quota, initialImages }: Props) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">(
    "1024x1024"
  );
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [images, setImages] = useState<GeneratedImage[]>(initialImages);
  const [currentQuota, setCurrentQuota] = useState(quota);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canGenerate =
    currentQuota.images.allowed && prompt.trim().length > 0 && !isPending;

  function handleGenerate() {
    if (!canGenerate) return;
    startTransition(async () => {
      const result = await generateImageAction({ prompt, size, style, quality });

      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Error al generar imagen");
        return;
      }

      const newImage: GeneratedImage = {
        id: `local-${Date.now()}`,
        url: result.url,
        prompt,
        revisedPrompt: result.revisedPrompt ?? prompt,
        size,
        style,
        quality,
        createdAt: new Date().toISOString(),
      };

      setImages((prev) => [newImage, ...prev]);
      // Actualizar cuota optimistamente
      setCurrentQuota((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          used: prev.images.used + 1,
          remaining:
            prev.images.remaining !== null
              ? Math.max(0, prev.images.remaining - 1)
              : null,
          allowed:
            prev.images.limit === null ||
            prev.images.used + 1 < (prev.images.limit ?? Infinity),
        },
      }));

      toast.success("¡Imagen generada! 🎨");
    });
  }

  function handleExamplePrompt() {
    const random =
      EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setPrompt(random);
  }

  async function handleCopyUrl(image: GeneratedImage) {
    await navigator.clipboard.writeText(image.url);
    setCopiedId(image.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDownload(image: GeneratedImage) {
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `crystalpyme-ai-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("No se pudo descargar la imagen");
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Studio</h1>
          <p className="text-muted-foreground text-sm">
            Generá imágenes profesionales con DALL·E 3
          </p>
        </div>
      </div>

      {/* Quota */}
      <QuotaBar quota={currentQuota} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Panel izquierdo: configuración ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Configurar imagen
              </CardTitle>
              <CardDescription>
                Describí lo que querés generar con el mayor detalle posible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt" className="text-sm">
                    Descripción
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground"
                    onClick={handleExamplePrompt}
                    type="button"
                  >
                    <RefreshCw className="w-3 h-3" /> Ejemplo
                  </Button>
                </div>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Fotografía de producto para una hamburguesa gourmet, fondo oscuro, iluminación dramática, estilo culinario premium..."
                  className="resize-none min-h-[120px] text-sm"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {prompt.length}/1000
                </p>
              </div>

              {/* Tamaño */}
              <div className="space-y-1.5">
                <Label className="text-sm">Tamaño</Label>
                <Select
                  value={size}
                  onValueChange={(v) =>
                    setSize(v as typeof size)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estilo */}
              <div className="space-y-1.5">
                <Label className="text-sm">Estilo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStyle(opt.value as typeof style)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        style === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calidad */}
              <div className="space-y-1.5">
                <Label className="text-sm">Calidad</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setQuality(opt.value as typeof quality)
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        quality === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Costo estimado */}
              <div className="p-2.5 rounded-lg bg-muted/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Costo estimado
                </span>
                <Badge variant="outline" className="text-xs tabular-nums">
                  {quality === "standard"
                    ? size === "1024x1024"
                      ? "$0.04 USD"
                      : "$0.08 USD"
                    : size === "1024x1024"
                      ? "$0.08 USD"
                      : "$0.12 USD"}
                </Badge>
              </div>

              {/* Botón generar */}
              <Button
                className="w-full gap-2"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generar imagen
                  </>
                )}
              </Button>

              {!currentQuota.images.allowed && (
                <p className="text-xs text-red-500 text-center">
                  Cuota agotada. Se renueva el 1° de cada mes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Panel derecho: galería ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Preview de la generación actual (primera imagen) */}
          {isPending && (
            <div className="aspect-square rounded-2xl border bg-muted/40 flex flex-col items-center justify-center gap-3 animate-pulse">
              <Sparkles className="w-10 h-10 text-primary/40" />
              <p className="text-sm text-muted-foreground">
                DALL·E 3 está creando tu imagen…
              </p>
              <p className="text-xs text-muted-foreground/60">
                Puede tardar 10–20 segundos
              </p>
            </div>
          )}

          {!isPending && images.length === 0 && (
            <div className="aspect-square rounded-2xl border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Tus imágenes generadas aparecerán aquí
              </p>
            </div>
          )}

          {/* Galería */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((img, i) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  isCopied={copiedId === img.id}
                  isFeatured={i === 0}
                  onCopy={() => handleCopyUrl(img)}
                  onDownload={() => handleDownload(img)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageCard — tarjeta individual de imagen generada
// ---------------------------------------------------------------------------

interface ImageCardProps {
  image: GeneratedImage;
  isCopied: boolean;
  isFeatured: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

function ImageCard({
  image,
  isCopied,
  isFeatured,
  onCopy,
  onDownload,
}: ImageCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border bg-muted/30 ${
        isFeatured ? "sm:col-span-2" : ""
      }`}
    >
      {/* Imagen */}
      <div
        className={`relative w-full overflow-hidden ${
          isFeatured ? "aspect-video" : "aspect-square"
        }`}
      >
        <Image
          src={image.url}
          alt={image.prompt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized // DALL-E URLs son temporales, no optimizar
        />

        {/* Overlay con acciones */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end justify-end p-2 gap-1.5 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8"
            onClick={onCopy}
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8"
            onClick={onDownload}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Badge de calidad */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm"
          >
            {image.quality === "hd" ? "HD" : "STD"} · {image.size}
          </Badge>
        </div>
      </div>

      {/* Footer con prompt */}
      <div className="p-2.5">
        <button
          className="w-full text-left"
          onClick={() => setShowPrompt((v) => !v)}
          type="button"
        >
          <p
            className={`text-xs text-muted-foreground leading-relaxed ${
              showPrompt ? "" : "line-clamp-2"
            }`}
          >
            {image.revisedPrompt || image.prompt}
          </p>
          {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
            <p className="text-[10px] text-primary/60 mt-0.5">
              ✦ Prompt ajustado por DALL·E
            </p>
          )}
        </button>
      </div>
    </div>
  );
}
