import { ClientRecord } from './types';

export const INITIAL_CLIENT_RECORDS: ClientRecord[] = [
  { 
    id: '1', 
    fechaFactura: '19/03/2025', 
    clave: '392', 
    numeroTarjeta: '3763', 
    tercero: 'JOSE MENDEZ', 
    articulo: 'CHINERO', 
    vendedor: 'CARLOS', 
    pendiente: 2500.00,
    zone: 'Norte'
  },
  { 
    id: '2', 
    fechaFactura: '19/03/2025', 
    clave: '393', 
    numeroTarjeta: '3764', 
    tercero: 'EVA NATAREN', 
    articulo: 'TRASTERO PEQUEÑO', 
    vendedor: 'RAMON', 
    pendiente: 4100.00,
    zone: 'Sur'
  },
  { 
    id: '3', 
    fechaFactura: '20/03/2025', 
    clave: '396', 
    numeroTarjeta: '3776', 
    tercero: 'DOMINGA ORELLANA', 
    articulo: 'GAVETERO', 
    vendedor: 'RAMON', 
    pendiente: 3100.00,
    zone: 'Norte'
  },
];
