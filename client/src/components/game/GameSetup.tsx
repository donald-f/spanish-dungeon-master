import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, GraduationCap, Sparkles, BookOpen, Zap, Crown } from "lucide-react";
import type { SpanishLevel, Duration } from "@shared/schema";
import { spanishLevels, durations, durationToTurns } from "@shared/schema";

interface GameSetupProps {
  onStart: (level: SpanishLevel, duration: Duration) => void;
  isLoading: boolean;
}

const levelInfo: Record<SpanishLevel, { icon: typeof BookOpen; description: string; color: string }> = {
  A2: {
    icon: BookOpen,
    description: "Vocabulario básico, frases simples",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  B1: {
    icon: Zap,
    description: "Conversaciones cotidianas, gramática intermedia",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  B2: {
    icon: Crown,
    description: "Expresiones complejas, temas abstractos",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

const durationInfo: Record<Duration, { label: string; time: string }> = {
  corta: { label: "Corta", time: "~15 min" },
  media: { label: "Media", time: "~30 min" },
  larga: { label: "Larga", time: "~60 min" },
};

export function GameSetup({ onStart, isLoading }: GameSetupProps) {
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);

  const canStart = selectedLevel && selectedDuration && !isLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold gradient-text">Bienvenido a tu Aventura</h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Explora mundos fantásticos mientras practicas español con un maestro de mazmorras impulsado por IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Nivel de Español
          </CardTitle>
          <CardDescription>
            Selecciona tu nivel para adaptar el vocabulario y la gramática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {spanishLevels.map((level) => {
              const info = levelInfo[level];
              const Icon = info.icon;
              const isSelected = selectedLevel === level;
              
              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-level-${level}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${info.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{level}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="text-xs">Seleccionado</Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Duración de la Aventura
          </CardTitle>
          <CardDescription>
            Elige cuánto tiempo quieres jugar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {durations.map((duration) => {
              const info = durationInfo[duration];
              const turns = durationToTurns[duration];
              const isSelected = selectedDuration === duration;
              
              return (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-duration-${duration}`}
                >
                  <h3 className="font-semibold text-lg">{info.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{info.time}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">~{turns} turnos</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => selectedLevel && selectedDuration && onStart(selectedLevel, selectedDuration)}
          disabled={!canStart}
          className="px-8 py-6 text-lg"
          data-testid="button-start-game"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Generando aventuras...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Comenzar Aventura
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
