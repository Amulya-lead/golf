import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SupportChat() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi there! I'm your Golf Foundation Assistant. How can I help you today?", isBot: true }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = (e) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
        setInput('');

        // Simulate AI thinking and response
        setTimeout(() => {
            let reply = "I'm sorry, I didn't quite catch that. Could you try rephrasing?";
            const lowerMsg = userMsg.toLowerCase();

            if (lowerMsg.includes('donate') || lowerMsg.includes('charity')) {
                reply = "You can support our selected charities by making an Independent Donation directly from the 'Charities' directory, or by setting a Monthly Gift percentage from your profile!";
            } else if (lowerMsg.includes('streak') || lowerMsg.includes('active')) {
                reply = "Your Daily Streak increases every consecutive day you log in. Keep your streak alive to show your dedication to the community!";
            } else if (lowerMsg.includes('prize') || lowerMsg.includes('win') || lowerMsg.includes('draw')) {
                reply = "Whenever you submit a score, you earn Draw Entries. These entries give you a chance to win from the monthly Prize Pool based on your charity contribution ratio.";
            } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
                reply = `Hello ${user ? user.name.split(' ')[0] : 'golfer'}! Ready to make an impact today?`;
            } else if (lowerMsg.includes('score') || lowerMsg.includes('handicap')) {
                reply = "You can log your latest rounds from the Dashboard. We'll automatically calculate your Stableford points based on your current handicap!";
            }

            setMessages(prev => [...prev, { text: reply, isBot: true }]);
        }, 800);
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, fontFamily: 'inherit' }}>
            {/* Chat Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-shimmer"
                style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'var(--gold)', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', cursor: 'pointer', border: 'none',
                    boxShadow: '0 8px 32px rgba(201, 168, 76, 0.4)',
                    transition: 'transform 0.3s ease',
                    transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0deg) scale(1)',
                    position: 'absolute', bottom: 0, right: 0
                }}
            >
                💬
            </button>

            {/* Chat Window */}
            <div
                style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '350px', height: '500px',
                    background: 'rgba(20, 20, 20, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(201, 168, 76, 0.3)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transformOrigin: 'bottom right',
                    transform: isOpen ? 'scale(1)' : 'scale(0)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.2rem', background: 'linear-gradient(90deg, #1a1a1a, #2a2a2a)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4cd137', boxShadow: '0 0 10px #4cd137' }} />
                        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }} className="gold-text">AI Support</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: m.isBot ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                                maxWidth: '80%', padding: '0.8rem 1.2rem', borderRadius: '18px',
                                background: m.isBot ? 'rgba(255,255,255,0.05)' : 'var(--gold)',
                                color: m.isBot ? '#fff' : '#000',
                                fontWeight: m.isBot ? 400 : 600,
                                fontSize: '0.95rem', lineHeight: 1.4,
                                borderBottomLeftRadius: m.isBot ? '4px' : '18px',
                                borderBottomRightRadius: m.isBot ? '18px' : '4px',
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#111' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
                        />
                        <button type="submit" style={{ background: 'var(--gold)', border: 'none', borderRadius: '12px', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <span style={{ transform: 'rotate(-45deg)', marginTop: '-2px', fontSize: '1.2rem' }}>✈</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
