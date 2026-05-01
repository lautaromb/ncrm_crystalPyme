import { prismadb } from "@/lib/prisma";
import { tenantPrisma } from "@/lib/tenant";
import { NextResponse } from "next/server";

/**
 * Endpoint publico para integraciones externas (Zapier, formularios web, etc.)
 * que reciben contactos para un Business especifico.
 *
 * Auth:
 *  - Header `NEXTCRM_TOKEN`: token global (env var). Phase 10 deberia migrar
 *    a API keys por-business con scopes.
 *  - Header `X-Business-Slug`: identifica el Business destino. El token global
 *    no aporta tenancy, asi que el caller debe ser explicito.
 */
export async function POST(req: Request) {
  const apiKey = req.headers.get("NEXTCRM_TOKEN");
  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 401 });
  }
  const storedApiKey = process.env.NEXTCRM_TOKEN;
  if (apiKey !== storedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const businessSlug = req.headers.get("X-Business-Slug");
  if (!businessSlug) {
    return NextResponse.json(
      { error: "X-Business-Slug header is required" },
      { status: 400 }
    );
  }
  const business = await prismadb.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!business || business.deletedAt || business.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Business not found or not active" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, surname, email, phone, company, message, tag } = body;
  if (!name || !surname || !email || !phone || !company || !message || !tag) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const db = tenantPrisma(business.id);
    await db.crm_Contacts.create({
      data: {
        businessId: business.id,
        first_name: name,
        last_name: surname,
        email,
        mobile_phone: phone,
        tags: [tag],
        notes: ["Account: " + company, "Message: " + message],
      },
    });
    return NextResponse.json({ message: "Contact created" });
  } catch (error) {
    console.log("Error creating contact:", error);
    return NextResponse.json(
      { error: "Error creating contact" },
      { status: 500 }
    );
  }
}
