"use client";
/**
 * Wizard de creación de sitio: paso 1 (template) + paso 2 (nombre y slug).
 */
import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TemplatePicker } from "@/components/site-builder/template-picker";
import type { TemplateId } from "@/lib/site-builder/types";
import { createSite } from "@/actions/site-builder/manage-site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import Link from "next/link";

// Util slug (igual que en onboarding)
function toSlug(value: string): string {
  return value
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const schema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
});

type FormData = z.infer<typeof schema>;

export default function NewSitePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const businessSlug = params.slug;

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  function handleNameChange(value: string) {
    form.setValue("name", value);
    if (!form.getValues("slug") || form.getValues("slug") === toSlug(form.getValues("name").slice(0, -1))) {
      form.setValue("slug", toSlug(value), { shouldValidate: true });
    }
  }

  function onSubmit(data: FormData) {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await createSite({ ...data, templateId: selectedTemplate });
      if (!result.ok) {
        if (result.fieldErrors?.slug) form.setError("slug", { message: result.fieldErrors.slug });
        toast.error(result.error ?? "Error al crear el sitio");
        return;
      }
      toast.success("¡Sitio creado! Ahora podés editarlo.");
      router.push(`/b/${businessSlug}/sites/${result.siteId}/edit`);
    });
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/b/${businessSlug}/sites`}>
            <ArrowLeft className="w-4 h-4 mr-1" />Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo sitio web</h1>
          <p className="text-muted-foreground text-sm">Paso {step} de 2</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
              ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {n}
            </div>
            <span className={`text-sm ${step === n ? "font-semibold" : "text-muted-foreground"}`}>
              {n === 1 ? "Elegir plantilla" : "Nombrar sitio"}
            </span>
            {n < 2 && <div className={`h-px w-12 ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Paso 1: picker */}
      {step === 1 && (
        <TemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          onNext={() => setStep(2)}
        />
      )}

      {/* Paso 2: nombre y slug */}
      {step === 2 && (
        <div className="max-w-md mx-auto">
          <div className="mb-8 p-4 rounded-2xl bg-muted/40 flex items-center gap-3">
            <div className="text-2xl">✅</div>
            <div>
              <p className="text-sm font-semibold">Plantilla seleccionada</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedTemplate}</p>
            </div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setStep(1)}>
              Cambiar
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del sitio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Mi sitio principal"
                      {...field} onChange={e => handleNameChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL pública del sitio</FormLabel>
                  <FormControl>
                    <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                      <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border-r select-none">
                        /s/
                      </span>
                      <input className="flex-1 px-3 py-2 text-sm bg-transparent outline-none" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>No se puede cambiar después de crearlo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando…</>
                    : <><Rocket className="w-4 h-4 mr-2" />Crear sitio</>}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
