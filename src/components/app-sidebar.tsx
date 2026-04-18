
"use client"

import { 
  Database, 
  LayoutDashboard, 
  RefreshCcw, 
  FileText, 
  Search,
  Calculator
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { title: "Panel de Control", url: "/", icon: LayoutDashboard },
  { title: "Base de Datos", url: "/digital-cards", icon: Database },
  { title: "Reconciliación", url: "/reconcile", icon: RefreshCcw },
  { title: "Cuadre de Tarjetas", url: "/cuadre", icon: Calculator },
  { title: "Informes de Zona", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-primary/10">
        <div className="flex items-center gap-2 font-bold text-primary">
          <Database className="size-6 text-accent" />
          <span className="text-xl tracking-tight group-data-[collapsible=icon]:hidden font-headline">CardMatch</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
