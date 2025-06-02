import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SoundElement {
    name: string;
    description: string;
}

interface SceneResponse {
    narrative: string;
    sound_elements: SoundElement[];
}

const GeneratePage: React.FC = () => {
    const navigate = useNavigate();
    const [sceneInput, setSceneInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [sceneResponse, setSceneResponse] = useState<SceneResponse | null>(null);
    const [audioUrls, setAudioUrls] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isGeneratingScene, setIsGeneratingScene] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    // Step 1: Generate scene
    const handleSceneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsGeneratingScene(true);
        setSceneResponse(null);
        setAudioUrls([]);

        try {
            const formData = new FormData();
            formData.append('text', sceneInput);
            if (imagePreview) {
                formData.append('image', dataURLtoFile(imagePreview, 'image.jpg'));
            }

            const response = await fetch('/generate-scene', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate scene');
            }

            const data: SceneResponse = await response.json();
            setSceneResponse(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    // Step 2: Generate audio
    const handleAudioGeneration = async () => {
        if (!sceneResponse) return;
        setError(null);
        setIsGeneratingAudio(true);
        setAudioUrls([]);
        try {
            const audioResponse = await fetch('/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sound_elements: sceneResponse.sound_elements
                })
            });

            if (!audioResponse.ok) {
                throw new Error('Failed to generate audio');
            }

            const audioData = await audioResponse.json();
            setAudioUrls(audioData.audio_urls);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageClear = () => {
        setImagePreview(null);
    };

    const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: '2rem',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            color: 'white'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    Generate Scene
                </h1>

                {/* Step 1: Scene generation form */}
                {!sceneResponse && (
                    <form onSubmit={handleSceneSubmit} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                Scene Description
                            </label>
                            <textarea
                                value={sceneInput}
                                onChange={(e) => setSceneInput(e.target.value)}
                                placeholder="Describe your scene..."
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '1rem',
                                    borderRadius: '5px',
                                    border: '1px solid #444',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                Upload Image (Optional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                                id="image-upload"
                            />
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>
                                <label
                                    htmlFor="image-upload"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Choose Image
                                </label>
                                {imagePreview && (
                                    <>
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{
                                                maxWidth: '200px',
                                                maxHeight: '200px',
                                                borderRadius: '5px'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleImageClear}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                borderRadius: '5px',
                                color: '#f44336'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1rem'
                        }}>
                            <button
                                type="submit"
                                disabled={isGeneratingScene}
                                style={{
                                    padding: '1rem 2rem',
                                    fontSize: '1.2rem',
                                    backgroundColor: isGeneratingScene ? '#666' : '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: isGeneratingScene ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isGeneratingScene ? 'Generating...' : 'Generate Scene'}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                style={{
                                    padding: '1rem 2rem',
                                    fontSize: '1.2rem',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Back to Home
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Show scene narrative and sound elements, then allow audio generation */}
                {sceneResponse && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Scene Narrative</h2>
                        <p style={{
                            background: 'rgba(255,255,255,0.07)',
                            padding: '1rem',
                            borderRadius: '5px',
                            fontStyle: 'italic',
                            color: '#eee',
                            marginBottom: '2rem'
                        }}>{sceneResponse.narrative}</p>

                        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sound Elements</h3>
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                            {sceneResponse.sound_elements.map((element, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '1rem',
                                    borderRadius: '5px'
                                }}>
                                    <strong>{element.name}</strong>
                                    <div style={{ color: '#bbb', marginTop: '0.5rem' }}>{element.description}</div>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                borderRadius: '5px',
                                color: '#f44336',
                                marginBottom: '1rem'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Step 3: Generate audio button or Let's Mix button */}
                        {!audioUrls.length && (
                            <div style={{ textAlign: 'center' }}>
                                <button
                                    onClick={handleAudioGeneration}
                                    disabled={isGeneratingAudio}
                                    style={{
                                        padding: '1rem 2rem',
                                        fontSize: '1.2rem',
                                        backgroundColor: isGeneratingAudio ? '#666' : '#9C27B0',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: isGeneratingAudio ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isGeneratingAudio ? 'Generating Audio...' : 'Generate Audio'}
                                </button>
                            </div>
                        )}

                        {audioUrls.length > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                <button
                                    onClick={() => navigate('/mix', {
                                        state: {
                                            audioUrls,
                                            soundElements: sceneResponse.sound_elements.map(el => el.name)
                                        }
                                    })}
                                    style={{
                                        padding: '1rem 2rem',
                                        fontSize: '1.2rem',
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Let's Mix!
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeneratePage; 