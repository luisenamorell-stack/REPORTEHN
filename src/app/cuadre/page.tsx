
"use client"

import { useState, useEffect, useMemo, use } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Loader2, 
  FileDown, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase';
import { collection, serverTimestamp, query, where, doc } from 'firebase/firestore';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

export default function CuadrePage(props: { params: Promise<any>, searchParams: Promise<any> }) {
  // Desempaquetar params para NextJS 15
  use(props.params);
  use(props.searchParams);

  const [mounted, setMounted] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db]);
  const { data: zonesData, isLoading: zonesLoading } = useCollection(zonesQuery);
  const zones = zonesData || [];

  const cardsQuery = useMemoFirebase(() => {
    if (!selectedZoneId) return null;
    return query(collection(db, 'digitalCards'), where('zoneId', '==', selectedZoneId));
  }, [db, selectedZoneId]);
  const { data: cardsData } = useCollection(cardsQuery);
  const realSystemCount = cardsData?.length || 0;

  const cuadreRowsQuery = useMemoFirebase(() => {
    if (!selectedZoneId) return null;
    return query(collection(db, 'cuadreRows'), where('zoneId', '==', selectedZoneId));
  }, [db, selectedZoneId]);
  const { data: cuadreRows, isLoading: cuadreLoading } = useCollection(cuadreRowsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedRows = useMemo(() => {
    return [...(cuadreRows || [])].sort((a, b) => (Number(a.pagina) || 0) - (Number(b.pagina) || 0));
  }, [cuadreRows]);

  const totals = useMemo(() => {
    return sortedRows.reduce((acc, curr) => ({
      digital: acc.digital + (Number(curr.digitalTotal) || 0),
      recogidas: acc.recogidas + (Number(curr.recogidas) || 0),
      pasadas: acc.pasadas + (Number(curr.pasadas) || 0),
      canceladas: acc.canceladas + (Number(curr.canceladas) || 0),
      total: acc.total + (Number(curr.digitalTotal) || 0) + (Number(curr.recogidas) || 0) + (Number(curr.pasadas) || 0) + (Number(curr.canceladas) || 0)
    }), { digital: 0, recogidas: 0, pasadas: 0, canceladas: 0, total: 0 });
  }, [sortedRows]);

  const diff = totals.digital - realSystemCount;

  const handleAddRow = () => {
    if (!selectedZoneId) return;
    const nextPagina = sortedRows.length > 0 ? Math.max(...sortedRows.map(r => Number(r.pagina) || 0)) + 1 : 1;
    addDocumentNonBlocking(collection(db, 'cuadreRows'), {
      zoneId: selectedZoneId,
      pagina: nextPagina,
      digitalTotal: 0,
      recogidas: 0,
      pasadas: 0,
      canceladas: 0,
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateField = (rowId: string, field: string, value: string) => {
    updateDocumentNonBlocking(doc(db, 'cuadreRows', rowId), { [field]: Number(value) || 0 });
  };

  const handleDeleteRow = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'cuadreRows', id));
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('cuadre-print-area');
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jspdf({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const MARGIN_MM = 7.2;
      const PAGE_WIDTH = 279.4; 
      const PRINT_WIDTH = PAGE_WIDTH - (MARGIN_MM * 2);
      
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        width: 1400 // Forzar ancho de renderizado para html2canvas
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgHeight = (canvas.height * PRINT_WIDTH) / canvas.width;

      pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, PRINT_WIDTH, imgHeight);
      pdf.save(`Cuadre_${zones.find(z => z.id === selectedZoneId)?.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Éxito", description: "Reporte de cuadre generado." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!mounted || zonesLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  const currentZoneName = zones.find(z => z.id === selectedZoneId)?.name || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline uppercase">Conciliación de Cuadre</h1>
          <p className="text-muted-foreground">Auditoría técnica de carteras físicas vs base de datos digital.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary text-primary" onClick={handleDownloadPDF} disabled={!selectedZoneId || isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileDown className="mr-2 size-4" />}
            Exportar Cuadre
          </Button>
          <Button onClick={handleAddRow} disabled={!selectedZoneId} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 size-4" /> Nueva Página
          </Button>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-[300px] space-y-2">
              <Label className="font-bold text-primary uppercase text-xs tracking-widest">Seleccionar Zona de Auditoría</Label>
              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Zona..." /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedZoneId && (
              <div className="flex-1 flex justify-end items-center gap-6">
                <div className="text-right border-r pr-6 border-primary/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Sistema Digital</span>
                  <div className="text-2xl font-black text-primary">{realSystemCount}</div>
                </div>
                <div className="text-right border-r pr-6 border-primary/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Conciliado Físico</span>
                  <div className="text-2xl font-black text-blue-900">{totals.digital}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Estado Cuadre</span>
                  {diff !== 0 ? (
                    <Badge variant="destructive" className="mt-1 font-black px-3 py-1">DIFERENCIA: {Math.abs(diff)}</Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-green-600 border-green-200 bg-green-50 font-black px-3 py-1 uppercase"><CheckCircle2 className="mr-1 size-3" /> Cuadrado</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedZoneId ? (
        <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-slate-50/50 border-primary/10">
          <Calculator className="size-16 mx-auto mb-4 text-primary/20" />
          <h3 className="text-lg font-bold text-primary/60">Esperando Selección</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Selecciona una zona de trabajo para cargar los datos de conciliación.</p>
        </div>
      ) : cuadreLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl overflow-hidden shadow-xl ring-1 ring-primary/5">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px] font-black text-primary text-xs uppercase">Páginas</TableHead>
                  <TableHead className="font-black text-primary text-center text-xs uppercase">Cartera Sistema</TableHead>
                  <TableHead className="font-black text-blue-600 text-center text-xs uppercase">Recogidas</TableHead>
                  <TableHead className="font-black text-blue-400 text-center text-xs uppercase">Pasadas</TableHead>
                  <TableHead className="font-black text-destructive text-center text-xs uppercase">Canceladas</TableHead>
                  <TableHead className="font-black text-primary text-right text-xs uppercase">Total Página</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell><Input type="number" value={row.pagina} className="h-9 font-black text-center border-primary/20 focus:ring-primary" onChange={(e) => handleUpdateField(row.id, 'pagina', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={row.digitalTotal} className="h-9 text-center" onChange={(e) => handleUpdateField(row.id, 'digitalTotal', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={row.recogidas} className="h-9 text-center text-blue-600 font-bold" onChange={(e) => handleUpdateField(row.id, 'recogidas', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={row.pasadas} className="h-9 text-center text-blue-400 font-bold" onChange={(e) => handleUpdateField(row.id, 'pasadas', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={row.canceladas} className="h-9 text-center text-destructive font-bold" onChange={(e) => handleUpdateField(row.id, 'canceladas', e.target.value)} /></TableCell>
                    <TableCell className="text-right font-black text-primary text-base">
                      {Number(row.digitalTotal) + Number(row.recogidas) + Number(row.pasadas) + Number(row.canceladas)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive/30 hover:text-destructive hover:bg-destructive/5" onClick={() => handleDeleteRow(row.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No hay páginas registradas. Haz clic en "Nueva Página".</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter className="bg-primary/5">
                <TableRow className="h-16">
                  <TableCell className="font-black text-primary uppercase text-xs">Totales Zona</TableCell>
                  <TableCell className="text-center font-black text-lg">{totals.digital}</TableCell>
                  <TableCell className="text-center font-black text-lg text-blue-600">{totals.recogidas}</TableCell>
                  <TableCell className="text-center font-black text-lg text-blue-400">{totals.pasadas}</TableCell>
                  <TableCell className="text-center font-black text-lg text-destructive">{totals.canceladas}</TableCell>
                  <TableCell className="text-right font-black text-primary text-2xl">L. {totals.total.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* ÁREA DE IMPRESIÓN PROFESIONAL (OCULTA) */}
          <div id="cuadre-print-area" className="fixed left-[-9999px] top-0 bg-white w-[270mm] p-[7.2mm] space-y-6 font-sans">
            <div className="flex flex-col gap-4">
              {/* Encabezado Principal */}
              <div className="flex justify-between items-start border-b-[0.5px] border-[#7C3AED] pb-4">
                <div className="space-y-1">
                  <h2 className="text-[20pt] font-black text-[#7C3AED] leading-none uppercase">Reporte de Conciliación de Cuadre</h2>
                  <p className="text-[10pt] font-bold text-[#7C3AED] uppercase">Zona: {currentZoneName}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[8pt] text-gray-400 uppercase font-bold">Documento Oficial de Auditoría</p>
                  <p className="text-[9pt] font-bold text-gray-500 uppercase">{new Date().toLocaleDateString('es-HN')} | {new Date().toLocaleTimeString('es-HN')}</p>
                </div>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F5F3FF] p-4 rounded-lg border border-[#EDE9FE]">
                  <p className="text-[7pt] text-gray-500 font-bold uppercase tracking-widest mb-1">Cartera en Sistema</p>
                  <p className="text-[16pt] font-black text-[#7C3AED]">{realSystemCount} <span className="text-[8pt] font-medium text-gray-400">clientes</span></p>
                </div>
                <div className="bg-[#F5F3FF] p-4 rounded-lg border border-[#EDE9FE]">
                  <p className="text-[7pt] text-gray-500 font-bold uppercase tracking-widest mb-1">Conciliado Físico</p>
                  <p className="text-[16pt] font-black text-[#7C3AED]">{totals.digital} <span className="text-[8pt] font-medium text-gray-400">clientes</span></p>
                </div>
                <div className="bg-[#F5F3FF] p-4 rounded-lg border border-[#EDE9FE] flex flex-col justify-center">
                  <p className="text-[7pt] text-gray-500 font-bold uppercase tracking-widest mb-1">Resultado Cuadre</p>
                  {diff === 0 ? (
                    <p className="text-[14pt] font-black text-green-600 uppercase tracking-tighter flex items-center gap-1">
                       Estado: Cuadrado
                    </p>
                  ) : (
                    <p className="text-[14pt] font-black text-destructive uppercase tracking-tighter">
                      Diferencia: {Math.abs(diff)}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabla de Datos */}
              <div className="border rounded-lg overflow-hidden border-[#eeeeee]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#EDE9FE]">
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] border-r border-[#eeeeee] uppercase text-center w-[15%]">Página</th>
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] border-r border-[#eeeeee] uppercase text-center w-[17%]">Sistema</th>
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] border-r border-[#eeeeee] uppercase text-center w-[17%]">Recogidas</th>
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] border-r border-[#eeeeee] uppercase text-center w-[17%]">Pasadas</th>
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] border-r border-[#eeeeee] uppercase text-center w-[17%]">Canceladas</th>
                      <th className="p-3 text-[9pt] font-black text-[#5B21B6] uppercase text-right w-[17%]">Total Pág.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#eeeeee]">
                        <td className="p-2 text-[10pt] font-black text-center border-r border-[#eeeeee]">{row.pagina}</td>
                        <td className="p-2 text-[10pt] font-bold text-center border-r border-[#eeeeee]">{row.digitalTotal}</td>
                        <td className="p-2 text-[10pt] font-bold text-center border-r border-[#eeeeee] text-blue-600">{row.recogidas}</td>
                        <td className="p-2 text-[10pt] font-bold text-center border-r border-[#eeeeee] text-blue-400">{row.pasadas}</td>
                        <td className="p-2 text-[10pt] font-bold text-center border-r border-[#eeeeee] text-destructive">{row.canceladas}</td>
                        <td className="p-2 text-[11pt] font-black text-right text-[#7C3AED]">
                          {Number(row.digitalTotal) + Number(row.recogidas) + Number(row.pasadas) + Number(row.canceladas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#7C3AED]">
                      <td className="p-3 text-[10pt] font-black text-white uppercase border-r border-white/20">TOTALES</td>
                      <td className="p-3 text-[11pt] font-black text-white text-center border-r border-white/20">{totals.digital}</td>
                      <td className="p-3 text-[11pt] font-black text-white text-center border-r border-white/20">{totals.recogidas}</td>
                      <td className="p-3 text-[11pt] font-black text-white text-center border-r border-white/20">{totals.pasadas}</td>
                      <td className="p-3 text-[11pt] font-black text-white text-center border-r border-white/20">{totals.canceladas}</td>
                      <td className="p-3 text-[14pt] font-black text-white text-right">L. {totals.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Firmas y Cierre */}
              <div className="grid grid-cols-2 gap-20 pt-16">
                <div className="text-center">
                  <div className="border-t border-gray-400 w-full mb-2"></div>
                  <p className="text-[8pt] font-bold uppercase text-gray-600">Firma Auditor/Cobrador</p>
                  <p className="text-[7pt] text-gray-400 italic">Nombre y Firma</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 w-full mb-2"></div>
                  <p className="text-[8pt] font-bold uppercase text-gray-600">Validación de Sistema</p>
                  <p className="text-[7pt] text-gray-400 italic">Fecha y Hora de Cierre</p>
                </div>
              </div>

              {/* Pie de Página */}
              <div className="pt-10 text-center">
                <p className="text-[7pt] text-gray-300 font-medium uppercase tracking-[0.3em]">CardMatch © 2026 | Sistema de Gestión de Carteras | www.cardmatch.app</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

