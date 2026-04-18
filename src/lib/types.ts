export type Zone = string;

export interface ClientRecord {
  id: string;
  fechaFactura: string;
  clave: string;
  numeroTarjeta: string;
  tercero: string;
  articulo: string;
  vendedor: string;
  pendiente: number;
  zone: Zone;
}

export interface PhysicalCardInput {
  id: string;
  name: string;
  zone?: Zone;
}

export interface ReconciliationResult {
  physicalCard: PhysicalCardInput;
  matchedDigitalId: string | null;
  status: 'Emparejado' | 'Sin coincidencia' | 'Conflicto';
  matchReason?: string;
}

export interface ZoneReport {
  zone: Zone;
  totalDigital: number;
  totalPhysical: number;
  matchedCount: number;
  unmatchedCount: number;
  conflictCount: number;
}
