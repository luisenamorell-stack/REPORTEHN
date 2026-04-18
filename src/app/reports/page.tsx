
"use client"

import { useState, useEffect, useMemo, use } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileDown,
  Loader2,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportsPage(props: { params: Promise<any>, searchParams: Promise<any> }) {
  // Desempaquetar params para NextJS 15
  use(props.params);
  use(props.searchParams);

  const [mounted, setMounted] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('Todas');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db]);
  const { data: zonesData, isLoading: zonesLoading } = useCollection(zonesQuery);
  const zones = zonesData || [];

  const cardsQuery = useMemoFirebase(() => collection(db, 'digitalCards'), [db]);
  const { data: cardsData, isLoading: cardsLoading } = useCollection(cardsQuery);
  const cards = cardsData || [];
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCards = useMemo(() => {
    if (selectedZoneId === 'Todas') return cards;
    return cards.filter(c => c.zoneId === selectedZoneId);
  }, [cards, selectedZoneId]);

  const sellerStatsByYear = useMemo(() => {
    const stats: Record<string, Record<string, { total: number, count: number }>> = {};
    filteredCards.forEach(card => {
      const year = card.fechaFactura?.split('/')[2] || 'S/N';
      const seller = card.vendedor?.trim().toUpperCase() || 'DESCONOCIDO';
      const amount = Number(card.pendiente) || 0;
      
      if (!stats[year]) stats[year] = {};
      if (!stats[year][seller]) stats[year][seller] = { total: 0, count: 0 };
      
      stats[year][seller].total += amount;
      stats[year][seller].count += 1;
    });

    return Object.entries(stats).map(([year, sellers]) => ({
      year,
      sellers: Object.entries(sellers).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total),
      yearTotal: Object.values(sellers).reduce((acc, curr) => acc + curr.total, 0)
    })).sort((a, b) => b.year.localeCompare(a.year));
  }, [filteredCards]);

  const portfolioSummaryByYear = useMemo(() => {
    const stats: Record<string, { total: number, count: number }> = {};
    filteredCards.forEach(card => {
      const year = card.fechaFactura?.split('/')[2] || 'S/N';
      const amount = Number(card.pendiente) || 0;
      if (!stats[year]) stats[year] = { total: 0, count: 0 };
      stats[year].total += amount;
      stats[year].count += 1;
    });
    return Object.entries(stats).map(([year, data]) => ({ 
      year, 
      ...data 
    })).sort((a, b) => b.year.localeCompare(a.year));
  }, [filteredCards]);

  const itemStats = useMemo(() => {
    const stats: Record<string, { total: number, count: number }> = {};
    filteredCards.forEach(card => {
      const item = card.articulo?.trim().toUpperCase() || 'SIN ARTÍCULO';
      const amount = Number(card.pendiente) || 0;
      if (!stats[item]) stats[item] = { total: 0, count: 0 };
      stats[item].total += amount;
      stats[item].count += 1;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [filteredCards]);

  const handleDownloadPDF = async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const pdf = new jspdf({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const MARGIN_MM = 5;
      const PAGE_WIDTH = 215.9; 
      const PAGE_HEIGHT = 279.4;
      const PRINT_WIDTH = PAGE_WIDTH - (MARGIN_MM * 2);

      const sections = Array.from(element.querySelectorAll('.report-section')) as HTMLElement[];
      let currentY = MARGIN_MM;

      for (let i = 0; i < sections.length; i++) {
        const canvas = await html2canvas(sections[i], { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgHeight = (canvas.height * PRINT_WIDTH) / canvas.width;

        if (currentY + imgHeight > PAGE_HEIGHT - MARGIN_MM && i > 0) {
          pdf.addPage();
          currentY = MARGIN_MM;
        }

        pdf.addImage(imgData, 'PNG', MARGIN_MM, currentY, PRINT_WIDTH, imgHeight);
        currentY += imgHeight + 5;
      }

      pdf.save(`Reporte_${title}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Éxito", description: "Reporte generado correctamente." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!mounted || zonesLoading || cardsLoading) {
    return <div className="flex h-full items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight uppercase">Informes y Análisis</h1>
          <p className="text-muted-foreground text-sm">Resumen consolidado de vendedores, artículos y estado de cartera.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
            <SelectTrigger className="w-[220px] bg-white"><SelectValue placeholder="Zona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Zonas</SelectItem>
              {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="vendedores" className="w-full">
        <TabsList className="bg-primary/5 p-1 mb-4">
          <TabsTrigger value="vendedores" className="data-[state=active]:bg-primary data-[state=active]:text-white">Vendedores</TabsTrigger>
          <TabsTrigger value="articulos" className="data-[state=active]:bg-primary data-[state=active]:text-white">Artículos</TabsTrigger>
          <TabsTrigger value="estado" className="data-[state=active]:bg-primary data-[state=active]:text-white">Estado Cartera</TabsTrigger>
        </TabsList>

        <TabsContent value="vendedores" className="space-y-4">
          <Button variant="outline" className="border-primary text-primary" onClick={() => handleDownloadPDF('vendedores-print-area', 'Ventas_Vendedores')} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileDown className="mr-2 size-4" />} Descargar PDF Vendedores
          </Button>
          <div id="vendedores-print-area" className="space-y-6">
            {sellerStatsByYear.map((yearData) => (
              <div key={yearData.year} className="report-section bg-white p-6 rounded-xl border shadow-sm space-y-4">
                <div className="flex justify-between items-end border-b-2 border-primary/20 pb-2">
                  <div>
                    <h2 className="text-xl font-black text-primary uppercase">Ventas Vendedores - {yearData.year}</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Zona: {selectedZoneId === 'Todas' ? 'Global' : zones.find(z => z.id === selectedZoneId)?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Anual</p>
                    <p className="text-lg font-black text-primary">L. {yearData.yearTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearData.sellers}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                        <YAxis fontSize={9} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {yearData.sellers.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader className="bg-primary/5 h-8">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] text-primary py-0 uppercase">Vendedor</TableHead>
                        <TableHead className="text-center font-bold text-[10px] text-primary py-0 uppercase">Cant.</TableHead>
                        <TableHead className="text-right font-bold text-[10px] text-primary py-0 uppercase">Total (L.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearData.sellers.map(s => (
                        <TableRow key={s.name} className="h-8">
                          <TableCell className="font-bold text-[10px] uppercase py-1">{s.name}</TableCell>
                          <TableCell className="text-center text-[10px] py-1">{s.count}</TableCell>
                          <TableCell className="text-right font-black text-blue-800 text-[10px] py-1">L. {s.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="articulos" className="space-y-4">
          <Button variant="outline" className="border-primary text-primary" onClick={() => handleDownloadPDF('articulos-print-area', 'Reporte_Articulos')} disabled={isGeneratingPdf}>
            <FileDown className="mr-2 size-4" /> Descargar PDF Artículos
          </Button>
          <div id="articulos-print-area" className="space-y-6">
            {Array.from({ length: Math.ceil(itemStats.length / 30) }).map((_, idx) => (
              <div key={idx} className="report-section bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center border-b-2 border-primary/20 pb-2 mb-4">
                  <h2 className="text-lg font-black text-primary uppercase">Resumen por Artículos - Pág. {idx + 1}</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Zona: {selectedZoneId === 'Todas' ? 'Global' : zones.find(z => z.id === selectedZoneId)?.name}</p>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] text-primary h-8 uppercase">Artículo</TableHead>
                      <TableHead className="text-center font-bold text-[10px] text-primary h-8 uppercase">Cantidad</TableHead>
                      <TableHead className="text-right font-bold text-[10px] text-primary h-8 uppercase">Valor Total (L.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemStats.slice(idx * 30, (idx + 1) * 30).map(item => (
                      <TableRow key={item.name} className="h-8 border-b">
                        <TableCell className="font-bold text-[10px] uppercase py-1">{item.name}</TableCell>
                        <TableCell className="text-center text-[10px] py-1">{item.count}</TableCell>
                        <TableCell className="text-right font-black text-blue-900 text-[10px] py-1">L. {item.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="estado" className="space-y-4">
          <Button variant="outline" className="border-primary text-primary" onClick={() => handleDownloadPDF('estado-print-area', 'Estado_Cartera')} disabled={isGeneratingPdf}>
            <FileDown className="mr-2 size-4" /> Descargar PDF Estado Cartera
          </Button>
          <div id="estado-print-area" className="space-y-6">
            <div className="report-section bg-white p-6 rounded-xl border shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b-2 border-primary/20 pb-2">
                <h2 className="text-xl font-black text-primary uppercase">Estado de la Cartera por Año</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Zona: {selectedZoneId === 'Todas' ? 'Global' : zones.find(z => z.id === selectedZoneId)?.name}</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={portfolioSummaryByYear}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="year" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))">
                        {portfolioSummaryByYear.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-primary uppercase">Año</TableHead>
                        <TableHead className="text-center font-bold text-xs text-primary uppercase">Registros</TableHead>
                        <TableHead className="text-right font-bold text-xs text-primary uppercase">Monto Total (L.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolioSummaryByYear.map(item => (
                        <TableRow key={item.year}>
                          <TableCell className="font-black text-primary">{item.year}</TableCell>
                          <TableCell className="text-center font-bold">{item.count}</TableCell>
                          <TableCell className="text-right font-black text-blue-900">L. {item.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/5">
                        <TableCell className="font-black uppercase">Gran Total</TableCell>
                        <TableCell className="text-center font-black">{portfolioSummaryByYear.reduce((acc, c) => acc + c.count, 0)}</TableCell>
                        <TableCell className="text-right font-black text-primary text-lg">L. {portfolioSummaryByYear.reduce((acc, c) => acc + c.total, 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
