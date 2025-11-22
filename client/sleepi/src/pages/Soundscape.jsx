import React, { useState } from "react";
import { Headphones } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import "../index.css";

export default function Soundscape() {
  const [aiAudioUrl, setAiAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(300); // Default 5 minutes (300 seconds)

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
          username: "sarah",  // You can change this to any username from your sleep data
          duration_seconds: durationSeconds,
          mood: "stressed but trying to relax"
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

        <div style={{ marginTop: 24, width: "100%" }}>
          <label style={{ display: "block", marginBottom: 12, fontSize: "14px", fontWeight: 500 }}>
            Duration: {formatDuration(durationSeconds)}
          </label>
          <input
            type="range"
            min="10"
            max="1800"
            step="10"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(parseInt(e.target.value))}
            disabled={loading}
            style={{
              width: "100%",
              height: "8px",
              borderRadius: "4px",
              outline: "none",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "12px", color: "#888" }}>
            <span>10s</span>
            <span>30m</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={generateAIASMR}
          disabled={loading}
          style={{ marginTop: 24 }}
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
