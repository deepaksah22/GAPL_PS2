import { useNavigate } from 'react-router-dom';
import { Sparkles, Mic, Zap, Globe, Shield } from 'lucide-react';

export default function Landing({ onStart }) {
  const navigate = useNavigate();

  return (
    <div style={{ margin: '-2rem -3rem' }}>
      <section className="hero-section" style={{ backgroundImage: 'url("/hero_learning_platform.png")' }}>
        <div className="hero-overlay"></div>
        <div className="hero-content animate-fade-in">
          <div className="badge mb-4 animate-float">
            <Sparkles size={14} /> Next-Gen AI Learning
          </div>
          <h1 style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Learn with the <br/>
            <span style={{ color: 'var(--accent-primary)' }}>Voice of Future</span>
          </h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2.5rem', color: '#cbd5e1' }}>
            The world's first agentic, voice-first learning platform. 
            Real-time AI tracks, instant visualization, and collaborative mastery.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn" style={{ padding: '1rem 2.5rem', fontSize: '1.2rem' }} onClick={onStart}>
              Start Learning Now
              <Zap size={20} />
            </button>
            <button className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      <section style={{ padding: '5rem 3rem', background: 'var(--bg-color)' }}>
        <div className="grid-3">
          <div className="card text-center">
            <div className="agent-assistant" style={{ position: 'relative', margin: '0 auto 1.5rem', bottom: 0, right: 0 }}>
              <Mic size={24} />
            </div>
            <h3>Vocal First</h3>
            <p>Hands-free learning. Talk to your AI agent like a real mentor.</p>
          </div>
          <div className="card text-center">
             <div className="agent-assistant" style={{ position: 'relative', margin: '0 auto 1.5rem', bottom: 0, right: 0, background: 'var(--accent-secondary)' }}>
              <Globe size={24} />
            </div>
            <h3>Real-time Visualization</h3>
            <p>AI generates images and videos on the fly to help you visualize complex concepts.</p>
          </div>
          <div className="card text-center">
             <div className="agent-assistant" style={{ position: 'relative', margin: '0 auto 1.5rem', bottom: 0, right: 0, background: 'var(--success)' }}>
              <Shield size={24} />
            </div>
            <h3>Gamified Mastery</h3>
            <p>Earn XP, unlock badges, and climb the leaderboard with your peers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
