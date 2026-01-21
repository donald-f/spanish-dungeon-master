# Aventura en Español - AI Dungeon Master Game

## Overview
A Spanish-only text-based adventure game where an AI acts as a dungeon master (DM). The game helps players practice Spanish through interactive story narration, branching choices, and optional free-text input.

## Key Features
- **Spanish-Only Gameplay**: All narration, dialogue, UI labels, and choices are in Spanish
- **Adaptive Difficulty**: Vocabulary/grammar adapts to user-selected level (A2/B1/B2)
- **Dynamic Options**: AI generates 2-4 response options per turn
- **Free Text Input**: Players can type custom responses when allowed
- **Pregunta Mode**: Ask questions about Spanish without derailing the story
- **Inventory System**: Track items and clues throughout the adventure
- **Progress Tracking**: Story paces toward chosen duration (corta/media/larga)
- **History Browsing**: View past turns with pagination (10 per page)
- **Dark Mode**: Toggle between light and dark themes

## Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, Shadcn/UI components
- **Backend**: Node.js + Express
- **AI**: OpenAI API via Replit AI Integrations (gpt-4o model)
- **Storage**: In-memory session storage

## Project Structure
```
client/
├── src/
│   ├── pages/
│   │   └── game.tsx          # Main game page with all phases
│   ├── components/
│   │   └── game/
│   │       ├── GameSetup.tsx     # Level/duration selection
│   │       ├── GameChat.tsx      # Main chat interface
│   │       ├── InventoryPanel.tsx # Items and game state
│   │       └── HistoryPanel.tsx   # Turn history with pagination
│   └── App.tsx
server/
├── routes.ts                 # API endpoints (/api/start, /api/turn, /api/select-plot)
├── storage.ts                # In-memory session storage
└── index.ts
shared/
└── schema.ts                 # TypeScript types and Zod schemas
```

## API Endpoints

### POST /api/start
Initializes a new game session and generates 3 plot hooks.
- Body: `{ spanishLevel: "A2"|"B1"|"B2", duration: "corta"|"media"|"larga" }`
- Response: `{ sessionId: string, plots: PlotHook[] }`

### POST /api/select-plot
Selects a plot and starts the game with initial narration.
- Body: `{ sessionId, plotId, spanishLevel, duration }`
- Response: `{ gameState: GameState }`

### POST /api/turn
Processes a player action or question and returns AI response.
- Body: `{ sessionId, mode, userInput?, selectedOptionId?, state, recentHistory }`
- Response: `{ aiResponse: AIResponse, gameEnded: boolean }`

## Game Flow
1. **Setup**: Player selects Spanish level (A2/B1/B2) and duration (corta/media/larga)
2. **Plot Selection**: AI generates 3 unique plot hooks, player chooses one
3. **Playing**: Turn-based loop with narration, options, and optional free-text
4. **Completion**: Story concludes when progress reaches 1.0 or target turns reached

## AI Response Format
```json
{
  "narracion": "Story text in Spanish...",
  "opciones": [
    {"id": "A", "texto": "Option text"},
    {"id": "B", "texto": "Option text"}
  ],
  "permitir_texto_libre": true,
  "permitir_preguntas": true,
  "pista_profesor": "Optional Spanish learning tip",
  "inventario": { "agregar": [], "quitar": [] },
  "estado": { "progreso": 0.0, "tension": 0.0 },
  "resumen_memoria": "Story summary for context"
}
```

## Development
- Run with `npm run dev` which starts Express server with Vite for frontend
- Server runs on port 5000
- OpenAI integration uses Replit AI Integrations (no API key needed)

## Design Theme
- Warm Spanish-inspired color palette with terracotta primary and gold accents
- Serif font (Lora) for story narration
- Sans-serif font (Inter) for UI elements
- Full dark mode support
