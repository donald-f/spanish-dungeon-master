import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, History, Lightbulb, Sword, HelpCircle, Trophy, X, MessageCircle } from "lucide-react";
import type { GameState, InputMode, GameOption } from "@shared/schema";

interface GameChatProps {
  gameState: GameState;
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onSendAction: (userInput?: string, selectedOptionId?: string) => void;
  onShowHistory: () => void;
  isLoading: boolean;
  gameEnded: boolean;
  preguntaRespuesta?: string | null;
  onDismissPregunta?: () => void;
}

export function GameChat({
  gameState,
  inputMode,
  onModeChange,
  onSendAction,
  onShowHistory,
  isLoading,
  gameEnded,
  preguntaRespuesta,
  onDismissPregunta,
}: GameChatProps) {
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.currentNarracion]);

  const handleOptionClick = (option: GameOption) => {
    if (!isLoading && !gameEnded) {
      onSendAction(undefined, option.id);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && !isLoading && !gameEnded) {
      onSendAction(textInput.trim(), undefined);
      setTextInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  return (
    <Card className="h-[calc(100vh-180px)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            Turno {gameState.turnIndex} / {gameState.targetTurns}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Nivel {gameState.spanishLevel}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => onModeChange("Acción")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                inputMode === "Acción"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              disabled={!gameState.permitirPreguntas && inputMode === "Pregunta"}
              data-testid="button-mode-accion"
            >
              <Sword className="h-3.5 w-3.5" />
              Acción
            </button>
            <button
              onClick={() => onModeChange("Pregunta")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                inputMode === "Pregunta"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              } ${!gameState.permitirPreguntas ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!gameState.permitirPreguntas}
              data-testid="button-mode-pregunta"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Pregunta
            </button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowHistory}
            data-testid="button-show-history"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6">
          {/* Show previous turns (excluding the current turn which is displayed separately) */}
          {gameState.history.slice(-4, -1).map((turn, index) => (
            <div key={turn.turnNumber} className="space-y-3">
              {index > 0 && <Separator className="my-4" />}
              
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Tu acción:</p>
                <p className="font-medium">{turn.userInput}</p>
              </div>
              
              <div className="story-text leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {turn.narracion}
              </div>
              
              {turn.pistaProfesor && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <Lightbulb className="h-4 w-4 text-accent/70 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{turn.pistaProfesor}</p>
                </div>
              )}
            </div>
          ))}
          
          {gameState.history.length > 1 && <Separator className="my-4" />}
          
          {/* Current turn: show the player's last action if there's history */}
          {gameState.history.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Tu acción:</p>
              <p className="font-medium">{gameState.history[gameState.history.length - 1].userInput}</p>
            </div>
          )}
          
          {/* Current narration */}
          <div className="story-text leading-relaxed whitespace-pre-wrap">
            {gameState.currentNarracion}
          </div>
          
          {gameState.currentPista && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/20 border border-accent/30">
              <Lightbulb className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-sm">{gameState.currentPista}</p>
            </div>
          )}
          
          {preguntaRespuesta && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/10 border border-primary/30" data-testid="pregunta-respuesta">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-primary">Respuesta del Profesor</span>
                  {onDismissPregunta && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onDismissPregunta}
                      data-testid="button-dismiss-pregunta"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm">{preguntaRespuesta}</p>
              </div>
            </div>
          )}
          
          {gameEnded && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="p-4 rounded-full bg-primary/10">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-center">¡Aventura Completada!</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Has terminado tu aventura en español. ¡Felicitaciones por practicar el idioma de una manera tan divertida!
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {!gameEnded && (
        <CardContent className="border-t p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gameState.currentOptions.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="justify-start text-left h-auto py-3 px-4 whitespace-normal"
                onClick={() => handleOptionClick(option)}
                disabled={isLoading}
                data-testid={`button-option-${option.id}`}
              >
                <Badge variant="secondary" className="mr-2 shrink-0">{option.id}</Badge>
                <span className="text-wrap">{option.texto}</span>
              </Button>
            ))}
          </div>

          {gameState.permitirTextoLibre && (
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  inputMode === "Pregunta"
                    ? "Escribe tu pregunta sobre el español..."
                    : "Escribe tu propia acción..."
                }
                className="min-h-[60px] resize-none"
                disabled={isLoading}
                data-testid="textarea-custom-input"
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isLoading}
                className="shrink-0"
                data-testid="button-send-text"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              El maestro de mazmorras está pensando...
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
