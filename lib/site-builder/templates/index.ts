/**
 * lib/site-builder/templates/index.ts
 * Registry central de templates.
 */

import type { TemplateDefinition, TemplateId, SiteContent } from "../types";
import { autodriveTemplate } from "./autodrive";
import { wanderlustTemplate } from "./wanderlust";
import { atelierTemplate } from "./atelier";

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  autodrive: autodriveTemplate,
  wanderlust: wanderlustTemplate,
  atelier: atelierTemplate,
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** Devuelve el contenido por defecto de un template, opcionalmente
 *  mergeado con overrides parciales del usuario. */
export function getTemplateDefaults(
  id: TemplateId,
  overrides?: DeepPartial<SiteContent>
): SiteContent {
  const base = TEMPLATES[id]?.defaults;
  if (!base) throw new Error(`Template "${id}" no encontrado`);
  if (!overrides) return base;
  return deepMerge(base, overrides) as SiteContent;
}

/** Validar que un string es un templateId válido. */
export function isValidTemplateId(id: string): id is TemplateId {
  return id in TEMPLATES;
}

// ---------------------------------------------------------------------------
// Deep merge simple (sin librerías externas)
// ---------------------------------------------------------------------------
function deepMerge(base: object, override: object): object {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const bVal = (base as Record<string, unknown>)[key];
    const oVal = (override as Record<string, unknown>)[key];
    if (
      oVal !== null &&
      typeof oVal === "object" &&
      !Array.isArray(oVal) &&
      typeof bVal === "object" &&
      bVal !== null &&
      !Array.isArray(bVal)
    ) {
      result[key] = deepMerge(bVal as object, oVal as object);
    } else if (oVal !== undefined) {
      result[key] = oVal;
    }
  }
  return result;
}
