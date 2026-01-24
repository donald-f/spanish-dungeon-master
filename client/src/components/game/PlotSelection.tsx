import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, Loader2, Sparkles, AlertCircle, X, BookOpen } from "lucide-react";
import type { PlotHook, SpanishLevel, Duration } from "@shared/schema";

interface PlotSelectionProps {
  initialPlots: PlotHook[];
  sessionId: string;
  spanishLevel: SpanishLevel;
  duration: Duration;
  onSelectPlot: (plot: PlotHook) => void;
  isLoading: boolean;
}

export function PlotSelection({
  initialPlots,
  sessionId,
  spanishLevel,
  duration,
  onSelectPlot,
  isLoading,
}: PlotSelectionProps) {
  const [plots, setPlots] = useState<PlotHook[]>(initialPlots);
  const [offset, setOffset] = useState(initialPlots.length);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [validatingCustom, setValidatingCustom] = useState(false);

  const handleShowMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/plots?level=${spanishLevel}&duration=${duration}&offset=${offset}&limit=3`
      );
      if (!response.ok) throw new Error("Failed to load plots");
      
      const data = await response.json();
      setPlots([...plots, ...data.plots]);
      setOffset(offset + data.plots.length);
      setHasMore(data.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [spanishLevel, duration, offset, plots]);

  const handleValidateCustomPlot = useCallback(async () => {
    setValidatingCustom(true);
    setCustomError(null);
    
    try {
      const response = await fetch("/api/validate-custom-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: customTitle, description: customDescription }),
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        setCustomError(data.error);
        return;
      }
      
      const customPlot: PlotHook = {
        id: "custom",
        titulo: customTitle,
        descripcion: customDescription,
      };
      onSelectPlot(customPlot);
    } catch {
      setCustomError("Error al validar. Por favor intenta de nuevo.");
    } finally {
      setValidatingCustom(false);
    }
  }, [customTitle, customDescription, onSelectPlot]);

  const titleLength = customTitle.length;
  const descLength = customDescription.length;
  const titleValid = titleLength >= 10 && titleLength <= 120;
  const descValid = descLength >= 50 && descLength <= 1500;
  const canSubmitCustom = titleValid && descValid && !validatingCustom;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Elige tu Aventura</h2>
            <p className="text-muted-foreground">
              Selecciona una trama o crea tu propia historia
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="outline">{spanishLevel}</Badge>
              <Badge variant="outline">{duration}</Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            {plots.map((plot) => (
              <Card
                key={plot.id}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => !isLoading && onSelectPlot(plot)}
                data-testid={`card-plot-${plot.id}`}
              >
                <CardContent className="pt-4 pb-4">
                  <h3 className="font-semibold text-lg mb-2">{plot.titulo}</h3>
                  <p className="text-muted-foreground story-text">{plot.descripcion}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleShowMore}
                disabled={loadingMore}
                data-testid="button-show-more-plots"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Mostrar más historias
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="border-t mt-8 pt-6">
            {!showCustomForm ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowCustomForm(true)}
                data-testid="button-create-custom-plot"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear mi propia historia
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Crear Historia Personalizada
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomError(null);
                      setCustomTitle("");
                      setCustomDescription("");
                    }}
                    data-testid="button-cancel-custom-plot"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Título de la historia
                  </label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej: El Secreto del Bosque Encantado"
                    maxLength={120}
                    data-testid="input-custom-title"
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${titleValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                      10-120 caracteres
                    </span>
                    <span className={`text-xs ${titleValid ? 'text-muted-foreground' : titleLength > 120 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {titleLength}/120
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Descripción de la trama
                  </label>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Describe el escenario, los desafíos y el objetivo de tu aventura..."
                    rows={4}
                    maxLength={1500}
                    data-testid="input-custom-description"
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${descValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                      50-1500 caracteres
                    </span>
                    <span className={`text-xs ${descValid ? 'text-muted-foreground' : descLength > 1500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {descLength}/1500
                    </span>
                  </div>
                </div>
                
                {customError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{customError}</p>
                  </div>
                )}
                
                <Button
                  className="w-full"
                  onClick={handleValidateCustomPlot}
                  disabled={!canSubmitCustom || isLoading}
                  data-testid="button-submit-custom-plot"
                >
                  {validatingCustom ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Comenzar con mi historia
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {isLoading && !validatingCustom && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
