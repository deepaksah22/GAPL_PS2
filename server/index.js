const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ── Helper: call free LLM with retry + multiple providers ──
async function callFreeLLM(prompt) {
  const url = 'https://text.pollinations.ai/';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        jsonMode: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
        const text = await res.text();
        if (text && text.length > 10) return text.trim();
      }
    } catch (e) {
      console.log('Provider failed...', e.message);
    }
  return null;
}

// ── System Prompt ──
const SYSTEM_PROMPT = `You are "Nexus AI", a world-class AI learning agent.

RULES:
- You MUST respond in valid JSON format.
- "reply" field: Your conversational response (2-3 paragraphs). Be warm, use analogies, avoid markdown, keep it readable for Text-To-Speech.
- "suggestions" field: Array of objects with "title" and "url". Provide 1 specific YouTube link (MUST use the format https://www.youtube.com/watch?v=VIDEO_ID), 1 Research Paper link (e.g., Google Scholar or arXiv), and 1 Website link relevant to the user's query.

Example JSON output:
{
  "reply": "Photosynthesis is amazing...",
  "suggestions": [
    { "title": "Watch: Crash Course Photosynthesis", "url": "https://www.youtube.com/watch?v=sQK3Yr4Sc_k" },
    { "title": "Research: Nature Journal", "url": "https://scholar.google.com/scholar?q=photosynthesis" }
  ]
}`;

// ── In-memory state ──
const users = {};
const chatMessages = [];

// ── Socket.io ──
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    users[socket.id] = { username, points: 0, level: 1 };
    io.emit('users', Object.values(users));
    socket.emit('chatHistory', chatMessages);
  });

  socket.on('sendMessage', (message) => {
    const user = users[socket.id];
    if (user) {
      const msgData = {
        user: user.username,
        text: message,
        time: new Date().toLocaleTimeString(),
      };
      chatMessages.push(msgData);
      if (chatMessages.length > 50) chatMessages.shift();
      io.emit('message', msgData);
    }
  });

  socket.on('updatePoints', (points) => {
    if (users[socket.id]) {
      users[socket.id].points += points;
      users[socket.id].level = Math.floor(users[socket.id].points / 100) + 1;
      io.emit('users', Object.values(users));
      socket.emit('myStats', users[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('users', Object.values(users));
    console.log('User disconnected:', socket.id);
  });
});

// ── API: Generate Learning Track ──
app.post('/api/generate-track', async (req, res) => {
  const { topic } = req.body;
  const prompt = 'Create a learning track with 3 to 5 modules for the topic: "' + topic + '". Format the response strictly as a JSON array of objects, where each object has a "title" (string) and a "description" (string). Do not use markdown backticks, just return raw JSON.';

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      let track;
      try {
        track = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        track = [{ title: 'Learning ' + topic, description: responseText.substring(0, 200) }];
      }
      return res.json({ track });
    } catch (error) {
      console.error('Gemini track error:', error.message);
    }
  }

  // Free fallback
  try {
    const reply = await callFreeLLM(prompt);
    if (reply) {
      let track;
      try {
        track = JSON.parse(reply.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        track = [{ title: 'Learning ' + topic, description: reply.substring(0, 200) }];
      }
      return res.json({ track });
    }
  } catch (e) {
    console.error('Free LLM track error:', e.message);
  }

  // Hardcoded fallback
  return res.json({
    track: [
      { title: 'Foundations of ' + topic, description: 'Build a strong foundation by understanding the core principles and history.' },
      { title: 'Core Concepts', description: 'Dive into the key theories, frameworks, and models that define the field.' },
      { title: 'Practical Applications', description: 'Explore real-world use cases and hands-on exercises to solidify your understanding.' },
      { title: 'Advanced Topics', description: 'Push your knowledge further with cutting-edge research and emerging trends.' },
    ]
  });
});

// ── API: Chat Bot ──
app.post('/api/chat-bot', async (req, res) => {
  const { message, history } = req.body;

  const parseAIResponse = (text) => {
    // Remove markdown bolding for cleaner UI/TTS
    const cleanText = text.replace(/\*\*/g, '');
    try {
      const cleanJson = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { reply: parsed.reply || cleanText, suggestions: parsed.suggestions || [] };
    } catch (e) {
      return { reply: cleanText, suggestions: [] };
    }
  };

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const formattedHistory = history ? history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })) : [];

      const chat = model.startChat({
        history: formattedHistory,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 600 },
      });

      const result = await chat.sendMessage(message);
      return res.json(parseAIResponse(result.response.text()));
    } catch (error) {
      console.error('Gemini chat error:', error.message);
    }
  }

  // Free fallback
  try {
    let fullPrompt = SYSTEM_PROMPT + '\n\nConversation:\n';
    if (history) {
      history.forEach(m => {
        fullPrompt += (m.role === 'user' ? 'Student' : 'Nexus AI') + ': ' + m.text + '\n';
      });
    }
    fullPrompt += 'Student: ' + message + '\nNexus AI:';

    const reply = await callFreeLLM(fullPrompt);
    if (reply) return res.json(parseAIResponse(reply));
  } catch (e) {
    console.error('Free LLM chat error:', e.message);
  }

  return res.json({ reply: 'I encountered a temporary issue connecting to the AI service. Please try your question again in a moment.', suggestions: [] });
});

// SPA fallback for production
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
});
