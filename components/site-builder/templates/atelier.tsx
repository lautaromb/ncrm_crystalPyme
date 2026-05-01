"use client";
/**
 * Template Atelier Studio — Salón de belleza & spa
 * Estética: soft luxury, ivory + rose gold, elegante y cálido
 */
import type { SiteContent } from "@/lib/site-builder/types";

interface Props { content: SiteContent }

export function AtelierTemplate({ content }: Props) {
  const c = content.colors;
  const b = content.brand;
  const whatsappUrl = b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, "")}` : "#";

  return (
    <div style={{ backgroundColor: c.primary, color: c.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: `${c.primary}f8`, borderBottom: `1px solid ${c.accent}25`,
        backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-widest uppercase" style={{ letterSpacing: "0.15em" }}>{b.name}</span>
            {b.tagline && <span className="text-xs font-light" style={{ color: c.textMuted, letterSpacing: "0.08em" }}>{b.tagline}</span>}
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: c.textMuted }}>
            {content.services.enabled && <a href="#servicios" className="transition-colors hover:text-inherit" style={{ color: c.textMuted }}>Servicios</a>}
            {content.gallery.enabled && <a href="#galeria" className="transition-colors" style={{ color: c.textMuted }}>Galería</a>}
            {content.about.enabled && <a href="#nosotros" className="transition-colors" style={{ color: c.textMuted }}>Nosotros</a>}
          </div>
          <a href="#contacto"
            className="px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: c.accent, color: c.ctaText }}>
            Reservar turno
          </a>
        </div>
      </nav>

      {/* ── HERO (split layout) ──────────────────────────────────── */}
      <section className="min-h-screen grid md:grid-cols-2">
        {/* Texto — izquierda */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 order-2 md:order-1">
          {content.hero.badge && (
            <span className="inline-block mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ color: c.accent, letterSpacing: "0.2em" }}>
              — {content.hero.badge}
            </span>
          )}
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6" style={{ fontStyle: "italic" }}>
            {content.hero.title}
            <br />
            <span style={{ color: c.accent, fontStyle: "normal" }}>{content.hero.titleAccent}</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-md" style={{ color: c.textMuted }}>
            {content.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            {content.hero.ctaPrimary && (
              <a href={content.hero.ctaPrimaryUrl}
                className="px-8 py-4 rounded-full font-semibold transition-all hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: c.accent, color: c.ctaText }}>
                {content.hero.ctaPrimary}
              </a>
            )}
            {content.hero.ctaSecondary && (
              <a href={content.hero.ctaSecondaryUrl}
                className="px-8 py-4 rounded-full font-semibold border transition-all hover:bg-black/5"
                style={{ borderColor: c.textMuted, color: c.textMuted }}>
                {content.hero.ctaSecondary}
              </a>
            )}
          </div>
          {/* Stats inline bajo los botones */}
          {content.about.stats.length > 0 && (
            <div className="flex gap-8 mt-12 pt-8 border-t" style={{ borderColor: `${c.accent}25` }}>
              {content.about.stats.slice(0, 3).map((s, i) => (
                <div key={i}>
                  <div className="text-2xl font-black" style={{ color: c.accent }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: c.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Imagen — derecha */}
        <div className="relative order-1 md:order-2 min-h-[60vw] md:min-h-0">
          {content.hero.imageUrl ? (
            <img src={content.hero.imageUrl} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.accent}30, ${c.surface})` }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 70%, rgba(250,248,243,0.2))" }} />
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────────── */}
      {content.services.enabled && (
        <section className="py-24 px-6" id="servicios" style={{ backgroundColor: c.surface }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: c.accent, letterSpacing: "0.2em" }}>
                Lo que hacemos
              </span>
              <h2 className="text-4xl font-black mt-3 mb-4">{content.services.title}</h2>
              <p style={{ color: c.textMuted }}>{content.services.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {content.services.items.map((item, i) => (
                <div key={i} className="group p-7 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: c.primary, border: `1px solid ${c.accent}15` }}>
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                      {item.price && (
                        <span className="text-sm font-semibold" style={{ color: c.accent }}>{item.price}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-4 leading-relaxed" style={{ color: c.textMuted }}>{item.description}</p>
                  <div className="mt-5 h-0.5 rounded-full w-0 group-hover:w-full transition-all duration-500"
                    style={{ backgroundColor: c.accent }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ─────────────────────────────────────────────── */}
      {content.gallery.enabled && content.gallery.images.length > 0 && (
        <section className="py-24 px-6" id="galeria">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: c.accent, letterSpacing: "0.2em" }}>
                Portfolio
              </span>
              <h2 className="text-4xl font-black mt-3">{content.gallery.title}</h2>
            </div>
            {/* Masonry-style grid */}
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {content.gallery.images.map((img, i) => (
                <div key={i} className="group break-inside-avoid relative overflow-hidden rounded-2xl">
                  <img src={img.url} alt={img.alt}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ aspectRatio: i % 3 === 0 ? "3/4" : "4/3" }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4"
                    style={{ background: `linear-gradient(to top, ${c.accent}90, transparent)` }}>
                    <span className="text-white text-sm font-semibold">{img.alt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      {content.about.enabled && (
        <section className="py-24 px-6" id="nosotros" style={{ backgroundColor: c.surface }}>
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: c.accent, letterSpacing: "0.2em" }}>
                Nuestra historia
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-3 mb-6">{content.about.title}</h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: c.textMuted }}>{content.about.body}</p>
              <a href="#contacto"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-4"
                style={{ color: c.accent }}>
                Reservar mi turno →
              </a>
            </div>
            {content.about.imageUrl && (
              <div className="relative">
                <img src={content.about.imageUrl} alt="Sobre nosotros"
                  className="w-full rounded-3xl object-cover shadow-xl"
                  style={{ aspectRatio: "4/5" }} />
                <div className="absolute -bottom-3 -right-3 px-5 py-3 rounded-2xl shadow-lg"
                  style={{ backgroundColor: c.accent, color: c.ctaText }}>
                  <div className="text-xl font-black">{content.about.stats[2]?.value ?? "100%"}</div>
                  <div className="text-xs">{content.about.stats[2]?.label ?? "Satisfacción"}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── BOOKING CTA ─────────────────────────────────────────── */}
      {content.contact.enabled && (
        <section className="py-24 px-6" id="contacto"
          style={{ background: `linear-gradient(135deg, ${c.accent}20 0%, ${c.primary} 100%)` }}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"
              style={{ backgroundColor: c.accent, color: c.ctaText }}>
              💆
            </div>
            <h2 className="text-4xl font-black mb-4">{content.contact.title}</h2>
            <p className="text-lg mb-12" style={{ color: c.textMuted }}>{content.contact.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {content.contact.showPhone && (
                <a href={`tel:${b.phone}`}
                  className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ backgroundColor: c.surface, border: `1px solid ${c.accent}20` }}>
                  <span>📞</span>
                  <span className="font-semibold">{b.phone}</span>
                </a>
              )}
              {content.contact.showEmail && (
                <a href={`mailto:${b.email}`}
                  className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ backgroundColor: c.surface, border: `1px solid ${c.accent}20` }}>
                  <span>✉️</span>
                  <span className="font-semibold">{b.email}</span>
                </a>
              )}
              {content.contact.showAddress && (
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl"
                  style={{ backgroundColor: c.surface, border: `1px solid ${c.accent}20` }}>
                  <span>📍</span>
                  <span className="font-semibold">{b.address}</span>
                </div>
              )}
            </div>
            {b.whatsapp && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-all hover:opacity-90 hover:shadow-2xl"
                style={{ backgroundColor: c.accent, color: c.ctaText }}>
                💬 Escribinos por WhatsApp
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center text-sm border-t" style={{ borderColor: `${c.accent}20`, color: c.textMuted }}>
        <p>{content.footer.text}</p>
      </footer>
    </div>
  );
}
