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
  GameState
} from "@shared/schema";
import { durationToTurns, aiResponseSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Eres un maestro de mazmorras (Dungeon Master) experto en crear aventuras interactivas en español. Tu trabajo es narrar historias emocionantes y educativas que ayuden a los jugadores a practicar español.

REGLAS ABSOLUTAS:
1. SOLO responde en JSON válido. NO incluyas texto fuera del JSON, ni markdown, ni backticks.
2. TODO el contenido debe estar en ESPAÑOL. Nunca uses inglés.
3. Adapta el vocabulario y la gramática al nivel de español indicado (A2, B1, o B2).
4. Proporciona entre 2 y 4 opciones de respuesta (nunca menos de 2, nunca más de 4).
5. Las IDs de las opciones deben ser "A", "B", "C", "D" en orden.
6. Mantén la coherencia con la trama seleccionada y el estado del juego.
7. Respeta el ritmo de la historia según el progreso indicado.
8. Cuando el modo es "Pregunta", responde brevemente a la pregunta del jugador sobre español y luego continúa la historia.

FORMATO DE RESPUESTA (JSON estricto):
{
  "narracion": "Texto narrativo en español describiendo la escena y los eventos...",
  "opciones": [
    {"id": "A", "texto": "Primera opción de acción"},
    {"id": "B", "texto": "Segunda opción de acción"}
  ],
  "permitir_texto_libre": true,
  "permitir_preguntas": true,
  "pista_profesor": "Consejo opcional sobre vocabulario o gramática (o cadena vacía)",
  "inventario": {
    "agregar": ["objeto nuevo"],
    "quitar": ["objeto usado"]
  },
  "estado": {
    "progreso": 0.0,
    "tension": 0.0
  },
  "resumen_memoria": "Resumen breve de la historia hasta ahora"
}

PAUTAS DE NARRACIÓN:
- Usa descripciones vívidas y evocadoras
- Crea situaciones que requieran tomar decisiones
- Incluye diálogos de personajes secundarios
- Ocasionalmente, establece permitir_texto_libre=false para momentos críticos
- Proporciona pistas de español (pista_profesor) cada 3-4 turnos, no en cada turno
- El progreso debe aumentar gradualmente hacia 1.0 al final de la historia
- La tensión debe variar según los eventos de la trama`;

const PLOT_GENERATION_PROMPT = `Genera exactamente 3 ganchos de trama diferentes para una aventura de texto en español. Cada trama debe ser única y emocionante.

NIVEL DE ESPAÑOL: {level}
DURACIÓN: {duration} ({turns} turnos aproximadamente)

Responde SOLO con JSON válido en este formato exacto:
{
  "plots": [
    {
      "id": "1",
      "titulo": "Título corto y atractivo",
      "descripcion": "Descripción de 2-3 oraciones que presente el escenario y el conflicto inicial"
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
}

Los géneros pueden variar: misterio, fantasía, aventura, ciencia ficción, histórico. Adapta el vocabulario al nivel indicado.`;

function parseAIResponse(content: string): AIResponse {
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  
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
  
  return aiResponseSchema.parse(parsed);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/start", async (req, res) => {
    try {
      const { spanishLevel, duration } = req.body as StartRequest;
      
      const session = await storage.createSession(spanishLevel, duration);
      const targetTurns = durationToTurns[duration];
      
      const prompt = PLOT_GENERATION_PROMPT
        .replace("{level}", spanishLevel)
        .replace("{duration}", duration)
        .replace("{turns}", String(targetTurns));
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Eres un escritor creativo que genera tramas para juegos de aventura en español. Responde SOLO con JSON válido." },
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
            { id: "1", titulo: "La Búsqueda del Tesoro Perdido", descripcion: "Descubres un mapa antiguo que lleva a un tesoro escondido en las montañas. ¿Te atreves a buscarlo?" },
            { id: "2", titulo: "El Misterio del Pueblo Abandonado", descripcion: "Un pueblo fantasma guarda secretos oscuros. Los lugareños desaparecieron hace años y nadie sabe por qué." },
            { id: "3", titulo: "El Viaje a las Estrellas", descripcion: "Eres seleccionado para una misión espacial histórica. El destino de la humanidad está en tus manos." }
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
          { id: "1", titulo: "La Aventura Comienza", descripcion: "Un viaje emocionante te espera lleno de misterio y descubrimientos." }
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

Este es el turno 1 de ${targetTurns}. El progreso debe ser 0.0.
Genera la escena inicial que presenta el escenario y ofrece las primeras opciones al jugador.` 
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
        history: [],
        currentOptions: aiResponse.opciones,
        permitirTextoLibre: aiResponse.permitir_texto_libre,
        permitirPreguntas: aiResponse.permitir_preguntas,
        currentNarracion: aiResponse.narracion,
        currentPista: aiResponse.pista_profesor,
        gameEnded: false,
      };
      
      await storage.updateSession(sessionId, { gameState });
      
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
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sesión no encontrada" });
      }
      
      const playerAction = userInput || `Elijo la opción ${selectedOptionId}`;
      
      const historyContext = recentHistory.map(turn => 
        `Turno ${turn.turnNumber}:\nJugador (${turn.inputMode}): ${turn.userInput}\nNarrador: ${turn.narracion}`
      ).join("\n\n");
      
      const inventoryStr = state.inventory.items.length > 0 
        ? `Inventario actual: ${state.inventory.items.join(", ")}`
        : "Inventario vacío";
      
      const isNearEnd = state.turnIndex >= state.targetTurns - 3;
      const isAtEnd = state.turnIndex >= state.targetTurns;
      
      let progressGuidance = "";
      if (isAtEnd) {
        progressGuidance = "Este es el turno FINAL. Debes concluir la historia de manera satisfactoria. El progreso debe ser 1.0.";
      } else if (isNearEnd) {
        progressGuidance = `Estamos cerca del final (turno ${state.turnIndex + 1} de ${state.targetTurns}). Comienza a llevar la historia hacia su clímax y resolución. El progreso debe acercarse a 1.0.`;
      } else {
        const expectedProgress = (state.turnIndex + 1) / state.targetTurns;
        progressGuidance = `Turno ${state.turnIndex + 1} de ${state.targetTurns}. El progreso debería estar alrededor de ${expectedProgress.toFixed(2)}.`;
      }
      
      const turnMessage = mode === "Pregunta"
        ? `El jugador hace una PREGUNTA sobre el español (no afecta la historia):
"${playerAction}"

Responde brevemente a su pregunta y luego continúa la narración desde donde quedó.`
        : `El jugador realiza una ACCIÓN en la historia:
"${playerAction}"

Narra las consecuencias de esta acción y presenta nuevas opciones.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `CONTEXTO DEL JUEGO:
Nivel de español: ${state.spanishLevel}
Trama: "${state.plot.titulo}"
${inventoryStr}
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
      
      const gameEnded = aiResponse.estado.progreso >= 1.0 || state.turnIndex >= state.targetTurns;
      
      const response: TurnResponse = {
        aiResponse,
        gameEnded
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error in /api/turn:", error);
      res.status(500).json({ error: "Error al procesar el turno" });
    }
  });

  return httpServer;
}
