"use client";

/**
 * app/[locale]/(routes)/error.tsx
 *
 * Error boundary para las rutas legacy del CRM (group routes).
 * Captura errores lanzados en cualquier página/layout hijo:
 * /crm, /invoices, /projects, /documents, /emails, /reports, etc.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RoutesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[routes/error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "Ocurrió un error inesperado. Por favor intentá de nuevo."}
        </p>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/50 font-mono">
          Código de error: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" size="sm">
          Reintentar
        </Button>
        <Button
          onClick={() => window.history.back()}
          variant="ghost"
          size="sm"
        >
          Volver
        </Button>
      </div>
    </div>
  );
}
