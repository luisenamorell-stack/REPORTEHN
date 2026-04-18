
"use client"

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Scan, 
  CheckCircle, 
  Sparkles,
  RefreshCcw,
  ArrowRight,
  Loader2
} from "lucide-react";
import { PhysicalCardInput, ReconciliationResult } from '@/lib/types';
import { 
  intelligentCardMatchSuggestion, 
  IntelligentCardMatchSuggestionOutput 
} from '@/ai/flows/intelligent-card-match-suggestion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import { collection } from 'firebase/firestore';

export default function ReconcilePage(props: { params: Promise<any>, searchParams: Promise<any> }) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);

  const [mounted, setMounted] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const [physicalCard, setPhysicalCard] = useState<PhysicalCardInput>({
    id: '',
    name: '',
    zone: ''
  });
  const [isMatching, setIsMatching] = useState(false);
  const [suggestions, setSuggestions] = useState<IntelligentCardMatchSuggestionOutput['suggestedMatches']>([]);
  const [results, setResults] = useState<ReconciliationResult[]>([]);

  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db]);
  const { data: zones, isLoading: zonesLoading } = useCollection(zonesQuery);

  const cardsQuery = useMemoFirebase(() => collection(db, 'digitalCards'), [db]);
  const { data: cards, isLoading: cardsLoading } = useCollection(cardsQuery);

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

  const handleMatch = async () => {
    if (!physicalCard.id && !physicalCard.name) {
      toast({
        title: "Información Faltante",
        description: "Por favor ingresa al menos el ID o Nombre de la tarjeta física",
        variant: "destructive"
      });
      return;
    }

    setIsMatching(true);
    setSuggestions([]);

    try {
      const response = await intelligentCardMatchSuggestion({
        physicalCardId: physicalCard.id,
        physicalCardName: physicalCard.name,
        physicalCardZone: physicalCard.zone,
        digitalCardRecords: (cards || []).map(d => ({
          id: d.id,
          name: d.tercero,
          zone: zones?.find(z => z.id === d.zoneId)?.name,
          details: `${d.articulo} - ${d.vendedor}`
        }))
      });

      setSuggestions(response.suggestedMatches);
      
      if (response.suggestedMatches.length === 0) {
        toast({
          title: "Sin Coincidencias",
          description: "La IA no pudo encontrar un registro digital adecuado.",
        });
      }
    } catch (error) {
      toast({
        title: "Error de IA",
        description: "Error al procesar el emparejamiento inteligente.",
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };

  const confirmMatch = (match: IntelligentCardMatchSuggestionOutput['suggestedMatches'][0]) => {
    const result: ReconciliationResult = {
      physicalCard: { ...physicalCard },
      matchedDigitalId: match.digitalCardId,
      status: 'Emparejado',
      matchReason: match.matchReason
    };
    
    setResults([result, ...results]);
    setPhysicalCard({ id: '', name: '', zone: '' });
    setSuggestions([]);
    
    toast({
      title: "Emparejamiento Confirmado",
      description: `Tarjeta física vinculada a ${match.digitalCardName}`,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Reconciliación de Tarjetas</h1>
          <p className="text-muted-foreground">Compara tarjetas físicas con los registros del sistema digital.</p>
        </div>

        <Card className="border-accent/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="size-5 text-accent" />
              Entrada de Tarjeta Física
            </CardTitle>
            <CardDescription>Ingresa los detalles de la tarjeta física para comenzar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="phys-id">ID de Tarjeta</Label>
              <Input 
                id="phys-id" 
                placeholder="ej. DC001 (o similar)" 
                value={physicalCard.id}
                onChange={(e) => setPhysicalCard({...physicalCard, id: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phys-name">Nombre del Cliente</Label>
              <Input 
                id="phys-name" 
                placeholder="ej. Juan Pérez" 
                value={physicalCard.name}
                onChange={(e) => setPhysicalCard({...physicalCard, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phys-zone">Zona (si se indica)</Label>
              <select 
                id="phys-zone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={physicalCard.zone}
                onChange={(e) => setPhysicalCard({...physicalCard, zone: e.target.value})}
              >
                <option value="">Seleccionar Zona</option>
                {(zones || []).map(z => (
                  <option key={z.id} value={z.name}>{z.name}</option>
                ))}
              </select>
            </div>
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={handleMatch}
              disabled={isMatching}
            >
              {isMatching ? (
                <>
                  <RefreshCcw className="mr-2 size-4 animate-spin" />
                  Analizando Discrepancias...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Emparejamiento Inteligente
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {suggestions.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <Sparkles className="size-4 text-accent" />
              Sugerencias de Emparejamiento por IA
            </h3>
            {suggestions.map((s, idx) => (
              <Card key={idx} className="border-l-4 border-l-accent overflow-hidden transition-all hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{s.digitalCardName}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{s.digitalCardId}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">
                        &quot;{s.matchReason}&quot;
                      </p>
                    </div>
                    <Button size="sm" onClick={() => confirmMatch(s)}>Vincular</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold font-headline text-primary flex items-center gap-2">
          <CheckCircle className="size-5 text-accent" />
          Reconciliaciones Recientes
        </h2>
        
        <Card className="min-h-[400px]">
          <CardContent className="p-6">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-40">
                <RefreshCcw className="size-12" />
                <p>No hay reconciliaciones registradas en esta sesión.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <CheckCircle className="size-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold truncate">{r.physicalCard.name || r.physicalCard.id}</span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="text-primary truncate">
                          {(cards || []).find(d => d.id === r.matchedDigitalId)?.tercero}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="bg-muted px-1 rounded uppercase">Zona: {r.physicalCard.zone || 'N/A'}</span>
                        <span>Vinculado con ID: {r.matchedDigitalId}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
