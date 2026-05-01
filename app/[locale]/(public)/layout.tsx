/**
 * Layout mínimo para rutas públicas (sitios web generados).
 * Sin sidebar, sin header de la app. Solo el contenido.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
