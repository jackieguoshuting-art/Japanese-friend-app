# Product Requirement Document

## 1. Product Vision
Japanese Friend App helps users learn Japanese by **living inside an emotionally engaging Japanese world**, rather than by drilling vocabulary or grammar in isolation.

## 2. Core Value Proposition
The product combines:
- AI companionship
- real conversational practice
- story-driven pronunciation training
- passive immersive listening

## 3. Core Modules

### 3.1 Talk Your Friends
An AI video-call experience where users speak with anime-style Live2D characters.

#### Goals
- improve speaking confidence
- create a daily companionship loop
- make Japanese feel emotionally rewarding

#### Current prototype flow
1. User enters Home
2. User chooses Friends
3. User selects a character
4. User enters Call
5. User ends and sees Summary

#### Planned feature details
- daily random topic starter
- automatic difficulty adaptation
- persistent per-character memory
- subtitle modes:
  - none
  - soft
  - learning
- clickable subtitle vocabulary
- relationship growth loop

### 3.2 Live Shadowing
Users role-play inside iconic anime / film scenes in a visual-novel-style interface.

#### Core loop
1. user enters story world
2. hears original line
3. speaks line as the character
4. receives pronunciation / timing analysis
5. unlocks playback with original clip + user voice

### 3.3 Immersive Listening
Pure listening mode with no speaking requirement.

#### Listening spaces
- Morning in Japan
- Afternoon in Japan
- Night in Japan
- Daily Stories
- Ambient Listening

#### Ambient Listening
Designed for passive study with white noise and occasional Japanese phrases.

## 4. Character System

### Yuki
- best friend position
- cheerful, warm, lightly playful
- easiest emotional entry point for users

### Ren
- calm and cool
- more introspective tone
- suitable for richer or quieter conversations

### Hana
- energetic and bright
- anime / dessert / shopping vibe
- strong high-energy companionship

## 5. Data Strategy
- editable topics in `data/topics/`
- editable character records in `data/characters/`
- future JLPT vocabulary support in `data/vocabulary/`

## 6. MVP Technical Strategy
- static SPA entry in `index.html`
- modular JS architecture under `frontend/src`
- Claude integration through a thin prompt-builder layer
- localStorage for prototype memory persistence
- future backend for synced memory and progress

## 7. Success Criteria
- users can move through all 4 pages without breakage
- call page becomes the visual and emotional centerpiece
- architecture supports adding real AI, voice, and more characters without rewriting the whole app
