'use server';
/**
 * @fileOverview Este archivo implementa un flujo de Genkit para sugerir inteligentemente coincidencias
 * entre los detalles de una tarjeta física y los registros de tarjetas digitales existentes,
 * manejando discrepancias menores.
 *
 * - intelligentCardMatchSuggestion - Una función que sugiere posibles coincidencias de tarjetas digitales para una tarjeta física.
 * - IntelligentCardMatchSuggestionInput - El tipo de entrada para la función intelligentCardMatchSuggestion.
 * - IntelligentCardMatchSuggestionOutput - El tipo de retorno para la función intelligentCardMatchSuggestion.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentCardMatchSuggestionInputSchema = z.object({
  physicalCardId: z.string().describe('El ID de la tarjeta física del cliente.'),
  physicalCardName: z.string().describe('El nombre de la tarjeta física del cliente.'),
  physicalCardZone: z.string().optional().describe('La zona asociada con la tarjeta física del cliente, si está disponible.'),
  digitalCardRecords: z.array(z.object({
    id: z.string().describe('El ID único de la tarjeta digital del cliente.'),
    name: z.string().describe('El nombre asociado con la tarjeta digital del cliente.'),
    zone: z.string().optional().describe('La zona asociada con la tarjeta digital del cliente.'),
    details: z.string().optional().describe('Cualquier detalle adicional sobre la tarjeta digital del cliente.'),
  })).describe('Una lista de registros de tarjetas digitales existentes.'),
});

export type IntelligentCardMatchSuggestionInput = z.infer<typeof IntelligentCardMatchSuggestionInputSchema>;

const IntelligentCardMatchSuggestionOutputSchema = z.object({
  suggestedMatches: z.array(z.object({
    digitalCardId: z.string().describe('El ID único de la tarjeta digital sugerida.'),
    digitalCardName: z.string().describe('El nombre de la tarjeta digital sugerida.'),
    matchReason: z.string().describe('Una explicación detallada de por qué esta tarjeta digital es una coincidencia potencial, destacando las discrepancias y cómo se manejaron.'),
  })).describe('Una lista de registros de tarjetas digitales que son posibles coincidencias para la tarjeta física.'),
});

export type IntelligentCardMatchSuggestionOutput = z.infer<typeof IntelligentCardMatchSuggestionOutputSchema>;

export async function intelligentCardMatchSuggestion(input: IntelligentCardMatchSuggestionInput): Promise<IntelligentCardMatchSuggestionOutput> {
  return intelligentCardMatchSuggestionFlow(input);
}

const matchSuggestionPrompt = ai.definePrompt({
  name: 'cardMatchSuggestionPrompt',
  input: { schema: IntelligentCardMatchSuggestionInputSchema },
  output: { schema: IntelligentCardMatchSuggestionOutputSchema },
  prompt: `Eres un asistente inteligente de emparejamiento de tarjetas. Tu tarea es comparar los detalles de una tarjeta de cliente física con una lista de registros de tarjetas de cliente digitales e identificar posibles coincidencias, incluso si hay pequeñas diferencias ortográficas o variaciones en la entrada de datos.

Detalles de la Tarjeta Física:
  ID: {{{physicalCardId}}}
  Nombre: {{{physicalCardName}}}
  {{#if physicalCardZone}}Zona: {{{physicalCardZone}}}{{/if}}

Registros de Tarjetas Digitales disponibles para emparejar:
{{#each digitalCardRecords}}
  ---
  ID Digital: {{{this.id}}}
  Nombre Digital: {{{this.name}}}
  {{#if this.zone}}Zona Digital: {{{this.zone}}}{{/if}}
  {{#if this.details}}Otros Detalles Digitales: {{{this.details}}}{{/if}}
{{/each}}

Identifica todos los registros de tarjetas digitales que sean posibles coincidencias para los detalles de la tarjeta física proporcionados. Para cada sugerencia de coincidencia, proporciona el 'digitalCardId', 'digitalCardName' y una 'matchReason' (razón de coincidencia en español) explicando por qué es una buena coincidencia, notando explícitamente cualquier discrepancia menor (por ejemplo, ligeras variaciones ortográficas, diferencias en mayúsculas, detalles faltantes) y cómo tu razonamiento las tuvo en cuenta.

Devuelve las sugerencias como un arreglo JSON de objetos, cada uno con 'digitalCardId', 'digitalCardName' y 'matchReason'. Si no se encuentran buenas coincidencias, devuelve un arreglo vacío para 'suggestedMatches'.`,
});

const intelligentCardMatchSuggestionFlow = ai.defineFlow(
  {
    name: 'intelligentCardMatchSuggestionFlow',
    inputSchema: IntelligentCardMatchSuggestionInputSchema,
    outputSchema: IntelligentCardMatchSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await matchSuggestionPrompt(input);
    return output!;
  }
);
