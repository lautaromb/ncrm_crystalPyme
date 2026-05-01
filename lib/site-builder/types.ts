/**
 * lib/site-builder/types.ts
 *
 * Tipos compartidos para el site builder.
 * El contenido de cada página se serializa como JSON en SitePage.content.
 */

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export type TemplateId = "autodrive" | "wanderlust" | "atelier";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  category: string;          // "Automotriz" | "Turismo" | "Belleza"
  thumbnailGradient: string; // Tailwind gradient class para el picker
  accentColor: string;       // hex — color destacado en el picker
}

// ---------------------------------------------------------------------------
// Contenido editable — almacenado en SitePage.content (JSON)
// ---------------------------------------------------------------------------

export interface SiteColors {
  primary: string;   // fondo principal
  accent: string;    // color de CTAs y highlights
  surface: string;   // fondo de cards / secciones alternas
  text: string;      // texto principal
  textMuted: string; // texto secundario
  ctaText: string;   // texto sobre botones de acento
}

export interface ServiceItem {
  icon: string;          // emoji
  title: string;
  description: string;
  price?: string;        // ej: "desde $5.000"
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface SiteStat {
  value: string; // "500+"
  label: string; // "Clientes satisfechos"
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  whatsapp: string;
  tiktok: string;
}

// ---------------------------------------------------------------------------
// Contenido completo del sitio
// ---------------------------------------------------------------------------

export interface SiteContent {
  // ── Marca global ─────────────────────────────────────────────────────────
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
  };

  // ── Colores del tema ─────────────────────────────────────────────────────
  colors: SiteColors;

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    badge: string;
    title: string;
    titleAccent: string;    // palabra(s) colorada(s) dentro del título
    subtitle: string;
    ctaPrimary: string;
    ctaPrimaryUrl: string;
    ctaSecondary: string;
    ctaSecondaryUrl: string;
    imageUrl: string;
  };

  // ── Sobre nosotros ───────────────────────────────────────────────────────
  about: {
    enabled: boolean;
    title: string;
    body: string;
    imageUrl: string;
    stats: SiteStat[];
  };

  // ── Servicios / productos / destinos ─────────────────────────────────────
  services: {
    enabled: boolean;
    title: string;
    subtitle: string;
    items: ServiceItem[];
  };

  // ── Galería ──────────────────────────────────────────────────────────────
  gallery: {
    enabled: boolean;
    title: string;
    images: GalleryImage[];
  };

  // ── Contacto ─────────────────────────────────────────────────────────────
  contact: {
    enabled: boolean;
    title: string;
    subtitle: string;
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    showForm: boolean;
  };

  // ── Social + footer ──────────────────────────────────────────────────────
  social: SocialLinks;
  footer: {
    text: string;
  };
}

// ---------------------------------------------------------------------------
// Tipo para la definición completa de un template (meta + defaults)
// ---------------------------------------------------------------------------

export interface TemplateDefinition {
  meta: TemplateMeta;
  defaults: SiteContent;
}
