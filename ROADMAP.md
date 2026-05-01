# CrystalPyme — Roadmap & Arquitectura

> SaaS B2B2C basado en NextCRM. Vos (superadmin) vendés suscripciones a **agencies**, que a su vez gestionan **businesses** (sus clientes finales).

---

## 1. Modelo de negocio

```
PLATFORM (vos = superadmin)
  │  cobra $35/mes + 18% del valor de planes activos
  ↓
AGENCY (Juan)
  │  cobra como quiera (transferencia, efectivo, MP) — no pasa por la plataforma
  ↓
BUSINESS (clientes de Juan: pizzería, boutique, etc.)
  │
  └── Owner / Manager / Staff
```

### Posicionamiento
**"Tu mano derecha AI"** — herramienta para pequeños emprendedores que entienden marketing pero no saben ejecutarlo. Techo de ~1000 clientes/mes por business.

### Features ofrecidas al business
- CRM con AI asistente
- Páginas web + funnels + forms (templates premium predefinidos)
- Ecommerce básico (ABM productos)
- Bot de Telegram (identificación por número de teléfono)
- Generación de imágenes AI (cuota mensual según plan, ej. 10/mes)
- Tablero Kanban
- Dashboard limitado por rol

---

## 2. Decisiones arquitectónicas

| # | Decisión | Detalle |
|---|---|---|
| 1 | **Tenancy** | Shared DB + `businessId` en cada fila + Prisma extension automático |
| 2 | **Tres niveles** | Platform → Agency → Business (datos del CRM viven en Business) |
| 3 | **Routing** | Path por defecto (`/b/slug`), subdominio en plan medio, dominio propio en plan premium |
| 4 | **Multi-membership** | Un user puede pertenecer a múltiples businesses simultáneamente |
| 5 | **Currency** | USD como referencia + ARS fijo redondeado (sin conversión automática) |
| 6 | **Trial** | Con tarjeta requerida, 30 días |
| 7 | **Site builder** | Templates premium predefinidos con customización limitada (textos, imágenes, colores, secciones on/off) |
| 8 | **Pagos a la platform** | LemonSqueezy (USD/internacional) + Mercado Pago (ARS) + manual fallback |
| 9 | **Telegram** | Un único bot global identifica business por número de teléfono |
| 10 | **Si Agency no paga** | Agency suspendida; sus businesses pasan a estado `ORPHANED` (pool disponible para otros agencies) |

---

## 3. Modelo de roles

### Jerarquía
```
SUPERADMIN (platform)         ← vos y tu equipo
  ├── AGENCY OWNER             ← creó la agency, control total + billing
  ├── AGENCY ADMIN             ← crea businesses, ve finanzas de la agency
  └── AGENCY STAFF             ← opera, sin acceso a billing
        │
        ├── BUSINESS OWNER     ← dueño del negocio, ve todo
        ├── BUSINESS MANAGER   ← gestión operativa, sin finanzas detalladas
        └── BUSINESS STAFF     ← ABM contactos, dashboard limitado
```

### Implementación
Roles **por membership**, no por user. Tablas `AgencyMember` y `BusinessMember` con campo `role`. Un user puede tener N memberships.

### Visibilidad cruzada (Agency → Business)

| Dato | Agency Owner | Business Owner |
|---|---|---|
| Cantidad de leads / conversión | ✅ | ✅ |
| Lista de contactos | ✅ (read-only) | ✅ |
| Montos de facturas | ❌ | ✅ |
| Revenue mensual | ❌ | ✅ |
| Configuración de planes/precios | ❌ | ✅ |

---

## 4. Cambios al schema Prisma

### Modelos nuevos
- **Plan** — planes definidos por superadmin (tier AGENCY o BUSINESS, precios USD/ARS, límites, features)
- **Agency** — los suscriptores (Juan)
- **AgencyMember** — equipo de la agency (Owner/Admin/Staff)
- **Business** — los negocios de los clientes
- **BusinessMember** — equipo del business (Owner/Manager/Staff)
- **PlatformInvoice** + **PlatformInvoiceItem** — facturas que vos le cobrás a las agencies
- **Site**, **SitePage**, **Form**, **FormSubmission** — site builder
- **AIUsageLog** — tracking de consumo AI por business
- **TelegramContact** — mapping teléfono → business

### Modelos existentes que reciben `businessId`
`crm_Accounts`, `crm_Contacts`, `crm_Leads`, `crm_Opportunities`, `crm_Contracts`, `crm_Activities`, `crm_Targets`, `crm_TargetLists`, `crm_Products`, `crm_AccountProducts`, `Invoices`, `Invoice_LineItems`, `Invoice_Payments`, `Invoice_Series`, `Invoice_Settings`, `Documents`, `Boards`, `Sections`, `Tasks`, `crm_campaigns`, `crm_campaign_templates`, `crm_campaign_steps`, `crm_campaign_sends`, `Email`, `EmailAccount`, `crm_Embeddings_*`, `crm_AuditLog`, `crm_Report_Config`, `crm_Report_Schedule`.

### Modelos que NO reciben `businessId` (globales)
`Users`, `Session`, `Account`, `Verification`, `Currency`, `ExchangeRate`, `Plan`, `crm_Industry_Type`, `crm_Lead_Sources`, `crm_Lead_Statuses`, `ApiKeys`.

---

## 5. Patrón de queries (enforcement automático)

### Tenant context
```ts
// lib/tenant/context.ts
const ctx = await getTenantContext()
const { businessId } = await requireBusinessContext()
```

### Prisma extension
```ts
// lib/tenant/prisma-tenant.ts
const db = tenantPrisma(businessId)
db.crm_Contacts.findMany()  // filtra por businessId automáticamente
```

Esto **elimina el riesgo de olvidar el filtro** y mantiene los server actions limpios.

### Permisos
```ts
// lib/tenant/permissions.ts
await require("business.invoice.create")
await can("business.invoice.viewAmounts")
```

---

## 6. Estructura de carpetas

```
app/[locale]/
  (marketing)/                  # landing pública
  (auth)/                       # signin/signup/onboarding
  (platform)/admin/             # superadmin
  (agency)/agency/[agencySlug]/ # agency portal
  (business)/b/[businessSlug]/  # business workspace

actions/
  platform/                     # superadmin actions
  agency/                       # agency actions
  business/                     # business actions (mayoría del CRM actual movido acá)

lib/
  tenant/
    context.ts                  # resolver de contexto
    prisma-tenant.ts            # Prisma extension
    permissions.ts              # matriz de permisos
    quota.ts                    # control de límites
  billing/
    revenue-share.ts            # cálculo del 18%
    invoice-generator.ts
  ai/
    image-generator.ts
    quota-guard.ts

inngest/functions/
  monthly-billing.ts            # genera PlatformInvoices
  quota-reset.ts
  suspend-overdue-agencies.ts
```

---

## 7. Plan de ejecución (13 fases)

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Schema Prisma con modelos nuevos + `businessId` (nullable) en CRM | ✅ Hecho |
| 2 | Migración + seed de Agency/Business default | ✅ Hecho |
| 3 | `lib/tenant/` (context resolver + Prisma extension + permissions) | ✅ Hecho |
| 4 | `businessId` NOT NULL + `@@index([businessId])` + seed reordenado | ✅ Hecho |
| 5 | Refactor de actions existentes para usar `tenantPrisma()` | ✅ Hecho |
| 6 | Middleware + nuevas rutas (`/admin`, `/agency`, `/b`) | ✅ Hecho |
| 7 | Layouts y UI diferenciados por tipo de tenant | ✅ Hecho |
| 8 | Onboarding flow (signup → crear agency → primer business) | ✅ Hecho |
| 9 | Billing engine (Inngest jobs mensuales) | ✅ Hecho |
| 10 | Integraciones de pago (LemonSqueezy + Mercado Pago) | ✅ Hecho |
| 11 | Site builder MVP (templates + customización) | ✅ Hecho |
| 12 | Bot de Telegram | ✅ Hecho |
| 13 | AI quota system + image generation | ✅ Hecho |

---

## 8. Stack técnico (heredado de NextCRM)

- **Framework**: Next.js 16, React 19, TypeScript 5.9
- **DB**: PostgreSQL (Supabase) + pgvector
- **ORM**: Prisma 7.6
- **Auth**: Better Auth 1.5.x (Email OTP + Google OAuth)
- **UI**: shadcn/ui, Tailwind v4, Radix
- **Background Jobs**: Inngest
- **Email**: Resend
- **Storage**: S3 / MinIO / Supabase Storage
- **AI**: OpenAI (embeddings + imágenes), Anthropic (chat)
- **i18n**: next-intl
