import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Tone from 'tone';

interface AudioElement {
  name: string;
  url: string;
  player: Tone.Player | null;
  panner: Tone.Panner | null;
  volume: number;
  pan: number;
}

const MixerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [audioElements, setAudioElements] = useState<AudioElement[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialize Tone.js
    Tone.start();

    // Get audio URLs from location state
    const audioUrls = location.state?.audioUrls || [];
    const soundElements = location.state?.soundElements || [];

    // Create audio elements
    const elements = soundElements.map((element: string, index: number) => ({
      name: element,
      url: audioUrls[index],
      player: null,
      panner: null,
      volume: 0,
      pan: 0
    }));

    setAudioElements(elements);

    // Cleanup
    return () => {
      audioElements.forEach(element => {
        if (element.player) {
          element.player.dispose();
        }
        if (element.panner) {
          element.panner.dispose();
        }
      });
    };
  }, []);

  const handleVolumeChange = (index: number, value: number) => {
    setAudioElements(prev => {
      const newElements = [...prev];
      newElements[index] = {
        ...newElements[index],
        volume: value
      };
      if (newElements[index].player) {
        newElements[index].player!.volume.value = Tone.gainToDb(value);
      }
      return newElements;
    });
  };

  const handlePanChange = (index: number, value: number) => {
    setAudioElements(prev => {
      const newElements = [...prev];
      newElements[index] = {
        ...newElements[index],
        pan: value
      };
      if (newElements[index].panner) {
        newElements[index].panner!.pan.value = value;
      }
      return newElements;
    });
  };

  const togglePlayback = async () => {
    if (!isPlaying) {
      // Start all players
      await Tone.start();
      audioElements.forEach(element => {
        if (!element.player) {
          const player = new Tone.Player(element.url);
          const panner = new Tone.Panner(element.pan).toDestination();
          player.connect(panner);
          player.volume.value = Tone.gainToDb(element.volume);
          player.start();
          element.player = player;
          element.panner = panner;
        } else {
          element.player.start();
        }
      });
    } else {
      // Stop all players
      audioElements.forEach(element => {
        if (element.player) {
          element.player.stop();
        }
      });
    }
    setIsPlaying(!isPlaying);
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
          Audio Mixer
        </h1>

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1.5rem',
          justifyContent: 'center',
          alignItems: 'flex-end',
          marginBottom: '2rem'
        }}>
          {audioElements.map((element, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '60px',
            }}>
              <div style={{
                height: '200px',
                width: '40px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                position: 'relative',
                marginBottom: '10px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: `${element.volume * 100}%`,
                  background: isPlaying ? '#4CAF50' : '#2196F3',
                  borderRadius: '8px',
                  transition: 'height 0.2s',
                }} />
              </div>
              <div style={{ fontSize: '0.9em', color: '#bbb', marginBottom: '5px', textAlign: 'center' }}>{element.name}</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={element.volume}
                onChange={(e) => handleVolumeChange(index, parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={element.pan}
                onChange={(e) => handlePanChange(index, parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '5px' }}
              />
              {/* Fallback audio player */}
              <audio controls src={element.url} style={{ width: '100%', marginTop: '5px' }} />
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={togglePlayback}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              backgroundColor: isPlaying ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>

          <button
            onClick={() => navigate('/generate')}
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
            Back to Generator
          </button>
        </div>
      </div>
    </div>
  );
};

export default MixerPage; 