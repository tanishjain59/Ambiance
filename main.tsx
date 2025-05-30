// ===== IMPORTS AND TYPE DEFINITIONS =====
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as Tone from 'tone';

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

interface MixerProps {
    audioUrls: string[];
    soundElements: SoundElement[];
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

    // ===== MIXER COMPONENT =====
    const Mixer: React.FC<MixerProps> = ({ audioUrls, soundElements }) => {
        const [isPlaying, setIsPlaying] = useState(false);
        const [volumes, setVolumes] = useState<number[]>(soundElements.map(el => el.parameters.volume));
        const [pans, setPans] = useState<number[]>(soundElements.map(el => el.parameters.pan));
        // Store both player and panner refs
        const players = useRef<{ player: Tone.Player, panner: Tone.Panner }[]>([]);
        const mixer = useRef<Tone.Channel>();

        // Only render up to the minimum of audioUrls and soundElements
        const barCount = Math.min(audioUrls.length, soundElements.length);

        // Initialize Tone.js and create players
        useEffect(() => {
            mixer.current = new Tone.Channel().toDestination();
            const reverb = new Tone.Reverb(3).connect(mixer.current);
            players.current = audioUrls.slice(0, barCount).map((url, i) => {
                const player = new Tone.Player({
                    url,
                    loop: true,
                    volume: Tone.gainToDb(volumes[i])
                });
                const panner = new Tone.Panner(pans[i]);
                // Connect: Player -> Panner -> Reverb -> Mixer
                player.connect(panner);
                panner.connect(reverb);
                return { player, panner };
            });
            return () => {
                players.current.forEach(({ player, panner }) => {
                    player.dispose();
                    panner.dispose();
                });
                mixer.current?.dispose();
            };
        }, [audioUrls, barCount]);

        // Handle play/stop
        const togglePlay = async () => {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
            if (isPlaying) {
                players.current.forEach(({ player }) => player.stop());
            } else {
                players.current.forEach(({ player }) => player.start());
            }
            setIsPlaying(!isPlaying);
        };

        // Handle volume changes
        const handleVolumeChange = (index: number, value: number) => {
            const newVolumes = [...volumes];
            newVolumes[index] = value;
            setVolumes(newVolumes);
            players.current[index].player.volume.value = Tone.gainToDb(value);
        };

        // Handle pan changes
        const handlePanChange = (index: number, value: number) => {
            const newPans = [...pans];
            newPans[index] = value;
            setPans(newPans);
            players.current[index].panner.pan.value = value;
        };

        return (
            <div style={{ 
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginTop: '20px',
                maxWidth: '800px',
                margin: '20px auto'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h3>Audio Mixer</h3>
                    <button 
                        onClick={togglePlay}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: isPlaying ? '#f44336' : '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>

                {/* Mixer Controls */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${barCount}, 1fr)`,
                    gap: '20px', 
                    marginBottom: '30px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {Array.from({ length: barCount }).map((_, index) => (
                        <div key={index} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center'
                        }}>
                            {/* Volume Bar */}
                            <div style={{ 
                                height: '200px', 
                                width: '40px', 
                                backgroundColor: '#eee',
                                borderRadius: '4px',
                                position: 'relative',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    width: '100%',
                                    height: `${volumes[index] * 100}%`,
                                    backgroundColor: isPlaying ? '#4caf50' : '#2196f3',
                                    borderRadius: '4px',
                                    transition: 'height 0.1s ease'
                                }} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes[index]}
                                    onChange={(e) => handleVolumeChange(index, parseFloat(e.target.value))}
                                    style={{
                                        position: 'absolute',
                                        width: '200%',
                                        height: '100%',
                                        transform: 'rotate(-90deg) translateX(-50%)',
                                        transformOrigin: 'left',
                                        marginLeft: '50%',
                                        opacity: 0,
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            {/* Volume Label */}
                            <div style={{ 
                                fontSize: '0.9em', 
                                color: '#666',
                                marginBottom: '5px'
                            }}>
                                {Math.round(volumes[index] * 100)}%
                            </div>
                            {/* Track Name */}
                            <div style={{ 
                                fontSize: '0.8em', 
                                fontWeight: 'bold',
                                textAlign: 'center',
                                color: '#333',
                                marginBottom: '5px'
                            }}>
                                {soundElements[index].name.split(' ')[0]}
                            </div>
                            {/* Pan Control */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span style={{ fontSize: '0.8em', color: '#666' }}>L</span>
                                <input
                                    type="range"
                                    min="-1"
                                    max="1"
                                    step="0.01"
                                    value={pans[index]}
                                    onChange={(e) => handlePanChange(index, parseFloat(e.target.value))}
                                    style={{ width: '60px' }}
                                />
                                <span style={{ fontSize: '0.8em', color: '#666' }}>R</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Track Descriptions */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${Math.min(2, barCount)}, 1fr)`,
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {Array.from({ length: barCount }).map((_, index) => (
                        <div key={index} style={{
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px'
                        }}>
                            <h4 style={{ margin: '0 0 5px 0' }}>{soundElements[index].name}</h4>
                            <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                                {soundElements[index].description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
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
            {audioUrls.length > 0 && response && (
                <Mixer audioUrls={audioUrls} soundElements={response.sound_elements} />
            )}
            <div ref={responseEndRef} />
        </div>
    );
};

// ===== REACT ROOT RENDERING =====
const root = createRoot(document.getElementById('root')!);
root.render(<SceneGenerator />);
