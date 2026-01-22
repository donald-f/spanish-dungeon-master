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

COHERENCIA NARRATIVA (CRÍTICO - LEE CON ATENCIÓN):
- La narración DEBE describir EXACTAMENTE la acción que el jugador eligió, NO una versión diferente.
- Si el jugador eligió "examinar el compartimento", describe QUÉ VE en el compartimento, NO otra acción.
- Si el jugador eligió "ir a casa", la escena DEBE estar en la casa, NO en el lugar anterior.
- Si el jugador eligió "hablar con alguien", muestra ESA conversación específica.
- NUNCA cambies o reinterpretes la acción del jugador. Ejecuta EXACTAMENTE lo que eligieron.
- La narración debe empezar mostrando el resultado de la acción elegida.
- Ejemplo MALO: Jugador elige "Examinar la habitación" → Narración: "Decides ir al jardín..."
- Ejemplo BUENO: Jugador elige "Examinar la habitación" → Narración: "Miras alrededor de la habitación. Ves una cama vieja, un escritorio polvoriento..."
- El "resumen_memoria" debe actualizarse para reflejar la nueva ubicación y situación del personaje.

FORMATO DE RESPUESTA (JSON estricto):
{
  "narracion": "Texto narrativo en español describiendo la NUEVA escena DESPUÉS de que el jugador realizó su acción...",
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
  "resumen_memoria": "Resumen actualizado: incluye ubicación actual, objetos importantes, y eventos clave"
}

PAUTAS DE NARRACIÓN:
- La narración describe lo que pasa DESPUÉS de la acción del jugador, no antes
- Usa descripciones vívidas del NUEVO escenario o situación
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
        history: [{
          turnNumber: 1,
          userInput: `Elegir: ${selectedPlot.titulo}`,
          inputMode: "Acción" as const,
          narracion: aiResponse.narracion,
          opciones: aiResponse.opciones,
          pistaProfesor: aiResponse.pista_profesor || "",
          timestamp: Date.now(),
        }],
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
      
      // Use the full action text - userInput now contains the option text when clicking buttons
      const playerAction = userInput || `Opción ${selectedOptionId}`;
      
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
      
      // Handle "Pregunta" mode separately - just answer the question without advancing story
      if (mode === "Pregunta") {
        const preguntaPrompt = `Eres un profesor de español amable y paciente. El estudiante está jugando una aventura de texto en español (nivel ${state.spanishLevel}) y tiene una pregunta.

Contexto de la historia actual: "${state.plot.titulo}" - ${state.resumenMemoria}

PREGUNTA DEL ESTUDIANTE: "${playerAction}"

INSTRUCCIONES:
1. Responde a la pregunta del estudiante de manera clara y concisa en español.
2. Si la pregunta es sobre vocabulario, gramática o expresiones, explícalo brevemente.
3. Si la pregunta es sobre la historia o el juego, responde basándote en el contexto dado.
4. Si no conoces la respuesta o la pregunta no tiene sentido, di que no lo sabes amablemente.
5. NO avances la historia. Solo responde la pregunta.
6. Mantén la respuesta breve (2-4 oraciones máximo).

Responde SOLO con el texto de tu respuesta, sin formato JSON.`;

        const preguntaCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "user", content: preguntaPrompt }
          ],
          max_completion_tokens: 512,
        });
        
        const respuesta = preguntaCompletion.choices[0]?.message?.content || "No pude entender tu pregunta. ¿Podrías reformularla?";
        
        // Return a special response for pregunta mode that doesn't advance the story
        const response: TurnResponse = {
          aiResponse: {
            narracion: respuesta,
            opciones: [], // Empty - indicates this is a pregunta response
            permitir_texto_libre: true,
            permitir_preguntas: true,
            pista_profesor: "",
            inventario: { agregar: [], quitar: [] },
            estado: { progreso: state.progreso, tension: state.tension }, // Keep same state
            resumen_memoria: state.resumenMemoria, // Keep same memory
          },
          gameEnded: false,
          isPreguntaResponse: true, // Flag to indicate this was a question
        };
        
        return res.json(response);
      }

      // Normal action mode - advance the story
      const turnMessage = `=== ACCIÓN ELEGIDA POR EL JUGADOR ===
"${playerAction}"
=== FIN DE LA ACCIÓN ===

REGLA OBLIGATORIA: Tu narración DEBE describir AL JUGADOR realizando EXACTAMENTE la acción de arriba.

ANÁLISIS DE LA ACCIÓN:
Lee la acción palabra por palabra. Si dice:
- "Dejar que el gato se acerque" → El GATO se acerca, NO el jugador
- "Hablar con X" → El jugador HABLA con X
- "Examinar Y" → El jugador EXAMINA Y
- "Esperar" → El jugador NO HACE NADA, solo observa

PRIMERA ORACIÓN DE TU NARRACIÓN:
- Debe describir EXACTAMENTE lo que dice la acción elegida
- NO inventes acciones diferentes
- NO hagas que el jugador haga algo que NO eligió

EJEMPLO CORRECTO:
Acción: "Dejar que el gato se acerque al guardián"
Narración: "Te quedas quieto mientras el gato camina lentamente hacia el guardián..."

EJEMPLO INCORRECTO (PROHIBIDO):
Acción: "Dejar que el gato se acerque al guardián"
Narración: "Das un paso al frente y te diriges al guardián..." ← ¡ERROR! El jugador NO eligió acercarse él mismo

VERIFICA TU RESPUESTA: ¿Tu primera oración describe la MISMA acción que eligió el jugador?`;

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
      
      // If user typed free text (not selected an option), provide grammar feedback
      let grammarFeedback: string | undefined;
      if (userInput && userInput.trim().length > 0 && !selectedOptionId) {
        try {
          const grammarPrompt = `Eres un profesor de español amable. Analiza el siguiente texto escrito por un estudiante de nivel ${state.spanishLevel}.

TEXTO DEL ESTUDIANTE: "${userInput}"

INSTRUCCIONES:
1. Ignora errores de puntuación (comas, puntos, etc.)
2. Ignora errores de acentos (tildes)
3. Solo señala errores de GRAMÁTICA y ORTOGRAFÍA (letras incorrectas, conjugaciones, género/número, etc.)
4. Si hay errores, explica brevemente qué está mal y cómo corregirlo
5. Si el texto es correcto (ignorando puntuación/acentos), di algo positivo como "¡Muy bien escrito!"
6. Mantén la respuesta corta (2-3 oraciones máximo)
7. Responde en español

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
