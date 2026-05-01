import { prismadb } from "@/lib/prisma";
import { tenantPrisma } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (req.headers.get("content-type") !== "application/json") {
    return NextResponse.json(
      { message: "Invalid content-type" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const headers = req.headers;

  if (!body) {
    return NextResponse.json({ message: "No body" }, { status: 400 });
  }
  if (!headers) {
    return NextResponse.json({ message: "No headers" }, { status: 400 });
  }

  const { firstName, lastName, account, job, email, phone, lead_source } = body;

  //Validate auth with token from .env.local
  const token = headers.get("authorization");

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXTCRM_TOKEN) {
    return NextResponse.json(
      { message: "NEXTCRM_TOKEN not defined in .env.local file" },
      { status: 401 }
    );
  }

  if (token.trim() !== process.env.NEXTCRM_TOKEN.trim()) {
    console.log("Unauthorized");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!lastName) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  // Identificacion del Business destino: por header `X-Business-Slug` o por
  // campo `businessSlug` en el body. TODO(phase-11): cuando exista el site
  // builder, derivar de `formId`/site origin.
  const businessSlug =
    headers.get("X-Business-Slug") ?? (body.businessSlug as string | undefined);
  if (!businessSlug) {
    return NextResponse.json(
      { message: "X-Business-Slug header is required" },
      { status: 400 }
    );
  }
  const business = await prismadb.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!business || business.deletedAt || business.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "Business not found or not active" },
      { status: 404 }
    );
  }

  try {
    const db = tenantPrisma(business.id);
    await db.crm_Leads.create({
      data: {
        businessId: business.id,
        v: 1,
        firstName,
        lastName,
        company: account,
        jobTitle: job,
        email,
        phone,
      },
    });

    return NextResponse.json({ message: "New lead created successfully" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error creating new lead" },
      { status: 500 }
    );
  }
}
