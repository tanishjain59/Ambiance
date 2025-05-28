// ===== IMPORTS AND TYPE DEFINITION =====
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ModelConfig {
    id: string;
    name: string;
    description: string;
}

// ===== COMPONENT SETUP AND STATE MANAGEMENT =====
const ChatComponent: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Available models (expandable for future)
    const availableModels: ModelConfig[] = [
        {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            description: 'Fast and efficient model for most tasks'
        }
    ];

    // ===== AUTO-SCROLL FUNCTIONALITY =====
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ===== MESSAGE SUBMISSION HANDLER =====
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // ===== API COMMUNICATION AND STREAM PROCESSING =====
        // INTERACTS WITH BACKEND: Sends POST request to app.py
        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: input,
                    model: selectedModel
                }),
            });

            const reader = response.body?.getReader();
            if (!reader) return;

            let assistantMessage = '';
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            // INTERACTS WITH BACKEND: Processes streaming response from app.py
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            assistantMessage += data.chunk + ' ';
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1].content = assistantMessage;
                                return newMessages;
                            });
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ===== UI RENDERING =====
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h1>LLM Chat</h1>
            
            {/* Model Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="model-select" style={{ marginRight: '10px' }}>Select Model:</label>
                <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                >
                    {availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>
                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                    {availableModels.find(m => m.id === selectedModel)?.description}
                </p>
            </div>

            <div style={{ 
                height: '400px', 
                overflowY: 'auto', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                padding: '10px',
                marginBottom: '20px'
            }}>
                {messages.map((message, index) => (
                    <div key={index} style={{
                        marginBottom: '10px',
                        padding: '10px',
                        backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                        borderRadius: '4px'
                    }}>
                        <strong>{message.role === 'user' ? 'You: ' : 'Assistant: '}</strong>
                        {message.content}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

// ===== REACT ROOT RENDERING =====
const root = createRoot(document.getElementById('root')!);
root.render(<ChatComponent />);
