import { useState, useEffect, useRef } from 'react';
import { Send, Users as UsersIcon } from 'lucide-react';

export default function Community({ socket, username }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('chatHistory', (history) => {
      setMessages(history);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('users', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('chatHistory');
      socket.off('message');
      socket.off('users');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    socket.emit('sendMessage', inputMsg);
    setInputMsg('');
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '85vh' }}>
      {/* Chat Area */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="mb-4" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
          <h2>Community Hub</h2>
          <p>Collaborate, share knowledge, and chat with other learners.</p>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: msg.user === username ? 'row-reverse' : 'row',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: msg.user === username ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span>{msg.user}</span>
                  <span>{msg.time}</span>
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex-between" style={{ gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Type a message..." 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
          />
          <button type="submit" className="btn" disabled={!inputMsg.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Online Users Sidebar */}
      <div className="card" style={{ width: '250px', overflowY: 'auto' }}>
        <h3 className="flex-between mb-4" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
          <span><UsersIcon size={20} /> Online</span>
          <span className="badge">{onlineUsers.length}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {onlineUsers.map((user, idx) => (
            <div key={idx} className="flex-between" style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600 }}>{user.username} {user.username === username ? '(You)' : ''}</span>
              <span className="badge" style={{ fontSize: '0.7rem' }}>Lvl {user.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
