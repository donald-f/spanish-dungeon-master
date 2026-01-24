import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Lightbulb, MessageCircle, PenTool } from "lucide-react";
import type { TurnEntry } from "@shared/schema";

interface HistoryPanelProps {
  history: TurnEntry[];
  onClose: () => void;
}

const TURNS_PER_PAGE = 10;

export function HistoryPanel({ history }: HistoryPanelProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const totalPages = Math.ceil(history.length / TURNS_PER_PAGE);
  const startIndex = currentPage * TURNS_PER_PAGE;
  const endIndex = Math.min(startIndex + TURNS_PER_PAGE, history.length);
  const currentTurns = history.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1">
        {history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No hay turnos anteriores</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {currentTurns.map((turn, index) => (
              <div key={turn.turnNumber} className="space-y-3">
                {index > 0 && <Separator />}
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">Turno {turn.turnNumber}</Badge>
                  <Badge variant="secondary" className="text-xs">
                    {turn.inputMode}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(turn.timestamp).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    {turn.inputMode === "Pregunta" ? "Tu pregunta:" : "Tu acción:"}
                  </p>
                  <p className="font-medium">{turn.userInput}</p>
                </div>

                {turn.preguntaRespuesta && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Respuesta del Profesor</p>
                      <p className="text-sm">{turn.preguntaRespuesta}</p>
                    </div>
                  </div>
                )}

                {turn.grammarFeedback && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <PenTool className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Corrección de Español</p>
                      <p className="text-sm">{turn.grammarFeedback}</p>
                    </div>
                  </div>
                )}

                {turn.narracion && (
                  <div className="story-text leading-relaxed whitespace-pre-wrap">
                    {turn.narracion}
                  </div>
                )}

                {turn.pistaProfesor && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/20 border border-accent/30">
                    <Lightbulb className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-sm">{turn.pistaProfesor}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              data-testid="button-next-page"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
