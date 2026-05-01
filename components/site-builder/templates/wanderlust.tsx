"use client";
/**
 * Template WanderlustCo — Coordinador de viajes
 * Estética: warm earth tones, cream + terracotta, inspiracional
 */
import type { SiteContent } from "@/lib/site-builder/types";

interface Props { content: SiteContent }

export function WanderlustTemplate({ content }: Props) {
  const c = content.colors;
  const b = content.brand;
  const whatsappUrl = b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, "")}` : "#";

  return (
    <div style={{ backgroundColor: c.primary, color: c.text, fontFamily: "'Inter', Georgia, serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: `${c.primary}f0`, borderBottom: `1px solid ${c.accent}20` }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight" style={{ color: c.text }}>🌍</span>
            <span className="text-lg font-bold">{b.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: c.textMuted }}>
            {content.services.enabled && <a href="#destinos" className="hover:underline decoration-2 underline-offset-4 transition-all"
              style={{ textDecorationColor: c.accent }}>Destinos</a>}
            {content.about.enabled && <a href="#nosotros" className="hover:underline decoration-2 underline-offset-4 transition-all"
              style={{ textDecorationColor: c.accent }}>Nosotros</a>}
            {content.contact.enabled && <a href="#contacto" className="hover:underline decoration-2 underline-offset-4 transition-all"
              style={{ textDecorationColor: c.accent }}>Contacto</a>}
          </div>
          {content.hero.ctaPrimary && (
            <a href={content.hero.ctaPrimaryUrl}
              className="hidden md:flex px-5 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: c.accent, color: c.ctaText }}>
              {content.hero.ctaPrimary}
            </a>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {content.hero.imageUrl && (
          <div className="absolute inset-0">
            <img src={content.hero.imageUrl} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, ${c.primary}30 0%, ${c.primary}70 60%, ${c.primary} 100%)` }} />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
          {content.hero.badge && (
            <span className="inline-block mb-6 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: `${c.accent}20`, color: c.accent, border: `1px solid ${c.accent}40` }}>
              {content.hero.badge}
            </span>
          )}
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
            {content.hero.title}
            <br />
            <span style={{ color: c.accent }}>{content.hero.titleAccent}</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: c.text, opacity: 0.85 }}>
            {content.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {content.hero.ctaPrimary && (
              <a href={content.hero.ctaPrimaryUrl}
                className="px-8 py-4 rounded-full font-bold transition-all hover:scale-105 shadow-xl"
                style={{ backgroundColor: c.accent, color: c.ctaText }}>
                ✈️ {content.hero.ctaPrimary}
              </a>
            )}
            {content.hero.ctaSecondary && (
              <a href={content.hero.ctaSecondaryUrl}
                className="px-8 py-4 rounded-full font-bold border-2 transition-all hover:bg-white/20"
                style={{ borderColor: c.text, color: c.text, backdropFilter: "blur(4px)" }}>
                {content.hero.ctaSecondary}
              </a>
            )}
          </div>
        </div>
        {/* Stats floating bar */}
        {content.about.stats.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-6">
            <div className="flex justify-around items-center py-5 px-8 rounded-2xl shadow-2xl"
              style={{ backgroundColor: c.surface, border: `1px solid ${c.accent}20` }}>
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

      {/* ── SERVICES / DESTINOS ─────────────────────────────────── */}
      {content.services.enabled && (
        <section className="py-24 px-6" id="destinos">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: c.accent }}>
                Para cada viajero
              </p>
              <h2 className="text-4xl md:text-5xl font-black mb-4">{content.services.title}</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: c.textMuted }}>{content.services.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.services.items.map((item, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                  style={{ backgroundColor: c.surface, border: `1px solid ${c.accent}15` }}>
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: c.textMuted }}>{item.description}</p>
                  {item.price && (
                    <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: `${c.accent}20` }}>
                      <span className="text-sm font-bold" style={{ color: c.accent }}>{item.price}</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 w-1 h-8 rounded-full opacity-30"
                    style={{ backgroundColor: c.accent }} />
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
            {content.about.imageUrl && (
              <div className="relative order-2 md:order-1">
                <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-20"
                  style={{ backgroundColor: c.accent }} />
                <img src={content.about.imageUrl} alt="Sobre nosotros"
                  className="relative z-10 w-full rounded-3xl object-cover aspect-[4/3] shadow-2xl" />
              </div>
            )}
            <div className="order-1 md:order-2">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: c.accent }}>
                Nuestra historia
              </p>
              <h2 className="text-3xl md:text-4xl font-black mb-6">{content.about.title}</h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: c.textMuted }}>{content.about.body}</p>
              <a href="#contacto"
                className="inline-flex items-center gap-2 font-semibold transition-all hover:gap-4"
                style={{ color: c.accent }}>
                Planificá tu viaje →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ─────────────────────────────────────────────── */}
      {content.gallery.enabled && content.gallery.images.length > 0 && (
        <section className="py-24 px-6" id="galeria">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black mb-4">{content.gallery.title}</h2>
            </div>
            {/* Asymmetric bento grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-4">
              {content.gallery.images.map((img, i) => (
                <div key={i} className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                  <img src={img.url} alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(to top, ${c.accent}80, transparent)` }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ─────────────────────────────────────────────── */}
      {content.contact.enabled && (
        <section className="py-24 px-6" id="contacto"
          style={{ background: `linear-gradient(135deg, ${c.accent}15, ${c.surface})` }}>
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-4xl">✈️</span>
            <h2 className="text-4xl font-black mt-4 mb-4">{content.contact.title}</h2>
            <p className="text-lg mb-12" style={{ color: c.textMuted }}>{content.contact.subtitle}</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {content.contact.showPhone && (
                <a href={`tel:${b.phone}`}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all hover:-translate-y-1"
                  style={{ backgroundColor: c.primary, border: `1px solid ${c.accent}20` }}>
                  <span className="text-xl">📞</span>
                  <span className="text-sm font-semibold">{b.phone}</span>
                </a>
              )}
              {content.contact.showEmail && (
                <a href={`mailto:${b.email}`}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all hover:-translate-y-1"
                  style={{ backgroundColor: c.primary, border: `1px solid ${c.accent}20` }}>
                  <span className="text-xl">📧</span>
                  <span className="text-sm font-semibold">{b.email}</span>
                </a>
              )}
              {content.contact.showAddress && (
                <div className="flex flex-col items-center gap-2 p-5 rounded-2xl"
                  style={{ backgroundColor: c.primary, border: `1px solid ${c.accent}20` }}>
                  <span className="text-xl">📍</span>
                  <span className="text-sm font-semibold text-center">{b.address}</span>
                </div>
              )}
            </div>
            {b.whatsapp && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: c.accent, color: c.ctaText }}>
                💬 Consultar por WhatsApp
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
