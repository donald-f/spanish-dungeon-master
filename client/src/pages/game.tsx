import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Scroll, RotateCcw, Sun, Moon, AlertTriangle, Loader2, Backpack, History, Volume2, VolumeX } from "lucide-react";
import type { GameState, SpanishLevel, Duration, PlotHook, InputMode, TurnEntry, ResumenAprendizajes, LearningEntry } from "@shared/schema";
import { GameSetup } from "@/components/game/GameSetup";
import { GameChat } from "@/components/game/GameChat";
import { InventoryPanel } from "@/components/game/InventoryPanel";
import { HistoryPanel } from "@/components/game/HistoryPanel";
import { PlotSelection } from "@/components/game/PlotSelection";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/use-tts";

const SESSION_STORAGE_KEY = "aventura_session_id";
const DARK_MODE_KEY = "aventura_dark_mode";
const TTS_MUTE_KEY = "aventura_tts_mute";

type GamePhase = "setup" | "selectPlot" | "playing" | "ended" | "loading";

export default function Game() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [plots, setPlots] = useState<PlotHook[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel>("B1");
  const [selectedDuration, setSelectedDuration] = useState<Duration>("media");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("Acción");
  const [showHistory, setShowHistory] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    const isDark = saved === "true";
    if (isDark) {
      document.documentElement.classList.add("dark");
    }
    return isDark;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem(TTS_MUTE_KEY);
    return saved === "true";
  });
  const [grammarFeedback, setGrammarFeedback] = useState<string | null>(null);
  const { speak, stop: stopTTS } = useTTS({ lang: "es-ES", rate: 0.9 });
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverRazon, setGameOverRazon] = useState<string | undefined>();
  const [isFinal, setIsFinal] = useState(false);
  const [finalRazon, setFinalRazon] = useState<string | undefined>();
  const [resumenAprendizajes, setResumenAprendizajes] = useState<ResumenAprendizajes | undefined>();
  const { toast } = useToast();

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const saveSession = useCallback((id: string) => {
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }, []);

  useEffect(() => {
    const checkExistingSession = async () => {
      const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!savedSessionId) {
        setPhase("setup");
        return;
      }
      
      try {
        const response = await fetch(`/api/session/${savedSessionId}`);
        
        if (!response.ok) {
          clearSession();
          setPhase("setup");
          return;
        }
        
        const data = await response.json();
        setSessionId(savedSessionId);
        setGameState(data.gameState);
        setSelectedLevel(data.gameState.spanishLevel);
        setSelectedDuration(data.gameState.duration);
        setPhase("playing");
        
        toast({
          title: "Sesión restaurada",
          description: "Continuando tu aventura desde donde la dejaste.",
        });
      } catch {
        clearSession();
        setPhase("setup");
      }
    };
    
    checkExistingSession();
  }, [clearSession, toast]);

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem(DARK_MODE_KEY, String(newDarkMode));
    document.documentElement.classList.toggle("dark");
  }, [darkMode]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(TTS_MUTE_KEY, String(newMuted));
    if (newMuted) {
      stopTTS();
    }
  }, [isMuted, stopTTS]);

  const speakNarration = useCallback((text: string) => {
    if (!isMuted && text) {
      speak(text);
    }
  }, [isMuted, speak]);

  const handleStartGame = useCallback(async (level: SpanishLevel, duration: Duration) => {
    setIsLoading(true);
    setSelectedLevel(level);
    setSelectedDuration(duration);
    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spanishLevel: level, duration }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === "limit_reached") {
          setLimitError(data.message);
          return;
        }
        throw new Error("Error al iniciar el juego");
      }
      
      setLimitError(null);
      setSessionId(data.sessionId);
      setPlots(data.plots);
      setPhase("selectPlot");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar el juego. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSelectPlot = useCallback(async (plot: PlotHook) => {
    setIsLoading(true);
    try {
      const requestBody: Record<string, string> = {
        sessionId,
        plotId: plot.id,
        spanishLevel: selectedLevel,
        duration: selectedDuration,
      };
      
      // Include custom plot details when selecting a custom plot
      if (plot.id === "custom") {
        requestBody.customTitle = plot.titulo;
        requestBody.customDescription = plot.descripcion;
      }
      
      const response = await fetch("/api/select-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) throw new Error("Error al seleccionar la trama");
      
      const data = await response.json();
      setGameState(data.gameState);
      setPhase("playing");
      setIsGameOver(false);
      setIsFinal(false);
      setGameOverRazon(undefined);
      setFinalRazon(undefined);
      setResumenAprendizajes(undefined);
      saveSession(sessionId);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar la aventura. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedLevel, selectedDuration, toast, saveSession]);

  const [preguntaRespuesta, setPreguntaRespuesta] = useState<string | null>(null);

  const handleSendAction = useCallback(async (userInput?: string, selectedOptionId?: string) => {
    if (!gameState) return;
    
    setIsLoading(true);
    setPreguntaRespuesta(null);
    
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mode: inputMode,
          userInput,
          selectedOptionId,
          state: {
            spanishLevel: gameState.spanishLevel,
            duration: gameState.duration,
            targetTurns: gameState.targetTurns,
            turnIndex: gameState.turnIndex,
            progreso: gameState.progreso,
            tension: gameState.tension,
            plot: gameState.plot,
            inventory: gameState.inventory,
            resumenMemoria: gameState.resumenMemoria,
            salud: gameState.salud ?? 100,
            estadoAfectos: gameState.estadoAfectos ?? [],
            banderas: gameState.banderas ?? [],
          },
          recentHistory: gameState.history.slice(-8),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === "limit_reached") {
          setLimitError(data.message);
          return;
        }
        throw new Error("Error al procesar la acción");
      }
      
      if (data.isPreguntaResponse) {
        setPreguntaRespuesta(data.aiResponse.narracion);
        setGrammarFeedback(null);
        
        const newLearningEntry: LearningEntry = {
          tipo: "pregunta",
          contenido: userInput || "",
          turno: gameState.turnIndex,
        };
        setGameState({
          ...gameState,
          learningLog: [...(gameState.learningLog || []), newLearningEntry],
        });
        return;
      }
      
      let displayInput = userInput || "";
      if (selectedOptionId && userInput) {
        displayInput = `${selectedOptionId}. ${userInput}`;
      }
      
      const newTurnEntry: TurnEntry = {
        turnNumber: gameState.turnIndex + 1,
        userInput: displayInput,
        inputMode,
        narracion: data.aiResponse.narracion,
        opciones: data.aiResponse.opciones,
        pistaProfesor: data.aiResponse.pista_profesor,
        timestamp: Date.now(),
        consecuencia: data.aiResponse.consecuencia,
        peligro: data.aiResponse.peligro,
      };
      
      const newInventory = { ...gameState.inventory };
      if (data.aiResponse.inventario?.agregar) {
        newInventory.items = [...newInventory.items, ...data.aiResponse.inventario.agregar];
      }
      if (data.aiResponse.inventario?.quitar) {
        newInventory.items = newInventory.items.filter(
          item => !data.aiResponse.inventario.quitar.includes(item)
        );
      }
      if (data.aiResponse.inventario?.pistas) {
        newInventory.pistas = [...newInventory.pistas, ...data.aiResponse.inventario.pistas];
      }
      
      let newSalud = gameState.salud ?? 100;
      if (data.aiResponse.cambio_estado?.salud_delta) {
        newSalud = Math.max(0, Math.min(100, newSalud + data.aiResponse.cambio_estado.salud_delta));
      }
      
      let newEstadoAfectos = [...(gameState.estadoAfectos || [])];
      if (data.aiResponse.cambio_estado?.estado_afectos_agregar) {
        newEstadoAfectos = Array.from(new Set([...newEstadoAfectos, ...data.aiResponse.cambio_estado.estado_afectos_agregar]));
      }
      if (data.aiResponse.cambio_estado?.estado_afectos_quitar) {
        newEstadoAfectos = newEstadoAfectos.filter(
          e => !data.aiResponse.cambio_estado.estado_afectos_quitar.includes(e)
        );
      }
      
      let newBanderas = [...(gameState.banderas || [])];
      if (data.aiResponse.cambio_estado?.banderas_agregar) {
        newBanderas = Array.from(new Set([...newBanderas, ...data.aiResponse.cambio_estado.banderas_agregar]));
      }
      if (data.aiResponse.cambio_estado?.banderas_quitar) {
        newBanderas = newBanderas.filter(
          b => !data.aiResponse.cambio_estado.banderas_quitar.includes(b)
        );
      }
      
      let newLearningLog = [...(gameState.learningLog || [])];
      if (data.aiResponse.pista_profesor) {
        newLearningLog.push({
          tipo: "pista",
          contenido: data.aiResponse.pista_profesor,
          turno: gameState.turnIndex + 1,
        });
      }
      if (data.grammarFeedback) {
        newLearningLog.push({
          tipo: "correccion",
          contenido: data.grammarFeedback,
          turno: gameState.turnIndex + 1,
        });
      }
      
      const isGameOverNow = data.aiResponse.game_over || newSalud <= 0;
      const isFinalNow = data.aiResponse.final;
      
      setGameState({
        ...gameState,
        turnIndex: gameState.turnIndex + 1,
        progreso: data.aiResponse.estado.progreso,
        tension: data.aiResponse.estado.tension,
        inventory: newInventory,
        resumenMemoria: data.aiResponse.resumen_memoria,
        history: [...gameState.history, newTurnEntry],
        currentOptions: data.aiResponse.opciones || [],
        permitirTextoLibre: data.aiResponse.permitir_texto_libre,
        permitirPreguntas: data.aiResponse.permitir_preguntas,
        currentNarracion: data.aiResponse.narracion,
        currentPista: data.aiResponse.pista_profesor,
        gameEnded: data.gameEnded || isGameOverNow || isFinalNow,
        salud: newSalud,
        estadoAfectos: newEstadoAfectos,
        banderas: newBanderas,
        learningLog: newLearningLog,
        currentPeligro: data.aiResponse.peligro,
        currentConsecuencia: data.aiResponse.consecuencia,
        gameOverRazon: data.aiResponse.game_over_razon,
        finalRazon: data.aiResponse.final_razon,
        resumenAprendizajes: data.aiResponse.resumen_aprendizajes,
      });
      
      setPreguntaRespuesta(null);
      
      if (data.grammarFeedback) {
        setGrammarFeedback(data.grammarFeedback);
      } else {
        setGrammarFeedback(null);
      }
      
      if (isGameOverNow) {
        setIsGameOver(true);
        setGameOverRazon(data.aiResponse.game_over_razon || (newSalud <= 0 ? "Tu salud llegó a cero." : undefined));
        setPhase("ended");
        clearSession();
      } else if (isFinalNow) {
        setIsFinal(true);
        setFinalRazon(data.aiResponse.final_razon);
        setPhase("ended");
        clearSession();
      } else if (data.gameEnded) {
        setPhase("ended");
        clearSession();
      }
      
      if (data.aiResponse.resumen_aprendizajes) {
        setResumenAprendizajes(data.aiResponse.resumen_aprendizajes);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar tu acción. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [gameState, sessionId, inputMode, toast, clearSession]);

  const handleNewGame = useCallback(() => {
    clearSession();
    setPhase("setup");
    setGameState(null);
    setPlots([]);
    setSessionId("");
    setInputMode("Acción");
    setShowHistory(false);
    setLimitError(null);
    setIsGameOver(false);
    setIsFinal(false);
    setGameOverRazon(undefined);
    setFinalRazon(undefined);
    setResumenAprendizajes(undefined);
  }, [clearSession]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Scroll className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold gradient-text">Aventura en Español</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {phase === "playing" && gameState && (
              <div className="hidden sm:flex items-center gap-3 mr-4">
                <span className="text-sm text-muted-foreground">Progreso:</span>
                <Progress value={gameState.progreso * 100} className="w-24 h-2" />
                <span className="text-sm font-medium">{Math.round(gameState.progreso * 100)}%</span>
              </div>
            )}
            
            {phase !== "setup" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewGame}
                data-testid="button-new-game"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Nuevo Juego
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              data-testid="button-toggle-mute"
              title={isMuted ? "Activar narración" : "Silenciar narración"}
              aria-label={isMuted ? "Activar narración" : "Silenciar narración"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-toggle-theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {limitError && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Límite de Uso Alcanzado</h3>
                  <p className="text-sm">{limitError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setLimitError(null)}
                    data-testid="button-dismiss-limit-error"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        )}
        
        {phase === "setup" && (
          <GameSetup
            onStart={handleStartGame}
            isLoading={isLoading}
          />
        )}

        {phase === "selectPlot" && (
          <PlotSelection
            initialPlots={plots}
            sessionId={sessionId}
            spanishLevel={selectedLevel}
            duration={selectedDuration}
            onSelectPlot={handleSelectPlot}
            isLoading={isLoading}
          />
        )}

        {(phase === "playing" || phase === "ended") && gameState && (
          <>
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 mb-4 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInventory(true)}
                  data-testid="button-open-inventory"
                >
                  <Backpack className="h-4 w-4 mr-2" />
                  Inventario
                  {gameState.inventory.items.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 rounded-full px-1.5">
                      {gameState.inventory.items.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  data-testid="button-open-history"
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial
                  {gameState.history.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 rounded-full px-1.5">
                      {gameState.history.length}
                    </span>
                  )}
                </Button>
              </div>
              
              <GameChat
                gameState={gameState}
                inputMode={inputMode}
                onModeChange={setInputMode}
                onSendAction={handleSendAction}
                onShowHistory={() => setShowHistory(true)}
                isLoading={isLoading}
                gameEnded={phase === "ended"}
                isGameOver={isGameOver}
                gameOverRazon={gameOverRazon}
                isFinal={isFinal}
                finalRazon={finalRazon}
                resumenAprendizajes={resumenAprendizajes}
                preguntaRespuesta={preguntaRespuesta}
                onDismissPregunta={() => setPreguntaRespuesta(null)}
                grammarFeedback={grammarFeedback}
                onDismissGrammarFeedback={() => setGrammarFeedback(null)}
                onSpeakNarration={speakNarration}
              />
            </div>
            
            <Sheet open={showInventory} onOpenChange={setShowInventory}>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Backpack className="h-5 w-5 text-primary" />
                    Inventario y Estado
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <InventoryPanel
                    inventory={gameState.inventory}
                    turnNumber={gameState.turnIndex}
                    targetTurns={gameState.targetTurns}
                    tension={gameState.tension}
                    peligro={gameState.currentPeligro}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Historial de la Aventura
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <HistoryPanel
                    history={gameState.history}
                    onClose={() => setShowHistory(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </main>
    </div>
  );
}
