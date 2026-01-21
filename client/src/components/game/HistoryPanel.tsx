import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Lightbulb } from "lucide-react";
import type { TurnEntry } from "@shared/schema";

interface HistoryPanelProps {
  history: TurnEntry[];
  onClose: () => void;
}

const TURNS_PER_PAGE = 10;

export function HistoryPanel({ history, onClose }: HistoryPanelProps) {
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
    <Card className="h-[calc(100vh-180px)] flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">Historial de la Aventura</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-history"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 px-6">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No hay turnos anteriores</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {currentTurns.map((turn, index) => (
              <div key={turn.turnNumber} className="space-y-3">
                {index > 0 && <Separator />}
                
                <div className="flex items-center gap-2">
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
                  <p className="text-sm text-muted-foreground">Tu acción:</p>
                  <p className="font-medium">{turn.userInput}</p>
                </div>

                <div className="story-text leading-relaxed whitespace-pre-wrap">
                  {turn.narracion}
                </div>

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
      </ScrollArea>

      {totalPages > 1 && (
        <CardContent className="border-t pt-4">
          <div className="flex items-center justify-between">
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
        </CardContent>
      )}
    </Card>
  );
}
