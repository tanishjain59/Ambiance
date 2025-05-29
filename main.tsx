// ===== IMPORTS AND TYPE DEFINITIONS =====
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface SoundElement {
    name: string;
    description: string;
    parameters: {
        volume: number;
        pan: number;
        effects: string[];
    };
}

interface SceneResponse {
    narrative: string;
    sound_elements: SoundElement[];
}

// ===== COMPONENT SETUP AND STATE MANAGEMENT =====
const SceneGenerator: React.FC = () => {
    const [scene, setScene] = useState('');
    const [response, setResponse] = useState<SceneResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrls, setAudioUrls] = useState<string[]>([]);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const responseEndRef = useRef<HTMLDivElement>(null);

    // ===== AUTO-SCROLL FUNCTIONALITY =====
    const scrollToBottom = () => {
        responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [response, audioUrls]);

    // ===== SCENE GENERATION HANDLER =====
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scene.trim()) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);
        setAudioUrls([]);

        try {
            const response = await fetch('http://localhost:8000/generate-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scene }),
            });

            const reader = response.body?.getReader();
            if (!reader) return;

            let accumulatedResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            accumulatedResponse += data.chunk;
                            // Try to parse the accumulated response as JSON
                            try {
                                const parsedResponse = JSON.parse(accumulatedResponse);
                                setResponse(parsedResponse);
                            } catch (e) {
                                // If parsing fails, continue accumulating
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                }
            }
        } catch (error) {
            setError('Failed to generate scene. Please try again.');
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ===== AUDIO GENERATION HANDLER =====
    const handleGenerateAudio = async () => {
        if (!response) return;
        setIsAudioLoading(true);
        setError(null);
        setAudioUrls([]);
        try {
            const res = await fetch('http://localhost:8000/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound_elements: response.sound_elements }),
            });
            const data = await res.json();
            setAudioUrls(data.audio_urls);
        } catch (err) {
            setError('Failed to generate audio. Please try again.');
        } finally {
            setIsAudioLoading(false);
        }
    };

    // ===== UI RENDERING =====
    return (
        <div>
            <h1>Ambient Sound Generator</h1>
            <p>Describe a scene or mood to generate ambient sounds</p>
            
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    placeholder="e.g., midnight in a neon-lit Tokyo back-alley"
                    style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Generating...' : 'Generate Scene'}
                </button>
            </form>

            {error && (
                <div style={{ color: 'red', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {response && (
                <div style={{ 
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h2>Generated Scene</h2>
                    <p style={{ marginBottom: '20px' }}>{response.narrative}</p>
                    
                    <h3>Sound Elements</h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {response.sound_elements.map((element, index) => (
                            <div key={index} style={{
                                padding: '15px',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <h4>{element.name}</h4>
                                <p>{element.description}</p>
                                <div style={{ marginTop: '10px' }}>
                                    <strong>Parameters:</strong>
                                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                        <li>Volume: {element.parameters.volume}</li>
                                        <li>Pan: {element.parameters.pan}</li>
                                        <li>Effects: {element.parameters.effects.join(', ')}</li>
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={handleGenerateAudio}
                        disabled={isAudioLoading}
                        style={{
                            marginTop: '20px',
                            padding: '12px 24px',
                            backgroundColor: '#43a047',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isAudioLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {isAudioLoading ? 'Generating Audio...' : 'Generate Audio'}
                    </button>
                </div>
            )}

            {/* Spinner for audio generation */}
            {isAudioLoading && (
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <div className="spinner" style={{
                        display: 'inline-block',
                        width: '40px',
                        height: '40px',
                        border: '4px solid #ccc',
                        borderTop: '4px solid #43a047',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <style>
                        {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        `}
                    </style>
                    <div>Generating audio...</div>
                </div>
            )}

            {/* Audio Players */}
            {audioUrls.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Generated Audio</h3>
                    {audioUrls.map((url, idx) => (
                        <div key={idx} style={{ marginBottom: '10px' }}>
                            <audio controls src={url} style={{ width: '100%' }} />
                        </div>
                    ))}
                </div>
            )}
            <div ref={responseEndRef} />
        </div>
    );
};

// ===== REACT ROOT RENDERING =====
const root = createRoot(document.getElementById('root')!);
root.render(<SceneGenerator />);
