# 🌌 Google Learning Nexus
**Your Interactive AI Learning Platform**

Google Learning Nexus is an AI-driven educational platform designed to help users master complex topics. It uses a modern 3-pane workspace to provide a real-time, context-aware, and highly interactive learning experience.

![Workspace Snapshot](./screenshots/workspace.png)
![YouTube & Wikipedia Integration](./screenshots/youtube_integration.png)

## ✨ Core Features

### 1. The 3-Pane Workspace
The UI is built with Google's modern Material Design 3 (M3) specifications, providing a clean dark-mode aesthetic.
- **Left Pane (Knowledge Map):** Automatically breaks down any topic into "Conceptual Pillars" allowing users to track their progress.
- **Center Pane (AI Chat):** A continuous, conversational AI agent with real-time text-to-speech and auto-listening capabilities for hands-free learning. 
- **Right Pane (Context Intel):** Dynamically fetches real-world information to support the AI's knowledge, displaying visuals and Wikipedia summaries.

### 2. Live Intelligence & Visualizations
The AI synthesizes external information in real-time. 
- **Wikipedia Summaries:** Dynamically pulls live factual context to ground the AI's responses.
- **Visuals:** Automatically generates relevant visual aids for the topic being discussed.

### 3. Voice-First Interaction
The platform is fully interactive:
- You can talk naturally to the AI using your microphone.
- The AI reads its responses aloud to you.
- **Auto-Loop:** The system automatically re-activates your microphone when the AI finishes speaking, creating a continuous conversation.

### 4. Robust AI Backend
- **Fast Responses:** Powered by Google's Gemini 1.5 Flash for quick and structured responses.
- **Reliable Fallbacks:** If the primary AI is busy, the backend automatically routes the request through a secondary free provider.
- **Clean Text:** Strips out unwanted formatting so the voice sounds natural.

---

## 🚀 Deployment

The repository is configured for easy deployment on **Google Cloud Run**.

### Local Development
1. Clone the repository.
2. Build the client:
   ```bash
   cd client
   npm install
   npm run build
   ```
3. Start the server:
   ```bash
   cd server
   npm install
   node index.js
   ```

### Deploying to Cloud Run
This project uses a unified `Dockerfile` that builds the React application and serves it through the Node.js Express server on port `8080`.

1. Push this repository to GitHub.
2. In the Google Cloud Console, navigate to **Cloud Run**.
3. Click **Deploy continuously from a repository**.
4. Select your repository and choose **Build Type: Dockerfile**.
5. Add `GEMINI_API_KEY` to your environment variables to enable the premium intelligence engine.
6. Deploy! 

---

## 🛠️ Technology Stack
- **Frontend:** React, Vite, Lucide React (Icons), Custom Material Design CSS.
- **Backend:** Node.js, Express, Socket.io.
- **AI Integration:** Google Generative AI (`@google/generative-ai`), custom fallback logic.
- **External APIs:** Wikipedia REST API, AI Visual Generator.
- **Deployment:** Docker, Google Cloud Run.

---

## 📸 Test Snapshots Gallery
These are automated snapshots captured during the development and testing phase:

### 1. Initial 3-Pane Initialization
The base 3-pane architecture loading before API synthesis.
![Base UI](./screenshots/workspace.png)

### 2. Live Wikipedia & Visual Synthesis
Testing the dynamic Wikipedia integration alongside the visual generator.
![Wikipedia UI](./screenshots/test_wikipedia.png)

### 3. Smart Suggestions Parsing
Testing the AI's structured parsing and rendering of clickable resource links.
![Suggestions UI](./screenshots/test_suggestions.png)
