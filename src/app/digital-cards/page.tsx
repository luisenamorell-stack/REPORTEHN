
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Upload,
  AlertTriangle,
  CreditCard,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FileDown
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortKey = 'clave' | 'tercero' | 'pendiente' | 'numeroTarjeta' | 'fechaFactura';

export default function DatabasePage(props: { params: Promise<any>, searchParams: Promise<any> }) {
  use(props.params);
  use(props.searchParams);

  const [mounted, setMounted] = useState(false);
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('Todas');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkZoneId, setBulkZoneId] = useState<string>('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ 
    key: 'clave', 
    direction: 'asc' 
  });

  const [newRecord, setNewRecord] = useState({
    fechaFactura: '',
    clave: '',
    numeroTarjeta: '',
    tercero: '',
    articulo: '',
    vendedor: '',
    pendiente: 0,
    zoneId: ''
  });

  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db]);
  const { data: zones, isLoading: zonesLoading } = useCollection(zonesQuery);

  const cardsQuery = useMemoFirebase(() => collection(db, 'digitalCards'), [db]);
  const { data: cards, isLoading: cardsLoading } = useCollection(cardsQuery);

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    setNewRecord(prev => ({ ...prev, fechaFactura: formattedDate, zoneId: '' }));
  }, []);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const processedRecords = useMemo(() => {
    if (!mounted) return [];
    let filtered = (cards || []).filter(record => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = 
        record.tercero?.toLowerCase().includes(s) ||
        record.clave?.toString().toLowerCase().includes(s) ||
        record.numeroTarjeta?.toString().toLowerCase().includes(s) ||
        record.vendedor?.toLowerCase().includes(s) ||
        record.articulo?.toLowerCase().includes(s);
      const matchesZone = selectedZone === 'Todas' || record.zoneId === selectedZone;
      return matchesSearch && matchesZone;
    });

    filtered.sort((a, b) => {
      const valA = a[sortConfig.key as keyof typeof a];
      const valB = b[sortConfig.key as keyof typeof b];

      if (sortConfig.key === 'pendiente') {
        return sortConfig.direction === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
      }

      if (sortConfig.key === 'clave' || sortConfig.key === 'numeroTarjeta') {
        const numA = parseInt(String(valA), 10);
        const numB = parseInt(String(valB), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
      }

      const strA = String(valA || "").toLowerCase();
      const strB = String(valB || "").toLowerCase();
      return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return filtered;
  }, [cards, searchTerm, selectedZone, mounted, sortConfig]);

  const totalSum = useMemo(() => {
    return processedRecords.reduce((acc, curr) => acc + (Number(curr.pendiente) || 0), 0);
  }, [processedRecords]);

  const handleDownloadPDF = async () => {
    if (processedRecords.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      const zoneName = selectedZone === 'Todas' ? 'GLOBAL' : zones?.find(z => z.id === selectedZone)?.name || 'N/A';
      const totalAmount = totalSum;
      const totalClients = processedRecords.length;
      const dateStr = new Date().toLocaleDateString('es-HN');

      // Paleta de Colores
      const primaryPurple = '#7C3AED';
      const darkPurple = '#5B21B6';
      const lightLilac = '#EDE9FE';
      const summaryBg = '#F5F3FF';
      const borderGray = '#eeeeee';

      // --- PÁGINA 1: ENCABEZADO ---
      // Título Principal
      doc.setTextColor(primaryPurple);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('BASE DE DATOS DE CLIENTES', 7.2, 16);

      // Zona
      doc.setFontSize(9);
      doc.text(`ZONA: ${zoneName.toUpperCase()}`, 7.2, 22);

      // Info Esquina Superior Derecha
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 272.2, 16, { align: 'right' });

      // Línea Horizontal
      doc.setDrawColor(primaryPurple);
      doc.setLineWidth(0.5);
      doc.line(7.2, 25, 272.2, 25);

      // --- CUADRO RESUMEN (Página 1) ---
      doc.setFillColor(summaryBg);
      doc.rect(7.2, 28, 265, 18, 'F');

      // Izquierda: Cartera
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('MONTO TOTAL DE CARTERA', 12, 34);
      doc.setTextColor(primaryPurple);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`L. ${totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`, 12, 41);

      // Derecha: Clientes
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('TOTAL DE CLIENTES', 267, 34, { align: 'right' });
      doc.setTextColor(primaryPurple);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalClients}`, 267, 41, { align: 'right' });

      // --- TABLA ---
      const tableData = processedRecords.map(r => [
        r.fechaFactura || '',
        r.clave || '',
        r.numeroTarjeta || '',
        String(r.tercero || '').toUpperCase(),
        String(r.articulo || '').toUpperCase(),
        `L. ${(Number(r.pendiente) || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 52,
        margin: { left: 7.2, right: 7.2, bottom: 15 },
        head: [['FECHA', 'CLAVE', 'N. TARJETA', 'CLIENTE / TERCERO', 'ARTÍCULO', 'PENDIENTE']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: borderGray,
          lineWidth: 0.2,
          valign: 'middle',
          font: 'helvetica'
        },
        headStyles: {
          fillColor: lightLilac,
          textColor: darkPurple,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.2,
          lineColor: borderGray,
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: primaryPurple },
          3: { cellWidth: 'auto', fontStyle: 'bold', textColor: [0, 0, 0] },
          4: { cellWidth: 55 },
          5: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        foot: [[
          { content: `TOTAL: ${totalClients} clientes`, colSpan: 4, styles: { halign: 'left' } },
          { content: '', colSpan: 1 },
          { content: `L. ${totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right' } }
        ]],
        footStyles: {
          fillColor: primaryPurple,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        didDrawPage: (data) => {
          // Pie de Página
          doc.setFontSize(7);
          doc.setTextColor(180);
          doc.setFont('helvetica', 'normal');
          doc.text(`CardMatch © 2026 | Página ${data.pageNumber}`, 139.7, 210, { align: 'center' });
          
          // Info Página Esquina Superior Derecha
          doc.setFontSize(8);
          doc.text(`PÁGINA ${data.pageNumber}`, 272.2, 12, { align: 'right' });
        }
      });

      doc.save(`Base_Datos_${zoneName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Éxito", description: "Reporte generado correctamente." });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkZoneId) return;

    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const total = data.length;
        if (total === 0) throw new Error("Archivo vacío");

        for (let i = 0; i < total; i++) {
          const row: any = data[i];
          const record = {
            fechaFactura: String(row['Fecha'] || row['FECHA'] || ''),
            clave: String(row['Clave'] || row['CLAVE'] || ''),
            numeroTarjeta: String(row['Tarjeta'] || row['N. Tarjeta'] || row['TARJETA'] || ''),
            tercero: String(row['Cliente'] || row['Tercero'] || row['CLIENTE'] || '').toUpperCase(),
            articulo: String(row['Articulo'] || row['ARTICULO'] || ''),
            vendedor: String(row['Vendedor'] || row['VENDEDOR'] || ''),
            pendiente: Number(row['Pendiente'] || row['PENDIENTE'] || 0),
            zoneId: bulkZoneId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          if (record.tercero) {
            addDocumentNonBlocking(collection(db, 'digitalCards'), record);
          }
          
          setUploadProgress(Math.round(((i + 1) / total) * 100));
        }

        toast({ title: "Éxito", description: `${total} registros procesados.` });
        setIsBulkOpen(false);
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Error al procesar Excel.", variant: "destructive" });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!mounted || zonesLoading || cardsLoading || isUserLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="size-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight uppercase">Base de Datos de Clientes</h1>
          <p className="text-muted-foreground">Gestión profesional de carteras y reportes de zona.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedZone !== 'Todas' && (
            <Button variant="destructive" size="sm" onClick={() => {
              if (confirm("¿Vaciar zona?")) {
                processedRecords.forEach(r => deleteDocumentNonBlocking(doc(db, 'digitalCards', r.id)));
              }
            }}>
              <AlertTriangle className="mr-2 size-4" /> Vaciar Zona
            </Button>
          )}
          <Button variant="outline" className="border-primary text-primary" onClick={handleDownloadPDF} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileDown className="mr-2 size-4" />} Descargar PDF
          </Button>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setIsBulkOpen(true)}>
            <Upload className="mr-2 size-4" /> Carga Masiva
          </Button>
          <Button className="bg-primary" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 size-4" /> Nuevo Registro
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary via-primary/90 to-blue-900 border-none text-white shadow-2xl overflow-hidden">
        <CardContent className="p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-white/20 backdrop-blur-xl rounded-2xl shadow-inner border border-white/40">
                <CreditCard className="size-12 text-white" />
              </div>
              <div className="space-y-2">
                <p className="text-white/80 font-bold uppercase text-xs tracking-[0.25em]">Monto Total de Cartera</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white/90">L.</span>
                  <h2 className="text-5xl font-black tracking-tighter">
                    {totalSum.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-10 md:border-l md:border-white/20 md:pl-10">
              <div className="space-y-1">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Zona Actual</p>
                <span className="text-2xl font-bold block">{selectedZone === 'Todas' ? 'Global' : zones?.find(z => z.id === selectedZone)?.name}</span>
              </div>
              <div className="space-y-1">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Clientes</p>
                <span className="text-2xl font-bold block">{processedRecords.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-5 rounded-xl border shadow-sm">
        <div className="flex-1 space-y-2">
          <Label className="font-bold text-primary">Buscar Cliente</Label>
          <Input placeholder="Nombre, clave o tarjeta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full md:w-[250px] space-y-2">
          <Label className="font-bold text-primary">Filtrar por Zona</Label>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas las Zonas</SelectItem>
              {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden ring-1 ring-primary/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-primary">FECHA</TableHead>
                <TableHead className="font-bold text-primary cursor-pointer hover:bg-primary/5" onClick={() => handleSort('clave')}>
                  <div className="flex items-center gap-1">CLAVE <SortIcon column="clave" /></div>
                </TableHead>
                <TableHead className="font-bold text-primary text-center">N. TARJETA</TableHead>
                <TableHead className="font-bold text-primary cursor-pointer hover:bg-primary/5" onClick={() => handleSort('tercero')}>
                  <div className="flex items-center gap-1">CLIENTE <SortIcon column="tercero" /></div>
                </TableHead>
                <TableHead className="font-bold text-primary">ARTÍCULO</TableHead>
                <TableHead className="text-right font-bold text-primary cursor-pointer hover:bg-primary/5" onClick={() => handleSort('pendiente')}>
                  <div className="flex items-center justify-end gap-1">PENDIENTE (L.) <SortIcon column="pendiente" /></div>
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-primary/5 transition-colors">
                  <TableCell className="text-xs font-mono">{record.fechaFactura}</TableCell>
                  <TableCell className="text-xs font-mono">{record.clave}</TableCell>
                  <TableCell className="font-bold text-center text-primary">{record.numeroTarjeta}</TableCell>
                  <TableCell className="font-black text-primary/90 uppercase">{record.tercero}</TableCell>
                  <TableCell className="text-xs text-muted-foreground uppercase italic">{record.articulo}</TableCell>
                  <TableCell className="text-right font-black text-blue-900">L. {record.pendiente?.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="text-destructive/40 hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'digitalCards', record.id))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Nuevo Registro</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha Factura</Label><Input value={newRecord.fechaFactura} onChange={(e) => setNewRecord({...newRecord, fechaFactura: e.target.value})} /></div>
              <div className="space-y-2"><Label>Clave</Label><Input value={newRecord.clave} onChange={(e) => setNewRecord({...newRecord, clave: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newRecord.zoneId} onChange={(e) => setNewRecord({...newRecord, zoneId: e.target.value})}>
                <option value="">Seleccionar Zona</option>
                {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Cliente (Tercero)</Label><Input value={newRecord.tercero} onChange={(e) => setNewRecord({...newRecord, tercero: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>N. Tarjeta</Label><Input value={newRecord.numeroTarjeta} onChange={(e) => setNewRecord({...newRecord, numeroTarjeta: e.target.value})} /></div>
              <div className="space-y-2"><Label>Pendiente (L.)</Label><Input type="number" value={newRecord.pendiente} onChange={(e) => setNewRecord({...newRecord, pendiente: Number(e.target.value)})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!newRecord.tercero || !newRecord.zoneId) return;
              addDocumentNonBlocking(collection(db, 'digitalCards'), { ...newRecord, tercero: newRecord.tercero.toUpperCase(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
              setIsAddOpen(false);
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Carga Masiva</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Zona</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={bulkZoneId} onChange={(e) => setBulkZoneId(e.target.value)}>
                <option value="">Seleccionar Zona</option>
                {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Archivo de Excel (.xlsx)</Label>
              <Input type="file" accept=".xlsx, .xls" onChange={handleBulkUpload} disabled={!bulkZoneId || isUploading} />
            </div>
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
