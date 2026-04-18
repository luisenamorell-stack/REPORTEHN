
"use client"

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  AlertCircle, 
  MapPin,
  TrendingUp,
  CreditCard,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function Dashboard(props: { params: Promise<any>, searchParams: Promise<any> }) {
  // Desempaquetar params para NextJS 15
  use(props.params);
  use(props.searchParams);

  const [mounted, setMounted] = useState(false);
  const db = useFirestore();

  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db]);
  const { data: zonesData, isLoading: zonesLoading } = useCollection(zonesQuery);

  const cardsQuery = useMemoFirebase(() => collection(db, 'digitalCards'), [db]);
  const { data: cardsData, isLoading: cardsLoading } = useCollection(cardsQuery);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || zonesLoading || cardsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = cardsData || [];
  const zonesList = zonesData || [];

  const zoneStats = zonesList.map(z => ({
    name: z.name,
    count: cards.filter(r => r.zoneId === z.id).length,
    total: cards.filter(r => r.zoneId === z.id).reduce((acc, curr) => acc + (curr.pendiente || 0), 0)
  }));

  const totalPending = cards.reduce((acc, curr) => acc + (curr.pendiente || 0), 0);
  const formattedPending = totalPending.toLocaleString('es-HN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Panel de Control</h1>
        <p className="text-muted-foreground">Resumen en tiempo real de la base de datos de clientes por zona.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registros Totales</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
            <p className="text-xs text-muted-foreground">En {zonesList.length} zonas activas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
            <CreditCard className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">L. {formattedPending}</div>
            <p className="text-xs text-muted-foreground">Cuentas por cobrar</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zonas Activas</CardTitle>
            <AlertCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zonesList.length}</div>
            <p className="text-xs text-muted-foreground">Monitoreo de deudores</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">Sincronización con la nube</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Distribución por Zona
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))">
                  {zoneStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 shadow-md">
          <CardHeader>
            <CardTitle>Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cards.slice(-5).reverse().map((record, i) => (
                <div key={record.id} className="flex items-center gap-4">
                  <div className={`size-2 rounded-full ${i % 2 === 0 ? 'bg-accent' : 'bg-primary'}`} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {record.tercero} - {record.articulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Zona {zonesList.find(z => z.id === record.zoneId)?.name} | Pendiente: L. {record.pendiente?.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No hay registros recientes.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
