"use client";
/**
 * components/site-builder/site-renderer.tsx
 * Dispatcher: elige el componente de template correcto según templateId.
 */
import type { SiteContent, TemplateId } from "@/lib/site-builder/types";
import { AutodriveTemplate } from "./templates/autodrive";
import { WanderlustTemplate } from "./templates/wanderlust";
import { AtelierTemplate } from "./templates/atelier";

interface Props {
  templateId: TemplateId | string;
  content: SiteContent;
}

export function SiteRenderer({ templateId, content }: Props) {
  switch (templateId) {
    case "autodrive":
      return <AutodriveTemplate content={content} />;
    case "wanderlust":
      return <WanderlustTemplate content={content} />;
    case "atelier":
      return <AtelierTemplate content={content} />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Template "{templateId}" no encontrado.
        </div>
      );
  }
}
