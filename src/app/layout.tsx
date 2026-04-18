
import type {Metadata} from 'next';
import './globals.css';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthInitializer } from '@/components/auth-initializer';
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: 'CardMatch - Herramienta de Reconciliación',
  description: 'Reconcilia con precisión tarjetas de clientes físicas y digitales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
        <FirebaseClientProvider>
          <AuthInitializer />
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <div className="print:hidden">
                <AppSidebar />
              </div>
              <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 sticky top-0 z-10 print:hidden">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">
                      Sistema de Reconciliación de Tarjetas
                    </span>
                  </div>
                </header>
                <main className="flex-1 p-4 md:p-8 print:p-0 print:bg-white">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
