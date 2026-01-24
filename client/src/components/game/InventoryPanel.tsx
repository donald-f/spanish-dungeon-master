import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Backpack, Key, Flame, Target, Shield, AlertTriangle, Zap } from "lucide-react";
import type { Inventory, Peligro } from "@shared/schema";

interface InventoryPanelProps {
  inventory: Inventory;
  turnNumber: number;
  targetTurns: number;
  tension: number;
  peligro?: Peligro;
}

export function InventoryPanel({ inventory, turnNumber, targetTurns, tension, peligro }: InventoryPanelProps) {
  const tensionLevel = tension < 0.3 ? "Tranquilo" : tension < 0.6 ? "Tenso" : tension < 0.8 ? "Intenso" : "Crítico";
  const tensionColor = tension < 0.3 
    ? "text-green-600 dark:text-green-400" 
    : tension < 0.6 
    ? "text-yellow-600 dark:text-yellow-400" 
    : tension < 0.8 
    ? "text-orange-600 dark:text-orange-400" 
    : "text-red-600 dark:text-red-400";

  const peligroConfig = {
    bajo: { label: "Bajo", color: "text-green-600 dark:text-green-400", icon: Shield },
    medio: { label: "Medio", color: "text-yellow-600 dark:text-yellow-400", icon: AlertTriangle },
    alto: { label: "Alto", color: "text-red-600 dark:text-red-400", icon: Zap },
  };
  const peligroInfo = peligro ? peligroConfig[peligro.nivel] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Estado del Juego
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Turno</span>
              <span className="font-medium">{turnNumber} / {targetTurns}</span>
            </div>
            <Progress value={(turnNumber / targetTurns) * 100} className="h-2" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Tensión</span>
            </div>
            <span className={`text-sm font-medium ${tensionColor}`}>
              {tensionLevel}
            </span>
          </div>
          
          {peligroInfo && (
            <div className="flex items-center justify-between" data-testid="danger-level">
              <div className="flex items-center gap-2">
                <peligroInfo.icon className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Peligro</span>
              </div>
              <span className={`text-sm font-medium ${peligroInfo.color}`}>
                {peligroInfo.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Backpack className="h-4 w-4 text-primary" />
            Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Tu mochila está vacía</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {inventory.items.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inventory.pistas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-accent" />
              Pistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {inventory.pistas.map((pista, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span>{pista}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
