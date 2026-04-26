import { useState } from 'react';
import { Play, BookOpen, CheckCircle, Award } from 'lucide-react';

export default function Dashboard({ socket, username }) {
  const [topic, setTopic] = useState('');
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateTrack = async (e) => {
    e.preventDefault();
    if (!topic) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/generate-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await response.json();
      setTrack(data.track);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const completeModule = () => {
    if (socket) {
      socket.emit('updatePoints', 50);
    }
  };

  return (
    <div>
      <header className="mb-4">
        <h1>Welcome back, {username}!</h1>
        <p>Ready to continue your voice-based learning journey?</p>
      </header>

      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))' }}>
        <div className="flex-between">
          <div>
            <h2>Generate a Learning Track</h2>
            <p>Tell the AI what you want to learn, and get a structured module path.</p>
          </div>
          <Award size={48} color="var(--accent-primary)" />
        </div>
        <form onSubmit={generateTrack} className="flex-between mt-4" style={{ gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. Quantum Physics, History of Rome..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Path'}
            <Play size={18} />
          </button>
        </form>
      </div>

      {track && (
        <div>
          <h2 className="mb-4 flex-between" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <BookOpen size={24} /> 
            Your Personalized Track
          </h2>
          <div className="grid-3">
            {track.map((module, index) => (
              <div key={index} className="card">
                <div className="badge mb-4">Module {index + 1}</div>
                <h3>{module.title}</h3>
                <p style={{ marginBottom: '1.5rem' }}>{module.description}</p>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={completeModule}>
                  Mark Complete (+50 XP) <CheckCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
