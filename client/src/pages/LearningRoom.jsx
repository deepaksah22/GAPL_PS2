import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, MessageSquare, Image as ImageIcon, Video, Zap, MessageCircle, Trophy, Sparkles } from 'lucide-react';

export default function LearningRoom({ socket }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([
    { role: 'model', text: 'Hello! I am your AI learning assistant. What would you like to learn about today?' }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [visualAid, setVisualAid] = useState(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    speakText(conversation[0].text);

    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const generateMedia = async (topic) => {
    setIsGeneratingMedia(true);
    // Use pollinations.ai for image generation
    const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(topic + " educational concept illustration, 3D render, high detail")}`;
    setVisualAid({ type: 'image', url: imageUrl, label: topic });
    setIsGeneratingMedia(false);
  };

  const handleSend = async () => {
    if (!transcript) return;
    
    const newUserMsg = { role: 'user', text: transcript };
    const updatedHistory = [...conversation, newUserMsg];
    setConversation(updatedHistory);
    const currentTopic = transcript;
    setTranscript('');
    setIsListening(false);

    try {
      // Proactively generate media for the topic
      generateMedia(currentTopic);

      const response = await fetch('http://localhost:3001/api/chat-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newUserMsg.text, history: conversation })
      });
      const data = await response.json();
      const newModelMsg = { role: 'model', text: data.reply };
      setConversation([...updatedHistory, newModelMsg]);
      speakText(data.reply);
      
      if (socket) {
        socket.emit('updatePoints', 15); // Bonus for interactive session
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isListening && transcript.length > 5) {
      const timer = setTimeout(() => {
         handleSend();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '85vh' }}>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="mb-4 flex-between">
          <div>
            <h1>Learning Room</h1>
            <p>Interactive session with your AI Tutor.</p>
          </div>
          <div className="badge animate-float" style={{ background: 'var(--accent-glow)', color: '#fff' }}>
            <Zap size={14} /> Agent Active
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '1rem' }}>
          {conversation.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex', 
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              marginBottom: '1rem'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '1rem',
                borderRadius: '16px',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--surface-border)',
                borderBottomRightRadius: msg.role === 'user' ? '0' : '16px',
                borderBottomLeftRadius: msg.role === 'model' ? '0' : '16px',
                boxShadow: msg.role === 'model' ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {msg.role === 'model' ? <><MessageCircle size={14} /> Tutor</> : 'You'}
                </div>
                {msg.text}
              </div>
            </div>
          ))}
          {isSpeaking && (
             <div className="animate-fade-in" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--success)', fontSize: '0.9rem' }}>
               <div className="level-ring" style={{ width: '10px', height: '10px', background: 'var(--success)', animation: 'pulseGlow 1s infinite' }}></div>
               Tutor is explaining...
             </div>
          )}
        </div>

        <div className="flex-between" style={{ gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--surface-border)' }}>
          <button 
            className={`btn ${isListening ? 'mic-btn listening' : 'btn-secondary'}`} 
            style={{ borderRadius: '50%', padding: '1rem', width: '60px', height: '60px', minWidth: '60px' }}
            onClick={toggleListening}
          >
            {isListening ? <MicOff size={24} color="#fff" /> : <Mic size={24} />}
          </button>
          
          <input 
            type="text" 
            className="input-field" 
            value={transcript} 
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Talk to me or type here..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ border: 'none', background: 'transparent' }}
          />
          
          <button className="btn" onClick={handleSend} disabled={!transcript && !isListening}>
            Send
          </button>
        </div>
      </div>

      {/* Visual Aid Sidebar */}
      <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 className="flex-between mb-4">
          <span><ImageIcon size={20} /> Visual Aid</span>
          {isGeneratingMedia && <div className="badge animate-spin-slow" style={{ padding: '0.25rem' }}><Zap size={12} /></div>}
        </h3>
        
        {visualAid ? (
          <div className="animate-fade-in">
            <div className="media-container">
              <img src={visualAid.url} alt={visualAid.label} onLoad={() => setIsGeneratingMedia(false)} />
              <div className="media-label">{visualAid.label}</div>
            </div>
            <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
              Visualization for: <strong>{visualAid.label}</strong>
            </p>
            <div className="flex-between mt-4">
              <button className="btn btn-secondary w-full" style={{ fontSize: '0.8rem' }}>
                <Video size={14} /> Request Video Explanation
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
            <ImageIcon size={48} className="mb-4" />
            <p>Visual aids will appear here as you learn.</p>
          </div>
        )}

        <div className="card mt-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h4 className="mb-2">Session Rewards</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
             <div className="badge"><Trophy size={12} /> Fast Learner</div>
             <div className="badge"><Sparkles size={12} /> Visualizer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
