"use client";
/**
 * components/site-builder/template-picker.tsx
 * Paso 1 del wizard: elegir plantilla.
 * UI fool-proof: cards grandes con preview visual, descripción y badge de categoría.
 */
import { TEMPLATE_LIST } from "@/lib/site-builder/templates";
import type { TemplateId } from "@/lib/site-builder/types";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  selected: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  onNext: () => void;
}

export function TemplatePicker({ selected, onSelect, onNext }: Props) {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Elegí tu plantilla</h2>
        <p className="text-muted-foreground text-lg">
          Cada plantilla es 100% personalizable. Podés cambiar textos, fotos y colores.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {TEMPLATE_LIST.map((t) => {
          const isSelected = selected === t.meta.id;
          return (
            <button
              key={t.meta.id}
              onClick={() => onSelect(t.meta.id)}
              className={cn(
                "group relative text-left rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary shadow-xl scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:shadow-md hover:scale-[1.01]"
              )}
            >
              {/* Preview visual */}
              <div className={cn("h-44 bg-gradient-to-br", t.meta.thumbnailGradient, "relative")} >
                {/* Decorative mock-browser */}
                <div className="absolute top-3 left-3 right-3 bottom-6 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center gap-1 p-2 border-b border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-400/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                    <div className="w-2 h-2 rounded-full bg-green-400/60" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded bg-white/20 w-3/4" />
                    <div className="h-2 rounded bg-white/10 w-full" />
                    <div className="h-2 rounded bg-white/10 w-5/6" />
                    <div className="mt-3 h-6 rounded-full bg-white/30 w-1/3" />
                  </div>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-10">
                    <CheckCircle2 className="w-7 h-7 text-primary drop-shadow-lg fill-white" />
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute bottom-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/40 text-white backdrop-blur-sm">
                    {t.meta.category}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5 bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: t.meta.accentColor }} />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{t.meta.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">{t.meta.description}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selected}
          onClick={onNext}
          className="min-w-[200px]"
        >
          Continuar con {selected ? TEMPLATE_LIST.find(t => t.meta.id === selected)?.meta.name : "la plantilla"}
          →
        </Button>
      </div>
    </div>
  );
}
