import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Search, Settings,
  ChevronRight, Brain, Globe, Sparkles, Send,
  Layers, Bookmark
} from 'lucide-react';
import { io } from 'socket.io-client';

const isDev = window.location.hostname === 'localhost';
const API_BASE = isDev ? 'http://localhost:3001' : '';
const SOCKET_URL = isDev ? 'http://localhost:3001' : window.location.origin;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([
    { role: 'model', text: 'Welcome to Learning Nexus. I am your AI Learning Agent. What topic would you like to master today?' }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [mastery, setMastery] = useState(0);
  const [stats, setStats] = useState({ points: 0, level: 1 });
  const [socket, setSocket] = useState(null);
  const [voices, setVoices] = useState([]);
  const [researchData, setResearchData] = useState(null);
  const [activeTopic, setActiveTopic] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(null);

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const chatEndRef = useRef(null);

  // Socket + Speech Recognition setup (runs when isLoggedIn changes)
  useEffect(() => {
    if (!isLoggedIn) return;

    const s = io(SOCKET_URL);
    setSocket(s);
    s.emit('join', 'Nexus_User');
    s.on('myStats', (data) => setStats({ points: data.points, level: data.level }));

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        setTranscript(last[0].transcript);
      };
      rec.onerror = (e) => {
        console.error("Speech recognition error", e.error);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    return () => {
      s.close();
      window.speechSynthesis.cancel();
    };
  }, [isLoggedIn]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const speakText = useCallback((text) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utt;
    const pref = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Samantha')
    ) || voices[0];
    if (pref) utt.voice = pref;
    utt.rate = 1.0;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after speaking to make it interactive
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch(e) { console.error("Could not auto-start listening", e); }
      }
    };
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [voices]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    }
  }, [isListening]);

  const generateLearningNexus = useCallback(async (topic) => {
    setActiveTopic(topic);
    try {
      // 1. Fetch conceptual track from backend
      const res = await fetch(API_BASE + '/api/generate-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await res.json();
      if (data.track && Array.isArray(data.track)) {
        setConcepts(data.track);
      } else if (data.track) {
        setConcepts([{ title: topic, description: String(data.track) }]);
      }

      // 2. Fetch real intelligence from Wikipedia API
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const visual = wikiData.thumbnail?.source || 'https://image.pollinations.ai/prompt/' + encodeURIComponent(topic + ' scientific concept map knowledge graph 3D dark background') + '?width=1024&height=768&nologo=true';
          const summary = wikiData.extract || 'Core conceptual breakdown for "' + topic + '" initialized. Multi-vector analysis active.';
          setResearchData({
            visual,
            summary,
            wikiUrl: wikiData.content_urls?.desktop?.page || null
          });
          return; // Success
        }
      } catch (wikiErr) {
        console.warn("Wikipedia fetch failed, falling back.");
      }

      // Fallback if Wikipedia fails
      setResearchData({
        visual: 'https://image.pollinations.ai/prompt/' + encodeURIComponent(topic + ' scientific concept map knowledge graph 3D dark background') + '?width=1024&height=768&nologo=true',
        summary: 'Core conceptual breakdown for "' + topic + '" initialized. Multi-vector analysis active.'
      });
    } catch (e) { console.error(e); }
  }, []);

  const handleSend = useCallback(async (text) => {
    const input = text || transcript;
    if (!input) return;

    const userMsg = { role: 'user', text: input };
    setConversation(prev => [...prev, userMsg]);
    setTranscript('');

    // Generate knowledge map on first topic
    if (concepts.length === 0) {
      generateLearningNexus(input);
    }

    try {
      const res = await fetch(API_BASE + '/api/chat-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: conversation })
      });
      const data = await res.json();
      setConversation(prev => [...prev, { role: 'model', text: data.reply, suggestions: data.suggestions }]);
      
      // Extract YouTube ID if present
      if (data.suggestions && data.suggestions.length > 0) {
        const ytLink = data.suggestions.find(s => s.url && s.url.includes('youtube.com/watch?v='));
        if (ytLink) {
          const match = ytLink.url.match(/v=([^&]+)/);
          if (match && match[1]) {
            setActiveVideoId(match[1]);
          }
        }
      }

      speakText(data.reply);
      setMastery(prev => Math.min(prev + 5, 100));
      if (socket) socket.emit('updatePoints', 25);
    } catch (e) {
      console.error(e);
      setConversation(prev => [...prev, { role: 'model', text: 'Sorry, I encountered a network error. Please try again.', suggestions: [] }]);
    }
  }, [transcript, conversation, socket, speakText, generateLearningNexus]);
  // Auto-submit after voice input stops
  useEffect(() => {
    if (!isListening && transcript.length > 3) {
      const t = setTimeout(() => handleSend(), 1200);
      return () => clearTimeout(t);
    }
  }, [isListening, transcript, handleSend]);

  // ── LANDING PAGE ──
  if (!isLoggedIn) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: '#1e1f20',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="hero-overlay"></div>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v2.svg" alt="Gemini" style={{ width: '80px' }} />
          </div>
          <h1 style={{ fontSize: '4.5rem', fontWeight: '500', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
            Learning Nexus
          </h1>
          <p style={{ fontSize: '1.4rem', color: '#c4c7c5', maxWidth: '650px', margin: '0 auto 3rem' }}>
            Harness the world's most advanced AI learning agent.<br />
            Personalized mastery at the speed of thought.
          </p>
          <button
            className="btn-google"
            style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', margin: '0 auto' }}
            onClick={() => setIsLoggedIn(true)}
          >
            Start Your Journey <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  // ── WORKSPACE ──
  const masteryDeg = mastery * 3.6;
  const pointsPercent = stats.points % 100;

  return (
    <div className="nexus-container">
      {/* ── LEFT: Knowledge Map ── */}
      <div className="nexus-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8e918f', marginBottom: '1.5rem' }}>
          <Brain size={16} /> KNOWLEDGE MAP
        </h3>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="mastery-ring" style={{ '--progress': masteryDeg + 'deg' }}>
            <div className="mastery-content">
              <span>{mastery}%</span>
              <p style={{ fontSize: '0.6rem', color: '#8e918f' }}>MASTERY</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '0.7rem', color: '#8e918f', marginBottom: '1rem', textTransform: 'uppercase' }}>Conceptual Pillars</p>
          {concepts.length > 0 ? concepts.map((c, i) => (
            <div key={i} className="concept-node" onClick={() => handleSend('Tell me more about ' + c.title)}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#8e918f', marginTop: '0.25rem' }}>
                {c.description ? c.description.substring(0, 60) + '...' : ''}
              </div>
            </div>
          )) : (
            <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '3rem' }}>
              <Layers size={32} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Ask a topic to build your knowledge map.</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem' }}>Nexus Points</span>
            <span style={{ color: 'var(--google-blue)', fontWeight: 'bold' }}>{stats.points}</span>
          </div>
          <div style={{ height: '4px', background: '#3c4043', borderRadius: '2px' }}>
            <div style={{ width: pointsPercent + '%', height: '100%', background: 'var(--google-blue)', borderRadius: '2px', transition: 'width 0.5s' }}></div>
          </div>
        </div>
      </div>

      {/* ── CENTER: AI Chat Agent ── */}
      <div className="nexus-card" style={{ gap: '1rem' }}>
        <header className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: isSpeaking ? 'var(--google-green)' : '#5f6368',
              transition: 'background 0.3s'
            }}></div>
            <span style={{ fontWeight: 500 }}>AI Learning Agent</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-google" style={{ padding: '0.5rem', background: 'transparent', color: '#e3e3e3' }}><Search size={18} /></button>
            <button className="btn-google" style={{ padding: '0.5rem', background: 'transparent', color: '#e3e3e3' }}><Settings size={18} /></button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '0.5rem' }}>
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={'chat-bubble ' + (msg.role === 'user' ? 'bubble-user' : 'bubble-bot')}
            >
              {msg.role === 'model' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v2.svg" alt="" style={{ width: '16px' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>NEXUS AI</span>
                </div>
              )}
              <div style={{ marginBottom: msg.suggestions?.length ? '1rem' : '0' }}>{msg.text}</div>
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#8e918f', fontWeight: 'bold' }}>SUGGESTED RESOURCES:</span>
                  {msg.suggestions.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={12} /> {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="nexus-input-area">
          <button
            className={'btn-google ' + (isListening ? 'mic-active' : '')}
            style={{ padding: '0.6rem', background: isListening ? undefined : '#3c4043', color: '#e3e3e3' }}
            onClick={toggleListening}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            className="nexus-input"
            placeholder="Ask anything, start a learning session..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          />
          <button className="btn-google" onClick={() => handleSend()}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* ── RIGHT: Context Intel ── */}
      <div className="nexus-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8e918f', marginBottom: '1.5rem' }}>
          <Sparkles size={16} /> CONTEXT INTEL
        </h3>

        {researchData ? (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <div className="media-container" style={{ height: '180px', borderRadius: '16px', marginBottom: '1rem' }}>
              <img src={researchData.visual} alt="Research visualization" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ background: 'rgba(66,133,244,0.05)', border: '1px solid rgba(66,133,244,0.15)', padding: '1rem', borderRadius: '16px', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-blue)', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                <Globe size={14} /> WIKIPEDIA INTELLIGENCE
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxHeight: '100px', overflowY: 'auto' }}>
                {researchData.summary}
              </p>
              {researchData.wikiUrl && (
                <a href={researchData.wikiUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
                  Read full article on Wikipedia →
                </a>
              )}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#8e918f', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Discovery Prompts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="concept-node" style={{ borderLeftColor: 'var(--google-green)' }} onClick={() => handleSend('Give me a detailed breakdown')}>Detailed Breakdown</div>
                <div className="concept-node" style={{ borderLeftColor: 'var(--google-yellow)' }} onClick={() => handleSend('Show me real-world case studies')}>Case Studies</div>
                <div className="concept-node" style={{ borderLeftColor: 'var(--google-red)' }} onClick={() => handleSend('Quiz me on this topic')}>Simulate Quiz</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1, textAlign: 'center' }}>
            <Globe size={64} />
            <p style={{ marginTop: '1rem' }}>Ask a topic to activate intelligence feed.</p>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
          <button className="btn-google" style={{ width: '100%', justifyContent: 'center', background: '#3c4043', borderRadius: '12px' }}>
            <Bookmark size={16} /> Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
