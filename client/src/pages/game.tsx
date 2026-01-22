import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Scroll, RotateCcw, Sun, Moon } from "lucide-react";
import type { GameState, SpanishLevel, Duration, PlotHook, InputMode, TurnEntry } from "@shared/schema";
import { GameSetup } from "@/components/game/GameSetup";
import { GameChat } from "@/components/game/GameChat";
import { InventoryPanel } from "@/components/game/InventoryPanel";
import { HistoryPanel } from "@/components/game/HistoryPanel";
import { useToast } from "@/hooks/use-toast";

type GamePhase = "setup" | "selectPlot" | "playing" | "ended";

export default function Game() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [plots, setPlots] = useState<PlotHook[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel>("B1");
  const [selectedDuration, setSelectedDuration] = useState<Duration>("media");
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("Acción");
  const [showHistory, setShowHistory] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { toast } = useToast();

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  }, [darkMode]);

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
      
      if (!response.ok) throw new Error("Error al iniciar el juego");
      
      const data = await response.json();
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
      const response = await fetch("/api/select-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          plotId: plot.id,
          spanishLevel: selectedLevel,
          duration: selectedDuration,
        }),
      });
      
      if (!response.ok) throw new Error("Error al seleccionar la trama");
      
      const data = await response.json();
      setGameState(data.gameState);
      setPhase("playing");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar la aventura. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedLevel, selectedDuration, toast]);

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
          },
          recentHistory: gameState.history.slice(-8),
        }),
      });
      
      if (!response.ok) throw new Error("Error al procesar la acción");
      
      const data = await response.json();
      
      // Handle "Pregunta" mode - just show the answer, don't advance the turn
      if (data.isPreguntaResponse) {
        setPreguntaRespuesta(data.aiResponse.narracion);
        // Keep Pregunta mode - user must manually switch back to Acción
        return;
      }
      
      // Normal action - advance the story
      // Get the full option text if the user selected an option
      let displayInput = userInput || "";
      if (selectedOptionId && !userInput) {
        const selectedOption = gameState.currentOptions.find(opt => opt.id === selectedOptionId);
        displayInput = selectedOption ? `${selectedOption.id}. ${selectedOption.texto}` : selectedOptionId;
      }
      
      const newTurnEntry: TurnEntry = {
        turnNumber: gameState.turnIndex + 1,
        userInput: displayInput,
        inputMode,
        narracion: data.aiResponse.narracion,
        opciones: data.aiResponse.opciones,
        pistaProfesor: data.aiResponse.pista_profesor,
        timestamp: Date.now(),
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
      
      setGameState({
        ...gameState,
        turnIndex: gameState.turnIndex + 1,
        progreso: data.aiResponse.estado.progreso,
        tension: data.aiResponse.estado.tension,
        inventory: newInventory,
        resumenMemoria: data.aiResponse.resumen_memoria,
        history: [...gameState.history, newTurnEntry],
        currentOptions: data.aiResponse.opciones,
        permitirTextoLibre: data.aiResponse.permitir_texto_libre,
        permitirPreguntas: data.aiResponse.permitir_preguntas,
        currentNarracion: data.aiResponse.narracion,
        currentPista: data.aiResponse.pista_profesor,
        gameEnded: data.gameEnded,
      });
      
      setPreguntaRespuesta(null);
      
      if (data.gameEnded) {
        setPhase("ended");
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
  }, [gameState, sessionId, inputMode, toast]);

  const handleNewGame = useCallback(() => {
    setPhase("setup");
    setGameState(null);
    setPlots([]);
    setSessionId("");
    setInputMode("Acción");
    setShowHistory(false);
  }, []);

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
              onClick={toggleDarkMode}
              data-testid="button-toggle-theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {phase === "setup" && (
          <GameSetup
            onStart={handleStartGame}
            isLoading={isLoading}
          />
        )}

        {phase === "selectPlot" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold text-center mb-6">Elige tu Aventura</h2>
                <p className="text-muted-foreground text-center mb-8">
                  Selecciona una de las siguientes tramas para comenzar tu historia:
                </p>
                
                <div className="space-y-4">
                  {plots.map((plot) => (
                    <Card
                      key={plot.id}
                      className="hover-elevate cursor-pointer transition-all"
                      onClick={() => !isLoading && handleSelectPlot(plot)}
                      data-testid={`card-plot-${plot.id}`}
                    >
                      <CardContent className="pt-4 pb-4">
                        <h3 className="font-semibold text-lg mb-2">{plot.titulo}</h3>
                        <p className="text-muted-foreground story-text">{plot.descripcion}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {isLoading && (
                  <div className="flex justify-center mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {(phase === "playing" || phase === "ended") && gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {showHistory ? (
                <HistoryPanel
                  history={gameState.history}
                  onClose={() => setShowHistory(false)}
                />
              ) : (
                <GameChat
                  gameState={gameState}
                  inputMode={inputMode}
                  onModeChange={setInputMode}
                  onSendAction={handleSendAction}
                  onShowHistory={() => setShowHistory(true)}
                  isLoading={isLoading}
                  gameEnded={phase === "ended"}
                  preguntaRespuesta={preguntaRespuesta}
                  onDismissPregunta={() => setPreguntaRespuesta(null)}
                />
              )}
            </div>
            
            <div className="lg:col-span-1">
              <InventoryPanel
                inventory={gameState.inventory}
                turnNumber={gameState.turnIndex}
                targetTurns={gameState.targetTurns}
                tension={gameState.tension}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
