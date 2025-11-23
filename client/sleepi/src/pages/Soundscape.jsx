import React, { useState, useEffect } from "react";
import { Headphones } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import "../index.css";

export default function Soundscape() {
  const [aiAudioUrl, setAiAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(300); // Default 5 minutes (300 seconds)
  const [selectedVoice, setSelectedVoice] = useState("delilah"); // Default voice

  // Add slider styles
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "duration-slider-styles";
    style.textContent = `
      #duration-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      
      #duration-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        border: none;
      }
      
      #duration-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #E8C085;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.1);
        margin-top: -6px;
      }
      
      #duration-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #E8C085;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.1);
      }
      
      #duration-slider::-webkit-slider-thumb:hover {
        background: #D9B88F;
      }
      
      #duration-slider::-moz-range-thumb:hover {
        background: #D9B88F;
      }
    `;
    
    if (!document.getElementById("duration-slider-styles")) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById("duration-slider-styles");
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Convert seconds to readable format
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour`;
    }
  };

  const generateAIASMR = async () => {
    setLoading(true);
    setAiAudioUrl(null);

    try {
      const res = await fetch("http://localhost:8000/api/sleep-asmr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "eileen",  // You can change this to any username from your sleep data
          duration_seconds: durationSeconds,
          mood: "stressed but trying to relax",
          voice: selectedVoice
        }),
      });

      if (!res.ok) {
        alert("Error generating ASMR audio");
        return;
      }

      const blob = await res.blob();
      setAiAudioUrl(URL.createObjectURL(blob));

    } catch (err) {
      console.error(err);
      alert("Could not contact the Sleepi backend.");
    }

    setLoading(false);
  };

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Soundscape</h1>
        <p>Your personalized AI sleep companion will guide you into deep rest.</p>
      </header>

      <GlassCard className="glass-card center-content">
        <div className="icon-box icon-cyan">
          <Headphones size={28} />
        </div>

        <h2 style={{ marginTop: 12 }}>AI Sleep Story</h2>
        <p style={{ textAlign: "center", marginTop: 6 }}>
          We generate a soothing ASMR-style narration using your personal sleep profile.
        </p>

        <div style={{ marginTop: 24, width: "100%", padding: "8px 0" }}>
          <label style={{ display: "block", marginBottom: 12, fontSize: "14px", fontWeight: 500 }}>
            Duration: {formatDuration(durationSeconds)}
          </label>
          <input
            id="duration-slider"
            type="range"
            min={10}
            max={1800}
            step={10}
            value={durationSeconds}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setDurationSeconds(val);
            }}
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent GlassCard from interfering
            }}
            onTouchStart={(e) => {
              e.stopPropagation(); // Prevent GlassCard from interfering
            }}
            disabled={loading}
            style={{
              width: "100%",
              height: "20px",
              borderRadius: "4px",
              outline: "none",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              pointerEvents: loading ? "none" : "auto",
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              background: "transparent",
              position: "relative",
              zIndex: 10,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "12px", color: "#8E8E93" }}>
            <span>10s</span>
            <span>30m</span>
          </div>
        </div>

        <div style={{ marginTop: 24, width: "100%", padding: "8px 0" }}>
          <label style={{ display: "block", marginBottom: 12, fontSize: "14px", fontWeight: 500 }}>
            Voice
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              backgroundColor: "#1C1C1E",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "18px",
              color: "#FFFFFF",
              outline: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: "36px",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
          >
            <option value="delilah" style={{ backgroundColor: "#1C1C1E", color: "#FFFFFF" }}>
              Delilah
            </option>
            <option value="vincent" style={{ backgroundColor: "#1C1C1E", color: "#FFFFFF" }}>
              Vincent
            </option>
            <option value="tiza" style={{ backgroundColor: "#1C1C1E", color: "#FFFFFF" }}>
              Tiza
            </option>
          </select>
        </div>

        <Button
          variant="primary"
          onClick={generateAIASMR}
          disabled={loading}
          style={{ marginTop: 20 }}
        >
          {loading ? "Generating..." : "Generate My Sleep Story"}
        </Button>

        {aiAudioUrl && (
          <audio
            controls
            autoPlay
            src={aiAudioUrl}
            style={{ marginTop: 20, width: "100%" }}
          />
        )}
      </GlassCard>
    </div>
  );
}
