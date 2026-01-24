# Aventura en Español - AI Dungeon Master Game

## Overview
A Spanish-only text-based adventure game where an AI acts as a dungeon master (DM). The game helps players practice Spanish through interactive story narration, branching choices, and optional free-text input. Features REAL DANGER where player decisions have meaningful consequences.

## Key Features
- **Spanish-Only Gameplay**: All narration, dialogue, UI labels, and choices are in Spanish
- **Adaptive Difficulty**: Vocabulary/grammar adapts to user-selected level (A2/B1/B2)
- **Dynamic Options**: AI generates 2-4 response options per turn (full text displayed, no truncation)
- **Free Text Input**: Players can type custom responses when allowed
- **Grammar Feedback**: When typing free-text responses, players receive grammar/spelling feedback in a modal popup (ignoring punctuation and accents). TTS is delayed until modal closes.
- **Pregunta Mode**: Ask questions about Spanish without derailing the story. Q&A appears in a modal popup, then auto-switches back to Acción mode.
- **History Export**: Download full adventure history as text file when story ends
- **Story Coherence**: AI strictly follows player's chosen actions without reinterpreting them
- **Inventory System**: Track items and clues throughout the adventure
- **Progress Tracking**: Story paces toward chosen duration (corta/media/larga)
- **History Browsing**: View past turns with pagination (10 per page)
- **Dark Mode**: Toggle between light and dark themes
- **Usage Limiting**: Monthly turn cap (1600 turns) to control AI costs (~$40/month max)

### Real Consequences System
- **Health Tracking**: Player health (0-100) that can be damaged by reckless actions
- **Status Effects**: States like "herido", "asustado", "agotado" affect gameplay
- **Danger Indicators**: Each turn shows danger level (bajo/medio/alto) with explanation
- **Real Death**: Stupid actions (attacking armed enemies unarmed) lead to game over
- **Fair Warnings**: Danger is always telegraphed before it happens
- **Story Flags**: Missed clues and important events are tracked, affecting endings
- **Learning Summary**: At game end, shows what Spanish was learned during play

## Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, Shadcn/UI components
- **Backend**: Node.js + Express
- **AI**: OpenAI API via Replit AI Integrations (gpt-4o model)
- **Database**: PostgreSQL (Neon-backed via Replit) with Drizzle ORM
- **Session Persistence**: Game sessions stored in PostgreSQL, session ID cached in localStorage

## Project Structure
```
client/
├── src/
│   ├── pages/
│   │   └── game.tsx          # Main game page with all phases
│   ├── components/
│   │   └── game/
│   │       ├── GameSetup.tsx     # Level/duration selection
│   │       ├── GameChat.tsx      # Main chat interface with health/danger
│   │       ├── InventoryPanel.tsx # Items and game state (Sheet drawer)
│   │       ├── HistoryPanel.tsx   # Turn history with pagination (Sheet drawer)
│   │       └── PlotSelection.tsx  # Plot selection with pagination and custom plot creation
│   └── App.tsx
server/
├── routes.ts                 # API endpoints
├── storage.ts                # PostgreSQL session storage with DatabaseStorage class
├── usageTracker.ts           # Monthly turn limit tracking (1600 turns = ~$40)
├── seedPlots.ts              # Script to seed 990 preset plots
├── db.ts                     # Database connection setup
└── index.ts
shared/
├── schema.ts                 # TypeScript types, Zod schemas, and Drizzle table definitions
└── piiValidation.ts          # PII detection utility (email, phone, SSN, contact patterns)
```

## API Endpoints

### POST /api/start
Initializes a new game session and fetches 3 preset plot hooks from the database.
- Body: `{ spanishLevel: "A2"|"B1"|"B2", duration: "corta"|"media"|"larga" }`
- Response: `{ sessionId: string, plots: PlotHook[] }`

### GET /api/plots
Fetches paginated preset plots from the database.
- Query: `?level=A2|B1|B2&duration=corta|media|larga&offset=0&limit=3`
- Response: `{ plots: PlotHook[], hasMore: boolean }`

### POST /api/validate-custom-plot
Validates a custom plot for PII and inappropriate content.
- Body: `{ title: string, description: string }`
- Response on success: `{ valid: true }`
- Response on failure: `{ valid: false, error: string, piiDetected?: boolean, moderationFailed?: boolean }`

### POST /api/select-plot
Selects a plot (preset or custom) and starts the game with initial narration.
- Body: `{ sessionId, plotId, spanishLevel, duration, customTitle?, customDescription? }`
- Response: `{ gameState: GameState }`

### POST /api/turn
Processes a player action or question and returns AI response.
- Body: `{ sessionId, mode, userInput?, selectedOptionId?, state, recentHistory }`
- Response: `{ aiResponse: AIResponse, gameEnded: boolean }`

### GET /api/usage
Returns current usage statistics for cost limiting.
- Response: `{ used: number, remaining: number, limit: number, monthYear: string }`

### GET /api/session/:sessionId
Validates and retrieves an existing game session for resuming play.
- Response on success: `{ session: { id, gameState, spanishLevel, duration, ended } }`
- Response on not found: 404 `{ error: "Session not found" }`
- Response if ended: 410 `{ error: "Session has ended" }`

## Game Flow
1. **Setup**: Player selects Spanish level (A2/B1/B2) and duration (corta/media/larga)
2. **Plot Selection**: 
   - 3 preset plots loaded from DB (990 total plots seeded)
   - "Show more" button to load additional plots via pagination
   - Option to create custom plot with PII validation and AI moderation
3. **Playing**: Turn-based loop with narration, options, danger tracking, and health
   - Chat-first layout with drawer-based panels for Inventory and History
4. **Completion**: Story ends on victory (final=true), death (game_over=true), or max turns

## User Preferences
- **Dark Mode**: Persisted in localStorage (key: "aventura_dark_mode")
- **Text-to-Speech**: Narration is read aloud in Spanish using Web Speech API (key: "aventura_tts_mute" for mute toggle)
- **Session Persistence**: Session ID cached in localStorage for resume capability

## AI Response Format (Extended)
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
  "resumen_memoria": "Story summary for context",
  "consecuencia": "What happened due to the action",
  "peligro": {
    "nivel": "bajo|medio|alto",
    "razon": "Why this danger level"
  },
  "cambio_estado": {
    "salud_delta": 0,
    "estado_afectos_agregar": [],
    "estado_afectos_quitar": [],
    "banderas_agregar": [],
    "banderas_quitar": []
  },
  "game_over": false,
  "game_over_razon": "Only if game_over=true",
  "final": false,
  "final_razon": "Only if final=true",
  "resumen_aprendizajes": {
    "puntos": [],
    "errores_frecuentes": [],
    "frases_utiles": []
  }
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
