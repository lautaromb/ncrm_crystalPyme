"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
  completeOnboarding,
  toSlug,
  type OnboardingInput,
} from "@/actions/onboarding/complete-onboarding";

// ---------------------------------------------------------------------------
// Schemas por paso
// ---------------------------------------------------------------------------

const agencySchema = z.object({
  agencyName: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  agencySlug: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
});

const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  businessSlug: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  currency: z.enum(["ARS", "USD", "EUR", "BRL"]),
  timezone: z.string(),
});

type AgencyForm = z.infer<typeof agencySchema>;
type BusinessForm = z.infer<typeof businessSchema>;

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "agency", label: "Tu agency", icon: Briefcase },
  { id: "business", label: "Tu negocio", icon: Building2 },
  { id: "done", label: "Listo", icon: CheckCircle2 },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Datos acumulados entre pasos
  const [agencyData, setAgencyData] = useState<AgencyForm | null>(null);

  // Formulario del paso 1
  const agencyForm = useForm<AgencyForm>({
    resolver: zodResolver(agencySchema),
    defaultValues: { agencyName: "", agencySlug: "" },
  });

  // Formulario del paso 2
  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: "",
      businessSlug: "",
      currency: "ARS",
      timezone: "America/Argentina/Buenos_Aires",
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAgencySubmit(data: AgencyForm) {
    setAgencyData(data);
    setStep(1);
  }

  function handleBusinessSubmit(data: BusinessForm) {
    if (!agencyData) return;
    const input: OnboardingInput = { ...agencyData, ...data };
    startTransition(async () => {
      const result = await completeOnboarding(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          // Errores de slug duplicado: volver al paso correspondiente
          if (result.fieldErrors.agencySlug) {
            setStep(0);
            agencyForm.setError("agencySlug", { message: result.fieldErrors.agencySlug });
          }
          if (result.fieldErrors.businessSlug) {
            businessForm.setError("businessSlug", { message: result.fieldErrors.businessSlug });
          }
        }
        toast.error(result.error);
        return;
      }
      setStep(2);
      // Breve delay para mostrar el checkmark antes de navegar
      setTimeout(() => {
        router.push(`/b/${result.businessSlug}`);
      }, 1500);
    });
  }

  // Auto-slug mientras el usuario escribe el nombre
  function handleAgencyNameChange(value: string) {
    agencyForm.setValue("agencyName", value);
    if (!agencyForm.getValues("agencySlug") || agencyForm.getValues("agencySlug") === toSlug(agencyForm.getValues("agencyName").slice(0, -1))) {
      agencyForm.setValue("agencySlug", toSlug(value), { shouldValidate: true });
    }
  }

  function handleBusinessNameChange(value: string) {
    businessForm.setValue("businessName", value);
    if (!businessForm.getValues("businessSlug") || businessForm.getValues("businessSlug") === toSlug(businessForm.getValues("businessName").slice(0, -1))) {
      businessForm.setValue("businessSlug", toSlug(value), { shouldValidate: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2">
          Configuremos tu cuenta en un par de pasos.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* --- Paso 0: Agency --- */}
      {step === 0 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              Tu agency
            </CardTitle>
            <CardDescription>
              La agency es tu cuenta principal. Desde acá vas a gestionar todos tus clientes (businesses).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...agencyForm}>
              <form onSubmit={agencyForm.handleSubmit(handleAgencySubmit)} className="space-y-4">
                <FormField
                  control={agencyForm.control}
                  name="agencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la agency</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Marketing Pro"
                          {...field}
                          onChange={(e) => handleAgencyNameChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={agencyForm.control}
                  name="agencySlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de tu agency</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                          <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-r select-none">
                            crystalpyme.app/agency/
                          </span>
                          <input
                            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Solo letras minúsculas, números y guiones. No se puede cambiar después.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Siguiente
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* --- Paso 1: Business --- */}
      {step === 1 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Tu primer negocio
            </CardTitle>
            <CardDescription>
              Creá el primer negocio que vas a gestionar. Después podés agregar más desde el panel de agency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...businessForm}>
              <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-4">
                <FormField
                  control={businessForm.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del negocio</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Pizzería El Centro"
                          {...field}
                          onChange={(e) => handleBusinessNameChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="businessSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del negocio</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                          <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-r select-none">
                            /b/
                          </span>
                          <input
                            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={businessForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ARS">ARS — Peso argentino</SelectItem>
                            <SelectItem value="USD">USD — Dólar</SelectItem>
                            <SelectItem value="EUR">EUR — Euro</SelectItem>
                            <SelectItem value="BRL">BRL — Real</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona horaria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</SelectItem>
                            <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                            <SelectItem value="America/Santiago">Santiago (CLT)</SelectItem>
                            <SelectItem value="America/Bogota">Bogotá (COT)</SelectItem>
                            <SelectItem value="America/Lima">Lima (PET)</SelectItem>
                            <SelectItem value="America/Mexico_City">Ciudad de México (CST)</SelectItem>
                            <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(0)}
                    disabled={isPending}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Atrás
                  </Button>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Creando…
                      </>
                    ) : (
                      <>
                        Crear cuenta
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* --- Paso 2: Done --- */}
      {step === 2 && (
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="size-16 text-primary animate-in zoom-in duration-300" />
            </div>
            <h2 className="text-2xl font-bold">¡Todo listo!</h2>
            <p className="text-muted-foreground">
              Tu agency y primer negocio están creados. Te estamos redirigiendo…
            </p>
            <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
