/**
 * Errores tipados para la capa de tenancy.
 *
 * Cada error tiene un `code` que la UI/API puede mapear a un status HTTP
 * o a un mensaje localizado sin parsear strings.
 */

export type TenantErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TENANT_REQUIRED"
  | "TENANT_NOT_FOUND"
  | "TENANT_SUSPENDED"
  | "QUOTA_EXCEEDED";

export class TenantError extends Error {
  readonly code: TenantErrorCode;
  readonly httpStatus: number;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: TenantErrorCode,
    message: string,
    httpStatus: number,
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TenantError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.meta = meta;
  }
}

export class UnauthorizedError extends TenantError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends TenantError {
  constructor(permission?: string) {
    super(
      "FORBIDDEN",
      permission
        ? `Missing permission: ${permission}`
        : "Forbidden",
      403,
      permission ? { permission } : undefined
    );
    this.name = "ForbiddenError";
  }
}

export class TenantRequiredError extends TenantError {
  constructor(expected: "AGENCY" | "BUSINESS" | "PLATFORM") {
    super(
      "TENANT_REQUIRED",
      `Active ${expected.toLowerCase()} context is required`,
      400,
      { expected }
    );
    this.name = "TenantRequiredError";
  }
}

export class TenantNotFoundError extends TenantError {
  constructor(kind: "AGENCY" | "BUSINESS", identifier: string) {
    super(
      "TENANT_NOT_FOUND",
      `${kind} not found: ${identifier}`,
      404,
      { kind, identifier }
    );
    this.name = "TenantNotFoundError";
  }
}

export class TenantSuspendedError extends TenantError {
  constructor(kind: "AGENCY" | "BUSINESS", reason?: string) {
    super(
      "TENANT_SUSPENDED",
      `${kind} is suspended${reason ? `: ${reason}` : ""}`,
      403,
      { kind, reason }
    );
    this.name = "TenantSuspendedError";
  }
}

export class QuotaExceededError extends TenantError {
  constructor(quota: string, limit: number, used: number) {
    super(
      "QUOTA_EXCEEDED",
      `Quota exceeded for ${quota}: ${used}/${limit}`,
      429,
      { quota, limit, used }
    );
    this.name = "QuotaExceededError";
  }
}
