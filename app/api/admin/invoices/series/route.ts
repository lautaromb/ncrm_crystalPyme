import { NextRequest, NextResponse } from "next/server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
  TenantError,
} from "@/lib/tenant";

function handleTenantError(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json(
      { error: err.code },
      { status: err.httpStatus }
    );
  }
  throw err;
}

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await requirePermission("business.settings.update");
    const db = tenantPrisma(businessId);
    const series = await db.invoice_Series.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: series });
  } catch (err) {
    return handleTenantError(err);
  }
}

export async function POST(request: NextRequest) {
  let businessId: string;
  try {
    const ctx = await requireBusinessContext();
    await requirePermission("business.settings.update");
    businessId = ctx.businessId;
  } catch (err) {
    return handleTenantError(err);
  }
  const db = tenantPrisma(businessId);

  const body = await request.json();
  const { name, prefixTemplate, resetPolicy, isDefault, active } = body;

  if (!name || !prefixTemplate) {
    return NextResponse.json(
      { error: "name and prefixTemplate are required" },
      { status: 400 }
    );
  }

  const series = await db.invoice_Series.create({
    data: {
      businessId,
      name,
      prefixTemplate,
      resetPolicy: resetPolicy ?? "YEARLY",
      isDefault: isDefault ?? false,
      active: active ?? true,
    },
  });

  return NextResponse.json({ data: series }, { status: 201 });
}
