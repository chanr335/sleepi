import React, { useState, useRef } from "react";
import { Headphones, Moon, Waves, Wind } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import "../index.css";

const TRACKS = [
  {
    id: "rain",
    name: "Gentle Rain",
    description: "Soft rain on a quiet night.",
    icon: <Waves size={20} />,
    // replace these with your own local files later
    src: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_2a1b1ab8b6.mp3?filename=rain-ambient-9924.mp3",
  },
  {
    id: "white",
    name: "White Noise",
    description: "Classic static for deep focus.",
    icon: <Wind size={20} />,
    src: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_9a1a06c574.mp3?filename=white-noise-9940.mp3",
  },
  {
    id: "forest",
    name: "Night Forest",
    description: "Crickets and distant wind.",
    icon: <Moon size={20} />,
    src: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_4a6fb0f0d7.mp3?filename=night-forest-ambience-9083.mp3",
  },
];

export default function Soundscape() {
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const currentTrack = TRACKS.find((t) => t.id === currentTrackId) || TRACKS[0];

  const handlePlay = (track) => {
    if (!audioRef.current) return;

    // if clicking the same track, toggle play/pause
    if (currentTrackId === track.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // switch track + play
    setCurrentTrackId(track.id);
    audioRef.current.src = track.src;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleMasterToggle = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrackId) setCurrentTrackId(currentTrack.id);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Soundscape</h1>
        <p>Create a calm environment with sleep sounds and white noise.</p>
      </header>

      {/* Hidden audio element */}
      <audio ref={audioRef} loop />

      {/* Now Playing */}
      <GlassCard className="glass-card center-content">
        <div className="icon-box icon-cyan">
          <Headphones size={28} />
        </div>
        <h3 style={{ marginTop: 8 }}>Now Playing</h3>
        <h2 style={{ marginTop: 4 }}>{currentTrack.name}</h2>
        <p style={{ marginTop: 6 }}>{currentTrack.description}</p>

        <div style={{ marginTop: 16, width: "100%" }}>
          <Button variant="primary" onClick={handleMasterToggle}>
            {isPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      </GlassCard>

      {/* Sound list */}
      <div className="form-section">
        <label>Presets</label>
        <GlassCard className="settings-list">
          {TRACKS.map((track) => {
            const active = track.id === currentTrackId && isPlaying;
            return (
              <div
                key={track.id}
                className="setting-row list-item clickable"
                onClick={() => handlePlay(track)}
              >
                <div className="flex-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon-box icon-indigo">{track.icon}</div>
                  <div>
                    <h4>{track.name}</h4>
                    <p style={{ fontSize: 12 }}>{track.description}</p>
                  </div>
                </div>

                {active ? (
                  <span className="badge badge-green">Playing</span>
                ) : (
                  <span className="badge">Tap to Play</span>
                )}
              </div>
            );
          })}
        </GlassCard>
      </div>
    </div>
  );
}
