import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';

const HoverVideo = ({ src, platform, style }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // If platform is YOUTUBE, render an iframe instead of a video
  if (platform === 'YOUTUBE') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
        <iframe
          src={`https://www.youtube.com/embed/${src}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Video"
        ></iframe>
        <a 
          href={`https://youtube.com/watch?v=${src}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            textDecoration: 'none',
            zIndex: 10
          }}
        >
          🔗 유튜브에서 보기
        </a>
      </div>
    );
  }

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Auto-play prevented by browser policy", err);
      });
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div 
      className="click-video-container"
      style={{ position: 'relative', cursor: 'pointer', ...style }}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        muted
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '50%',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <Play size={24} fill="white" color="white" style={{ marginLeft: '4px' }} />
        </div>
      )}
    </div>
  );
};

export default HoverVideo;
