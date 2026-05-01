"use client";
/**
 * Template AutoDrive — Concesionaria de autos
 * Estética: dark luxury, navy + gold, bold sans-serif
 */
import type { SiteContent } from "@/lib/site-builder/types";

interface Props { content: SiteContent }

export function AutodriveTemplate({ content }: Props) {
  const c = content.colors;
  const b = content.brand;

  const whatsappUrl = b.whatsapp
    ? `https://wa.me/${b.whatsapp.replace(/\D/g, "")}`
    : "#";

  return (
    <div style={{ backgroundColor: c.primary, color: c.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: `${c.primary}ee`, borderBottom: `1px solid ${c.surface}` }}
        className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter" style={{ color: c.text }}>
            {b.name}
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: c.textMuted }}>
            {content.services.enabled && <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>}
            {content.gallery.enabled && <a href="#catalogo" className="hover:text-white transition-colors">Catálogo</a>}
            {content.contact.enabled && <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>}
          </div>
          {b.whatsapp && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
              style={{ backgroundColor: c.accent, color: c.ctaText }}>
              WhatsApp
            </a>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {content.hero.imageUrl && (
          <div className="absolute inset-0 z-0">
            <img src={content.hero.imageUrl} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.primary}f0 40%, ${c.primary}80 100%)` }} />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          {content.hero.badge && (
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border"
              style={{ borderColor: c.accent, color: c.accent }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
              {content.hero.badge}
            </div>
          )}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6 max-w-3xl">
            {content.hero.title}{" "}
            <span style={{ color: c.accent }}>{content.hero.titleAccent}</span>
          </h1>
          <p className="text-lg md:text-xl max-w-xl mb-10" style={{ color: c.textMuted }}>
            {content.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            {content.hero.ctaPrimary && (
              <a href={content.hero.ctaPrimaryUrl}
                className="px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 hover:shadow-2xl"
                style={{ backgroundColor: c.accent, color: c.ctaText,
                  boxShadow: `0 0 40px ${c.accent}40` }}>
                {content.hero.ctaPrimary}
              </a>
            )}
            {content.hero.ctaSecondary && (
              <a href={content.hero.ctaSecondaryUrl}
                className="px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider border transition-all hover:bg-white/10"
                style={{ borderColor: c.text, color: c.text }}>
                {content.hero.ctaSecondary}
              </a>
            )}
          </div>
        </div>
        {/* Stats bar */}
        {content.about.stats.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-10"
            style={{ backgroundColor: `${c.surface}cc`, backdropFilter: "blur(12px)", borderTop: `1px solid ${c.accent}30` }}>
            <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
              {content.about.stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-black" style={{ color: c.accent }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: c.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      {content.about.enabled && (
        <section className="py-24 px-6" id="nosotros">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-12 h-1 mb-6 rounded-full" style={{ backgroundColor: c.accent }} />
              <h2 className="text-4xl font-black tracking-tight mb-6">{content.about.title}</h2>
              <p className="text-lg leading-relaxed" style={{ color: c.textMuted }}>{content.about.body}</p>
            </div>
            {content.about.imageUrl && (
              <div className="relative">
                <img src={content.about.imageUrl} alt="Sobre nosotros"
                  className="w-full rounded-2xl object-cover aspect-[4/3]" />
                <div className="absolute -bottom-4 -right-4 w-full h-full rounded-2xl border-2 -z-10"
                  style={{ borderColor: c.accent }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SERVICES ────────────────────────────────────────────── */}
      {content.services.enabled && (
        <section className="py-24 px-6" id="servicios" style={{ backgroundColor: c.surface }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="w-12 h-1 mx-auto mb-6 rounded-full" style={{ backgroundColor: c.accent }} />
              <h2 className="text-4xl font-black tracking-tight mb-4">{content.services.title}</h2>
              <p style={{ color: c.textMuted }}>{content.services.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.services.items.map((item, i) => (
                <div key={i} className="group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: c.primary, borderColor: `${c.accent}20` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${c.accent}80`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${c.accent}20`)}>
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm mb-4" style={{ color: c.textMuted }}>{item.description}</p>
                  {item.price && (
                    <span className="text-sm font-semibold" style={{ color: c.accent }}>{item.price}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY / CATÁLOGO ──────────────────────────────────── */}
      {content.gallery.enabled && content.gallery.images.length > 0 && (
        <section className="py-24 px-6" id="catalogo">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="w-12 h-1 mx-auto mb-6 rounded-full" style={{ backgroundColor: c.accent }} />
              <h2 className="text-4xl font-black tracking-tight">{content.gallery.title}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {content.gallery.images.map((img, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl aspect-video">
                  <img src={img.url} alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4"
                    style={{ background: `linear-gradient(to top, ${c.primary}cc, transparent)` }}>
                    <span className="text-sm font-semibold">{img.alt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ─────────────────────────────────────────────── */}
      {content.contact.enabled && (
        <section className="py-24 px-6" id="contacto" style={{ backgroundColor: c.surface }}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-12 h-1 mx-auto mb-6 rounded-full" style={{ backgroundColor: c.accent }} />
            <h2 className="text-4xl font-black tracking-tight mb-4">{content.contact.title}</h2>
            <p className="mb-12" style={{ color: c.textMuted }}>{content.contact.subtitle}</p>
            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              {content.contact.showPhone && (
                <a href={`tel:${b.phone}`} className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all hover:-translate-y-1"
                  style={{ borderColor: `${c.accent}30`, backgroundColor: c.primary }}>
                  <span className="text-2xl">📞</span>
                  <span className="text-sm font-semibold">{b.phone}</span>
                </a>
              )}
              {content.contact.showEmail && (
                <a href={`mailto:${b.email}`} className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all hover:-translate-y-1"
                  style={{ borderColor: `${c.accent}30`, backgroundColor: c.primary }}>
                  <span className="text-2xl">✉️</span>
                  <span className="text-sm font-semibold">{b.email}</span>
                </a>
              )}
              {content.contact.showAddress && (
                <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border"
                  style={{ borderColor: `${c.accent}30`, backgroundColor: c.primary }}>
                  <span className="text-2xl">📍</span>
                  <span className="text-sm font-semibold">{b.address}</span>
                </div>
              )}
            </div>
            {b.whatsapp && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-all hover:scale-105"
                style={{ backgroundColor: c.accent, color: c.ctaText, boxShadow: `0 0 60px ${c.accent}40` }}>
                💬 Escribinos por WhatsApp
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center text-sm border-t" style={{ borderColor: c.surface, color: c.textMuted }}>
        <p>{content.footer.text}</p>
      </footer>
    </div>
  );
}
