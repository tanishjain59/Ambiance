import React from 'react';
import { useNavigate } from 'react-router-dom';

const TitlePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '20px'
        }}>
            <h1 style={{
                fontSize: '4rem',
                marginBottom: '1rem',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold'
            }}>
                Ambiance
            </h1>
            <p style={{
                fontSize: '1.5rem',
                marginBottom: '2rem',
                fontFamily: 'Arial, sans-serif',
                color: '#888'
            }}>
                Create and mix immersive audio experiences
            </p>
            <button
                onClick={() => navigate('/generate')}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
            >
                Get Started
            </button>
        </div>
    );
};

export default TitlePage; 