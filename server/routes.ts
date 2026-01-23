import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { z } from "zod";
import type { 
  StartRequest, 
  StartResponse, 
  SelectPlotRequest,
  SelectPlotResponse,
  TurnRequest, 
  TurnResponse,
  PlotHook,
  AIResponse,
  GameState,
  LearningEntry,
  ResumenAprendizajes
} from "@shared/schema";
import { durationToTurns, aiResponseSchema } from "@shared/schema";
import { canPlayTurns, incrementTurnCount, getTurnsRemaining, getUsageStats } from "./usageTracker";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Eres un maestro de mazmorras (Dungeon Master) experto en crear aventuras interactivas en español con CONSECUENCIAS REALES.

═══════════════════════════════════════
PRINCIPIOS FUNDAMENTALES
═══════════════════════════════════════

1. EL MUNDO NO PROTEGE AL JUGADOR
   - El mundo es peligroso y realista
   - Las acciones estúpidas tienen consecuencias graves
   - Los enemigos hostiles PERMANECEN hostiles sin razón creíble para cambiar
   - Algunas decisiones llevan a callejones sin salida o muerte

2. CONSECUENCIAS REALES
   - Un jugador desarmado que ataca a alguien armado probablemente muere → GAME OVER
   - Ignorar pistas críticas puede causar fracaso tardío o inmediato
   - Hacer ruido en situaciones de sigilo tiene consecuencias: alarmas, persecución, captura, heridas
   - Las heridas afectan opciones futuras
   - No todas las malas decisiones causan muerte inmediata - algunas:
     * Hieren al jugador (reducir salud)
     * Eliminan opciones futuras
     * Crean situaciones desesperadas pero sobrevivibles

3. PELIGRO JUSTO (SIN MUERTES BARATAS)
   - El peligro DEBE señalarse claramente en la narración ANTES de que ocurra
   - Usa el campo "peligro" para indicar nivel y razón cada turno
   - No muertes aleatorias o inexplicables
   - El jugador debe sentir que su muerte fue MERECIDA por sus acciones

═══════════════════════════════════════
REGLAS DE RESPUESTA
═══════════════════════════════════════

1. SOLO responde en JSON válido. NO incluyas texto fuera del JSON.
2. TODO el contenido debe estar en ESPAÑOL.
3. Adapta vocabulario/gramática al nivel indicado (A2, B1, B2).
4. Proporciona 2-4 opciones de respuesta (puede ser 0 si es game_over o final).
5. Las IDs de opciones: "A", "B", "C", "D" en orden.
6. Descripciones PG-13 permitidas (heridas, muerte, miedo - sin gore explícito).

═══════════════════════════════════════
COHERENCIA NARRATIVA (CRÍTICO)
═══════════════════════════════════════

- La narración DEBE describir EXACTAMENTE la acción elegida
- NUNCA cambies la intención del jugador para "salvarlo"
- Los NPCs hostiles NO se vuelven amigables sin causa creíble
- Si el jugador hace algo letal, MUERE
- Primero describe la consecuencia, luego la nueva situación

═══════════════════════════════════════
FORMATO JSON REQUERIDO
═══════════════════════════════════════

{
  "narracion": "Descripción de lo que pasa como resultado de la acción...",
  "opciones": [
    {"id": "A", "texto": "Primera opción"},
    {"id": "B", "texto": "Segunda opción"}
  ],
  "permitir_texto_libre": true,
  "permitir_preguntas": true,
  "inventario": {
    "agregar": ["objetos ganados"],
    "quitar": ["objetos perdidos/usados"]
  },
  "estado": {
    "progreso": 0.0,
    "tension": 0.0
  },
  "resumen_memoria": "Resumen actualizado de la historia",
  
  "consecuencia": "Descripción breve de qué pasó por la acción del jugador",
  "peligro": {
    "nivel": "bajo|medio|alto",
    "razon": "Por qué hay este nivel de peligro"
  },
  "cambio_estado": {
    "salud_delta": 0,
    "estado_afectos_agregar": ["herido", "asustado"],
    "estado_afectos_quitar": ["descansado"],
    "banderas_agregar": ["vio_mensaje_secreto"],
    "banderas_quitar": []
  },
  "game_over": false,
  "game_over_razon": "Solo si game_over=true: Por qué murió/fracasó",
  "final": false,
  "final_razon": "Solo si final=true: Cómo ganó la aventura"
}

═══════════════════════════════════════
REGLAS DE SALUD Y ESTADO
═══════════════════════════════════════

- salud_delta: positivo = curación, negativo = daño
- Pelea sin armas vs enemigo armado: -50 a -100 (probable muerte)
- Caída menor: -10 a -20
- Herida grave: -30 a -50
- Si salud llega a 0 o menos → game_over = true
- Estados de afecto: herido, sangrando, asustado, agotado, envenenado, etc.
- Banderas: pistas perdidas, objetos destruidos, aliados muertos, etc.

═══════════════════════════════════════
CUÁNDO USAR GAME_OVER
═══════════════════════════════════════

- Salud llega a 0
- Acción suicida obvia (atacar desarmado a enemigo letal)
- Trampa mortal activada sin escape
- Captura sin esperanza de rescate
- Consecuencia inevitable de decisiones anteriores

Cuando game_over=true:
- opciones debe estar vacío []
- permitir_texto_libre = false
- Narra la muerte/fracaso de forma dramática pero justa
- SIEMPRE incluye resumen_aprendizajes con lecciones de español aprendidas

═══════════════════════════════════════
CUÁNDO USAR FINAL (VICTORIA)
═══════════════════════════════════════

- El jugador completó exitosamente la aventura
- progreso = 1.0
- SIEMPRE incluye resumen_aprendizajes al final

Cuando final=true:
- opciones debe estar vacío []
- Narra el final victorioso
- SIEMPRE incluye resumen_aprendizajes con lecciones reales de la partida

═══════════════════════════════════════
ARMAS Y COMBATE
═══════════════════════════════════════

Si la aventura tiene villanos o enemigos:
- DEBE haber armas u objetos útiles para el combate disponibles en el camino
- Ejemplos: espadas, cuchillos, pistolas, palos, antorchas, piedras, herramientas
- El protagonista necesita poder defenderse de manera realista
- Coloca armas en lugares lógicos: armarios, cajas, mesas, guardias caídos
- Algunos objetos del inventario pueden usarse como armas improvisadas
- Da pistas sobre la ubicación de armas cuando el peligro se acerca`;

const PLOT_GENERATION_PROMPT = `Genera exactamente 3 ganchos de trama diferentes para una aventura de texto en español con PELIGRO REAL.

NIVEL DE ESPAÑOL: {level}
DURACIÓN: {duration} ({turns} turnos aproximadamente)

REQUISITOS:
- Cada trama debe tener peligros reales donde el jugador puede morir o fracasar
- Incluye elementos que requieran decisiones cuidadosas
- Mezcla de géneros: misterio, fantasía, aventura, ciencia ficción, histórico
- Adapta vocabulario al nivel indicado

Responde SOLO con JSON válido:
{
  "plots": [
    {
      "id": "1",
      "titulo": "Título corto y atractivo",
      "descripcion": "Descripción de 2-3 oraciones que presente el escenario y el conflicto inicial. Menciona sutilmente el peligro."
    },
    {
      "id": "2", 
      "titulo": "...",
      "descripcion": "..."
    },
    {
      "id": "3",
      "titulo": "...",
      "descripcion": "..."
    }
  ]
}`;

function parseAIResponse(content: string): AIResponse {
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  
  if (parsed.game_over || parsed.final) {
    parsed.opciones = [];
    parsed.permitir_texto_libre = false;
  } else {
    if (!parsed.opciones || parsed.opciones.length < 2) {
      parsed.opciones = [
        { id: "A", texto: "Continuar explorando" },
        { id: "B", texto: "Investigar más" }
      ];
    }
    
    if (parsed.opciones.length > 4) {
      parsed.opciones = parsed.opciones.slice(0, 4);
    }
    
    const validIds = ["A", "B", "C", "D"];
    parsed.opciones = parsed.opciones.map((opt: any, index: number) => ({
      id: validIds[index],
      texto: opt.texto || `Opción ${validIds[index]}`
    }));
  }
  
  if (!parsed.peligro) {
    parsed.peligro = { nivel: "bajo", razon: "Situación tranquila" };
  }
  
  if (!parsed.cambio_estado) {
    parsed.cambio_estado = {};
  }
  
  return aiResponseSchema.parse(parsed);
}

function generateLearningSummary(learningLog: LearningEntry[]): ResumenAprendizajes {
  const puntos: string[] = [];
  const errores: string[] = [];
  const frases: string[] = [];
  
  for (const entry of learningLog) {
    if (entry.tipo === "correccion") {
      errores.push(entry.contenido);
    } else if (entry.tipo === "pista") {
      puntos.push(entry.contenido);
    } else if (entry.tipo === "pregunta") {
      puntos.push(`Pregunta: ${entry.contenido}`);
    }
  }
  
  return {
    puntos: puntos.slice(0, 15),
    errores_frecuentes: errores.slice(0, 10),
    frases_utiles: frases.slice(0, 10),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/usage", (req, res) => {
    res.json(getUsageStats());
  });

  app.post("/api/start", async (req, res) => {
    try {
      const { spanishLevel, duration } = req.body as StartRequest;
      
      const targetTurns = durationToTurns[duration];
      const remaining = getTurnsRemaining();
      
      if (remaining < targetTurns) {
        return res.status(429).json({ 
          error: "limit_reached",
          message: `¡Este juego se ha vuelto muy popular! El límite mensual de turnos ha sido alcanzado. Solo quedan ${remaining} turnos disponibles este mes, pero una aventura "${duration}" necesita ${targetTurns} turnos. Por favor, intenta de nuevo el próximo mes o elige una aventura más corta.`,
          turnsRemaining: remaining,
          turnsNeeded: targetTurns
        });
      }
      
      const session = await storage.createSession(spanishLevel, duration);
      
      const prompt = PLOT_GENERATION_PROMPT
        .replace("{level}", spanishLevel)
        .replace("{duration}", duration)
        .replace("{turns}", String(targetTurns));
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Eres un escritor creativo que genera tramas para juegos de aventura en español con peligro real. Responde SOLO con JSON válido." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 1024,
      });
      
      const content = completion.choices[0]?.message?.content || "";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("Failed to parse AI response:", cleaned);
        parsed = {
          plots: [
            { id: "1", titulo: "La Búsqueda del Tesoro Perdido", descripcion: "Descubres un mapa antiguo que lleva a un tesoro escondido en las montañas. Pero otros también lo buscan, y no dudarán en matarte por él." },
            { id: "2", titulo: "El Misterio del Pueblo Abandonado", descripcion: "Un pueblo fantasma guarda secretos oscuros. Los lugareños desaparecieron hace años. ¿Correrás el mismo destino?" },
            { id: "3", titulo: "El Viaje a las Estrellas", descripcion: "Eres seleccionado para una misión espacial. El espacio es implacable: un error puede ser tu último." }
          ]
        };
      }
      
      const plots: PlotHook[] = (parsed.plots || []).map((p: any, index: number) => ({
        id: p.id || String(index + 1),
        titulo: p.titulo || `Aventura ${index + 1}`,
        descripcion: p.descripcion || "Una emocionante aventura te espera."
      }));
      
      if (plots.length === 0) {
        plots.push(
          { id: "1", titulo: "La Aventura Comienza", descripcion: "Un viaje emocionante pero peligroso te espera. Cada decisión cuenta." }
        );
      }
      
      await storage.updateSession(session.sessionId, { plots });
      
      const response: StartResponse = {
        sessionId: session.sessionId,
        plots
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error in /api/start:", error);
      res.status(500).json({ error: "Error al generar las tramas" });
    }
  });

  app.post("/api/select-plot", async (req, res) => {
    try {
      const { sessionId, plotId, spanishLevel, duration } = req.body as SelectPlotRequest;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sesión no encontrada" });
      }
      
      const selectedPlot = session.plots?.find(p => p.id === plotId);
      if (!selectedPlot) {
        return res.status(400).json({ error: "Trama no encontrada" });
      }
      
      const targetTurns = durationToTurns[duration];
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Comienza una nueva aventura con la siguiente configuración:
            
NIVEL DE ESPAÑOL: ${spanishLevel}
DURACIÓN: ${duration} (${targetTurns} turnos)
TRAMA SELECCIONADA: "${selectedPlot.titulo}"
DESCRIPCIÓN: ${selectedPlot.descripcion}

ESTADO INICIAL DEL JUGADOR:
- Salud: 100
- Estados de afecto: ninguno
- Inventario: vacío
- Banderas: ninguna

Este es el turno 1 de ${targetTurns}. El progreso debe ser 0.0.
Genera la escena inicial que presenta el escenario, el peligro potencial, y ofrece las primeras opciones al jugador.
Indica el nivel de peligro inicial de la situación.` 
          }
        ],
        max_completion_tokens: 2048,
      });
      
      const content = completion.choices[0]?.message?.content || "";
      const aiResponse = parseAIResponse(content);
      
      const gameState: GameState = {
        sessionId,
        spanishLevel,
        duration,
        targetTurns,
        turnIndex: 1,
        progreso: aiResponse.estado.progreso,
        tension: aiResponse.estado.tension,
        plot: selectedPlot,
        inventory: { items: [], pistas: [] },
        resumenMemoria: aiResponse.resumen_memoria,
        history: [{
          turnNumber: 1,
          userInput: `Elegir: ${selectedPlot.titulo}`,
          inputMode: "Acción" as const,
          narracion: aiResponse.narracion,
          opciones: aiResponse.opciones,
          pistaProfesor: aiResponse.pista_profesor || "",
          timestamp: Date.now(),
          consecuencia: aiResponse.consecuencia,
          peligro: aiResponse.peligro,
        }],
        currentOptions: aiResponse.opciones,
        permitirTextoLibre: aiResponse.permitir_texto_libre,
        permitirPreguntas: aiResponse.permitir_preguntas,
        currentNarracion: aiResponse.narracion,
        currentPista: aiResponse.pista_profesor,
        gameEnded: false,
        salud: 100,
        estadoAfectos: [],
        banderas: [],
        learningLog: [],
        currentPeligro: aiResponse.peligro,
        currentConsecuencia: aiResponse.consecuencia,
      };
      
      await storage.updateSession(sessionId, { gameState });
      
      incrementTurnCount(1);
      
      const response: SelectPlotResponse = { gameState };
      res.json(response);
    } catch (error) {
      console.error("Error in /api/select-plot:", error);
      res.status(500).json({ error: "Error al iniciar la aventura" });
    }
  });

  app.post("/api/turn", async (req, res) => {
    try {
      const { sessionId, mode, userInput, selectedOptionId, state, recentHistory } = req.body as TurnRequest;
      
      if (!canPlayTurns(1)) {
        return res.status(429).json({ 
          error: "limit_reached",
          message: "¡Este juego se ha vuelto muy popular! El límite mensual de turnos ha sido alcanzado. Por favor, intenta de nuevo el próximo mes. ¡Gracias por jugar!"
        });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sesión no encontrada" });
      }
      
      const playerAction = userInput || `Opción ${selectedOptionId}`;
      
      const historyContext = recentHistory.map(turn => 
        `Turno ${turn.turnNumber}:\nJugador (${turn.inputMode}): ${turn.userInput}\nNarrador: ${turn.narracion}${turn.consecuencia ? `\nConsecuencia: ${turn.consecuencia}` : ""}`
      ).join("\n\n");
      
      const inventoryStr = state.inventory.items.length > 0 
        ? `Inventario actual: ${state.inventory.items.join(", ")}`
        : "Inventario vacío";
      
      const estadoStr = state.estadoAfectos?.length > 0
        ? `Estados de afecto: ${state.estadoAfectos.join(", ")}`
        : "Sin estados de afecto";
        
      const banderasStr = state.banderas?.length > 0
        ? `Banderas activas: ${state.banderas.join(", ")}`
        : "Sin banderas";
      
      const isNearEnd = state.turnIndex >= state.targetTurns - 3;
      const isAtEnd = state.turnIndex >= state.targetTurns;
      
      let progressGuidance = "";
      if (isAtEnd) {
        progressGuidance = "Este es el turno FINAL. Debes concluir la historia. Si el jugador ha tenido éxito, final=true. Si ha fracasado, game_over=true.";
      } else if (isNearEnd) {
        progressGuidance = `Estamos cerca del final (turno ${state.turnIndex + 1} de ${state.targetTurns}). Lleva la historia hacia su clímax.`;
      } else {
        const expectedProgress = (state.turnIndex + 1) / state.targetTurns;
        progressGuidance = `Turno ${state.turnIndex + 1} de ${state.targetTurns}. Progreso esperado: ~${expectedProgress.toFixed(2)}.`;
      }
      
      if (mode === "Pregunta") {
        const preguntaPrompt = `Eres un profesor de español amable. El estudiante está jugando una aventura de texto en español (nivel ${state.spanishLevel}) y tiene una pregunta.

Contexto de la historia actual: "${state.plot.titulo}" - ${state.resumenMemoria}

PREGUNTA DEL ESTUDIANTE: "${playerAction}"

INSTRUCCIONES:
1. Responde a la pregunta del estudiante de manera clara y concisa en español.
2. Si la pregunta es sobre vocabulario, gramática o expresiones, explícalo brevemente.
3. Si la pregunta es sobre la historia o el juego, responde basándote en el contexto dado.
4. NO avances la historia. Solo responde la pregunta.
5. Mantén la respuesta breve (2-4 oraciones máximo).

Responde SOLO con el texto de tu respuesta, sin formato JSON.`;

        const preguntaCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "user", content: preguntaPrompt }
          ],
          max_completion_tokens: 512,
        });
        
        const respuesta = preguntaCompletion.choices[0]?.message?.content || "No pude entender tu pregunta. ¿Podrías reformularla?";
        
        const response: TurnResponse = {
          aiResponse: {
            narracion: respuesta,
            opciones: [],
            permitir_texto_libre: true,
            permitir_preguntas: true,
            pista_profesor: "",
            inventario: { agregar: [], quitar: [] },
            estado: { progreso: state.progreso, tension: state.tension },
            resumen_memoria: state.resumenMemoria,
            peligro: { nivel: "bajo", razon: "Modo pregunta" },
          },
          gameEnded: false,
          isPreguntaResponse: true,
        };
        
        return res.json(response);
      }

      const turnMessage = `=== ACCIÓN ELEGIDA POR EL JUGADOR ===
"${playerAction}"
=== FIN DE LA ACCIÓN ===

ESTADO ACTUAL DEL JUGADOR:
- Salud: ${state.salud ?? 100}/100
- ${estadoStr}
- ${inventoryStr}
- ${banderasStr}

REGLA OBLIGATORIA: Aplica CONSECUENCIAS REALES a la acción.

ANÁLISIS DE LA ACCIÓN:
1. ¿Es esta acción peligrosa o estúpida dada la situación?
2. ¿Hay enemigos hostiles que reaccionarán?
3. ¿El jugador está ignorando peligro obvio?
4. ¿Qué daño físico o consecuencia lógica resulta?

SI LA ACCIÓN ES LETAL:
- No salves al jugador inventando excusas
- Narra su muerte/fracaso de forma dramática
- game_over = true
- opciones = []

SI LA ACCIÓN ES PELIGROSA PERO NO LETAL:
- Aplica daño apropiado (salud_delta negativo)
- Añade estados de afecto (herido, asustado, etc.)
- El peligro debe aumentar

EJEMPLO - ACCIÓN ESTÚPIDA:
Jugador: "Ataco al guardia con mis manos desnudas" (guardia tiene espada)
→ salud_delta: -100, game_over: true, game_over_razon: "El guardia te atraviesa con su espada antes de que puedas tocarlo."

EJEMPLO - ACCIÓN ARRIESGADA:
Jugador: "Salto por la ventana del segundo piso"
→ salud_delta: -25, estado_afectos_agregar: ["herido"], consecuencia: "La caída te lastima el tobillo"

VERIFICA: ¿Tu respuesta refleja consecuencias realistas?`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `CONTEXTO DEL JUEGO:
Nivel de español: ${state.spanishLevel}
Trama: "${state.plot.titulo}"
${progressGuidance}
Resumen de la historia: ${state.resumenMemoria}

HISTORIAL RECIENTE:
${historyContext || "Este es el primer turno del jugador."}

ACCIÓN ACTUAL:
${turnMessage}` 
          }
        ],
        max_completion_tokens: 2048,
      });
      
      const content = completion.choices[0]?.message?.content || "";
      const aiResponse = parseAIResponse(content);
      
      const gameEnded = aiResponse.game_over || aiResponse.final || aiResponse.estado.progreso >= 1.0 || state.turnIndex >= state.targetTurns;
      
      let grammarFeedback: string | undefined;
      if (userInput && userInput.trim().length > 0 && !selectedOptionId) {
        try {
          const grammarPrompt = `Eres un profesor de español amable. Analiza el siguiente texto escrito por un estudiante de nivel ${state.spanishLevel}.

TEXTO DEL ESTUDIANTE: "${userInput}"

INSTRUCCIONES:
1. Ignora errores de puntuación y acentos
2. Solo señala errores de GRAMÁTICA y ORTOGRAFÍA
3. Si hay errores, explica brevemente qué está mal y cómo corregirlo
4. Si el texto es correcto, di algo positivo
5. Mantén la respuesta corta (2-3 oraciones)
6. Responde en español

Responde SOLO con el texto de tu retroalimentación.`;

          const grammarCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: grammarPrompt }],
            max_completion_tokens: 256,
          });
          
          grammarFeedback = grammarCompletion.choices[0]?.message?.content || undefined;
        } catch (grammarError) {
          console.error("Error getting grammar feedback:", grammarError);
        }
      }
      
      incrementTurnCount(1);
      
      const response: TurnResponse = {
        aiResponse,
        gameEnded,
        isPreguntaResponse: false,
        grammarFeedback,
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error in /api/turn:", error);
      res.status(500).json({ error: "Error al procesar el turno" });
    }
  });

  return httpServer;
}
