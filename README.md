# Japanese Friend App

Japanese Friend App is a modular prototype for an immersive Japanese-learning experience centered on **AI companionship**, **anime-style live shadowing**, and **ambient listening**.

## Current MVP Scope
- Single static entry point: `index.html`
- Four connected prototype pages:
  - Home
  - Friends
  - Call
  - Summary
- Modular CSS, JS, characters, data, and docs
- Ready for a lightweight Claude API integration phase

## Product Pillars
1. **Talk Your Friends**  
   AI video-call style conversations with anime-style characters such as Yuki.
2. **Live Shadowing**  
   Story-driven dubbing inside iconic anime / film scenes.
3. **Immersive Listening**  
   Passive listening spaces like Morning in Japan, Night in Japan, and Ambient Listening.

## How to Run
1. Install Node.js if needed.
2. From the project root:
   ```bash
   npm install
   npm run dev
   ```
3. Open the served `index.html`.

## Environment Variables
Create `.env` from `.env.example` and fill in your API keys:
- `ANTHROPIC_API_KEY`
- `API_BASE_URL`

## Folder Philosophy
This repository is intentionally split into:
- `frontend/src/pages` for page-level ownership
- `frontend/src/characters` for scalable character expansion
- `frontend/src/features` for product logic
- `data/` for editable JSON content
- `docs/` for business-level product documentation

## Why this structure is maintainable
Yes — this structure will make future updates easier **if you keep the boundaries clean**:
- UI changes stay in `styles/` and `pages/`
- AI behavior stays in `characters/`, `features/`, and `services/`
- content edits stay in `data/`
- product decisions stay in `docs/`

## Next Product Steps
- polish call UI
- add prompt builder + Claude integration
- add voice input / TTS
- expand memory, subtitle, and relationship systems
