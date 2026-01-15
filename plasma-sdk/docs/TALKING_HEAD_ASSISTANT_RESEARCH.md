# Floating Talking Head Assistant - Deep Research

## Overview

This document covers the research into creating an LLM-powered, animated talking head assistant that:
- Floats around the UI like Black & White's creatures (but cuter)
- Is aware of mouse position and user actions
- Provides contextual help powered by LLMs
- Has dynamic personality states and idle animations
- Features real-time lip-sync when speaking

---

## 1. Reference Implementations

### Black & White Creature AI (Inspiration)
- **Belief-Desire-Intention (BDI) Architecture**: The creature had beliefs about the world, desires to fulfill, and intentions to act
- **Machine Learning**: Used decision trees and neural networks for behavior
- **Training System**: Learned from player interactions (positive/negative reinforcement)
- **Emotional States**: Displayed different moods and personalities based on experiences

### Microsoft Mico (Modern Clippy) - October 2025
- Microsoft revived Clippy as "Mico" for Copilot
- Features real-time expressions responding to user interactions
- Blob-shaped character with changing colors and moods
- Memory feature to remember past interactions
- Can transform into classic Clippy as Easter egg

### Rive Teddy Login Screen
- Interactive character that follows text input with eyes
- Covers eyes during password entry
- Shows emotions based on login success/failure
- Great example of context-aware character behavior

---

## 2. Technology Stack Options

### Option A: 3D Avatar with Three.js (Most Flexible)

**Components:**
```
Ready Player Me Avatar + Three.js + React Three Fiber + HeadTTS/wawa-lipsync
```

**Pros:**
- Full control over appearance and animations
- Can create truly unique character
- Performant with WebGL

**Key Libraries:**
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers
- `wawa-lipsync` - Real-time browser lip-sync
- `HeadTTS` - Neural TTS with visemes (runs in-browser via WebGPU/WASM)

**Resources:**
- [Wawa Sensei Lip Sync Tutorial](https://wawasensei.dev/tuto/react-three-fiber-tutorial-lip-sync)
- [met4citizen/TalkingHead](https://github.com/met4citizen/TalkingHead) - Full-body 3D avatar with lip-sync
- [met4citizen/HeadTTS](https://github.com/met4citizen/HeadTTS) - Free neural TTS with visemes

### Option B: HeyGen LiveAvatar (Easiest, Most Realistic)

**Components:**
```
HeyGen Streaming Avatar SDK + OpenAI/Gemini + Your UI
```

**Pros:**
- Photorealistic avatars
- Built-in lip-sync
- Low latency streaming
- Official React SDK

**Cons:**
- Monthly cost ($$$)
- Less customizable
- Requires internet connection

**Key Libraries:**
- `@heygen/streaming-avatar` - npm package (v2.1.0)
- Uses LiveKit for voice transport

**Resources:**
- [HeyGen LiveAvatar Web SDK](https://github.com/heygen-com/liveavatar-web-sdk)
- [HeyGen Streaming Avatar Docs](https://docs.heygen.com/docs/streaming-avatar-sdk-reference)

### Option C: Rive Animations (Best for 2D, Most Performant)

**Components:**
```
Rive Editor + @rive-app/react-canvas + State Machines + Custom Mouth Shapes
```

**Pros:**
- Extremely performant (vector-based)
- State machines for complex behaviors
- Data binding for dynamic control
- Works offline
- Small file sizes

**Cons:**
- 2D only (but can look 3D with good design)
- Manual animation work required
- Lip-sync needs custom implementation

**Key Libraries:**
- `@rive-app/react-canvas` - React component
- Rive Editor (free) for creating animations

**Resources:**
- [Rive State Machine Guide](https://rive.app/docs/editor/state-machine/state-machine)
- [Rive + React Tutorial](https://tympanus.net/codrops/2025/05/12/integrating-rive-into-a-react-project)
- [Rive Animation](https://rive.app/)

### Option D: Convai SDK (Full Featured)

**Components:**
```
Convai Web SDK + 3D Avatar + Built-in LLM Integration
```

**Pros:**
- Complete solution (avatar + AI + voice)
- Supports facial expressions, actions, emotions
- Ready Player Me compatible
- Character customization dashboard

**Cons:**
- Monthly cost
- Less control over LLM behavior

**Resources:**
- [Convai Web SDK](https://docs.convai.com/api-docs/plugins-and-integrations/web-plugins/convai-web-sdk)
- [convai-web-sdk npm](https://www.npmjs.com/package/convai-web-sdk)

### Option E: MascotBot (Simplest for Cute Characters)

**Components:**
```
MascotBot SDK + Pre-made Mascots + Any LLM
```

**Pros:**
- 120fps performance
- Pre-made cute mascots
- React SDK
- Real-time lip-sync built-in
- Affordable

**Resources:**
- [MascotBot](https://mascot.bot/)
- [MascotBot Docs](https://docs.mascot.bot/)

---

## 3. Mouse Tracking & Eye Gaze

### Implementation Approach

```javascript
// Basic mouse tracking for eyes
const useMouseTracker = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return mousePos;
};

// Calculate eye direction from mouse position
const calculateEyeDirection = (mousePos, eyeCenter) => {
  const dx = mousePos.x - eyeCenter.x;
  const dy = mousePos.y - eyeCenter.y;
  const angle = Math.atan2(dy, dx);
  const distance = Math.min(Math.hypot(dx, dy) / 100, 1); // Normalized 0-1
  
  return {
    x: Math.cos(angle) * distance * MAX_EYE_OFFSET,
    y: Math.sin(angle) * distance * MAX_EYE_OFFSET,
  };
};
```

### For Rive:
- Use Number inputs bound to mouse position
- Create constraints in Rive Editor for eye movement limits
- Data binding updates in real-time

### For Three.js:
- Use `lookAt()` for head/eye bones
- Smooth interpolation with lerp for natural movement
- Add subtle random movements for life

---

## 4. Context-Aware LLM Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Mouse Tracker│  │ UI State     │  │ User Actions     │   │
│  │ Component    │  │ Observer     │  │ Logger           │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │             │
│         └────────────┬────┴────────────────────┘             │
│                      ▼                                       │
│         ┌────────────────────────┐                           │
│         │   Context Aggregator   │                           │
│         │   (Current page, form  │                           │
│         │    state, user intent) │                           │
│         └───────────┬────────────┘                           │
│                     ▼                                        │
│         ┌────────────────────────┐                           │
│         │   LLM Function Calling │                           │
│         │   (Gemini/GPT-4/Claude)│                           │
│         └───────────┬────────────┘                           │
│                     ▼                                        │
│         ┌────────────────────────┐                           │
│         │   Avatar Controller    │                           │
│         │   - Speech             │                           │
│         │   - Emotion            │                           │
│         │   - Animation State    │                           │
│         └────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Context Collection System

```typescript
interface AssistantContext {
  // Current page/route
  currentPage: string;
  
  // Form states
  formFields: Record<string, {
    name: string;
    value: string;
    isValid: boolean;
    isFocused: boolean;
  }>;
  
  // User intent signals
  mouseIdleTime: number;
  scrollPosition: number;
  hoverTarget: string | null;
  lastAction: string;
  
  // App-specific context
  walletConnected: boolean;
  balance: string;
  pendingTransactions: number;
}

// Context-aware prompt generation
const generateContextPrompt = (context: AssistantContext) => {
  return `
You are a helpful assistant for a payment app.

Current context:
- User is on: ${context.currentPage}
- Wallet: ${context.walletConnected ? 'Connected' : 'Not connected'}
- Balance: ${context.balance}
${context.formFields ? `- Currently filling: ${Object.keys(context.formFields).join(', ')}` : ''}
${context.mouseIdleTime > 5000 ? '- User seems idle, might need help' : ''}
${context.hoverTarget ? `- User is hovering over: ${context.hoverTarget}` : ''}

Based on this context, provide helpful, concise guidance.
`;
};
```

### Function Calling for Actions

```typescript
const assistantTools = [
  {
    name: "navigate",
    description: "Navigate user to a different page",
    parameters: { page: "string" }
  },
  {
    name: "fillField",
    description: "Help fill a form field",
    parameters: { fieldName: "string", value: "string" }
  },
  {
    name: "showTooltip",
    description: "Show helpful tooltip near an element",
    parameters: { elementId: "string", message: "string" }
  },
  {
    name: "changeEmotion",
    description: "Change avatar emotional state",
    parameters: { emotion: "happy|thinking|concerned|excited" }
  }
];
```

---

## 5. Animation States & Personality

### State Machine Design

```
                    ┌─────────────┐
                    │    IDLE     │
                    │  (default)  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ LISTENING │    │  THINKING │    │  SPEAKING │
   │ (user     │    │ (waiting  │    │ (lip-sync │
   │  typing)  │    │  for LLM) │    │  active)  │
   └───────────┘    └───────────┘    └───────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
                    ┌─────────────┐
                    │  REACTING   │
                    │  (emotions) │
                    └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │   HAPPY   │    │  EXCITED  │    │ CONCERNED │
   │ (success) │    │ (big win) │    │ (error)   │
   └───────────┘    └───────────┘    └───────────┘
```

### Idle Animations (Personality)

1. **Breathing** - Subtle scale animation (1.0 -> 1.02 -> 1.0)
2. **Blinking** - Random blinks every 3-7 seconds
3. **Looking around** - Occasional glances at UI elements
4. **Micro-movements** - Small position shifts
5. **Curiosity** - Perks up when user hovers important elements

### Personality Traits (Configurable)

```typescript
interface AvatarPersonality {
  // How often to speak unprompted
  proactivity: 'shy' | 'moderate' | 'chatty';
  
  // Emotional expression intensity
  expressiveness: 'subtle' | 'moderate' | 'exuberant';
  
  // Speech style
  tone: 'professional' | 'friendly' | 'playful';
  
  // Movement style
  energy: 'calm' | 'bouncy' | 'energetic';
}
```

---

## 6. Lip Sync Implementation

### Viseme Mapping (Standard 15 Visemes)

| Viseme | Phonemes | Mouth Shape |
|--------|----------|-------------|
| sil | (silence) | Closed |
| PP | p, b, m | Closed, slight pucker |
| FF | f, v | Lower lip under teeth |
| TH | th | Tongue between teeth |
| DD | t, d, n | Tongue behind teeth |
| kk | k, g | Back of mouth |
| CH | ch, j, sh | Rounded, slight open |
| SS | s, z | Teeth together, spread |
| nn | n, l | Tongue up |
| RR | r | Rounded lips |
| aa | a | Wide open |
| E | e | Mid open, spread |
| ih | i | Narrow, spread |
| oh | o | Rounded, mid open |
| ou | u | Very rounded, narrow |

### Real-Time Lip Sync Options

**Option 1: wawa-lipsync (Browser-based)**
```javascript
import { useLipSync } from 'wawa-lipsync';

const { currentViseme, startListening, stopListening } = useLipSync({
  audioContext: audioCtx,
  onViseme: (viseme) => {
    // Update mouth shape
    avatar.setMorphTarget('viseme_' + viseme, 1);
  }
});
```

**Option 2: HeadTTS (Neural TTS + Visemes)**
- Generates speech AND viseme timestamps
- Runs entirely in browser (WebGPU/WASM)
- No external API calls needed

**Option 3: Rhubarb Lip Sync WASM**
- Pre-analyze audio to get viseme timing
- Best for pre-recorded audio
- WebAssembly port available

---

## 7. Recommended Architecture for Plenmo

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Plenmo Assistant                         │
├─────────────────────────────────────────────────────────────┤
│  Rendering: Rive (for 2D) OR Three.js/R3F (for 3D)         │
│  Lip Sync: wawa-lipsync (real-time browser-based)          │
│  TTS: HeadTTS (free, runs in browser) OR ElevenLabs        │
│  LLM: Gemini Flash (fast, cheap) with function calling     │
│  State: Zustand for avatar state management                │
│  Animation: Rive State Machine OR custom React states      │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/components/Assistant/
├── Assistant.tsx          # Main container
├── AvatarRenderer.tsx     # Rive/Three.js rendering
├── MouseTracker.tsx       # Mouse position context
├── ContextObserver.tsx    # Watches UI state
├── LLMController.tsx      # Gemini/GPT integration
├── SpeechController.tsx   # TTS + lip sync
├── EmotionController.tsx  # Emotion state machine
├── hooks/
│   ├── useMousePosition.ts
│   ├── useUIContext.ts
│   ├── useLipSync.ts
│   └── useAssistantAI.ts
├── animations/
│   ├── assistant.riv       # Rive file (if using Rive)
│   └── visemes/            # Mouth shape sprites
└── types.ts
```

---

## 8. Implementation Phases

### Phase 1: Static Avatar with Mouse Tracking
- Create cute 2D/3D character
- Implement eye-follow-mouse
- Add idle breathing/blinking animations
- Position floating in corner of screen

### Phase 2: State Machine & Emotions
- Implement state machine for animations
- Add emotional reactions (happy, thinking, concerned)
- Connect to user actions (form focus, errors, success)

### Phase 3: Speech & Lip Sync
- Integrate TTS (HeadTTS or ElevenLabs)
- Implement viseme-based lip sync
- Add speech bubble UI option

### Phase 4: LLM Integration
- Connect Gemini/GPT with function calling
- Implement context collection system
- Add proactive help triggers

### Phase 5: Polish & Personality
- Fine-tune animations
- Add personality settings
- Implement user preferences (mute, hide, etc.)
- A/B test helpfulness

---

## 9. Cost Analysis

| Solution | Monthly Cost | Pros | Cons |
|----------|--------------|------|------|
| Rive + HeadTTS + Gemini Flash | ~$20-50 | Full control, runs offline | More dev work |
| HeyGen LiveAvatar | ~$200+ | Photorealistic, easy | Expensive, requires internet |
| Convai | ~$100+ | Complete solution | Less LLM control |
| MascotBot | ~$50+ | Easy cute mascots | Less customization |
| Custom Three.js | ~$20-50 | Maximum flexibility | Most dev work |

---

## 10. Quick Start Recommendation

For Plenmo, I recommend **Rive + wawa-lipsync + HeadTTS + Gemini Flash**:

1. **Rive** for 2D character animation (performant, flexible state machines)
2. **wawa-lipsync** for real-time browser lip sync (free, no API)
3. **HeadTTS** for text-to-speech with visemes (free, runs in browser)
4. **Gemini Flash** for LLM intelligence (fast, cheap, function calling)

This gives you:
- Full offline capability
- Complete control over character design
- Low ongoing costs (~$20-50/mo for LLM only)
- High performance
- Unique, ownable character

---

## References

### Libraries & Tools
- [Rive](https://rive.app/) - Animation tool with state machines
- [wawa-lipsync](https://wawasensei.dev/tuto/real-time-lipsync-web) - Browser lip sync
- [HeadTTS](https://github.com/met4citizen/HeadTTS) - Neural TTS with visemes
- [TalkingHead](https://github.com/met4citizen/TalkingHead) - 3D avatar lip sync
- [HeyGen LiveAvatar](https://docs.heygen.com/) - Photorealistic avatars
- [Convai](https://convai.com/) - Complete avatar AI solution
- [MascotBot](https://mascot.bot/) - Cute mascot avatars

### Tutorials
- [Wawa Sensei Lip Sync](https://wawasensei.dev/tuto/react-three-fiber-tutorial-lip-sync)
- [Rive State Machine Guide](https://rive.app/blog/how-state-machines-work-in-rive)
- [Integrating Rive + React](https://tympanus.net/codrops/2025/05/12/integrating-rive-into-a-react-project)
- [Ready Player Me + Lip Sync](https://medium.com/@israr46ansari/integrating-a-ready-player-me-3d-model-with)

### Research Papers
- [WorldPrompter: Context-Driven LLM Assistance](https://dl.acm.org/doi/full/10.1145/3708359.3712164)
- [Black & White Creature AI Analysis](https://somegamez.com/wit/creature-ai-black-and-white)
