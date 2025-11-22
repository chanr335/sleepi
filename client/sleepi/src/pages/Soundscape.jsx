import React, { useState } from "react";
import { Headphones } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import "../index.css";

export default function Soundscape() {
  const [aiAudioUrl, setAiAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateAIASMR = async () => {
    setLoading(true);
    setAiAudioUrl(null);

    try {
      const res = await fetch("http://localhost:8000/api/sleep-asmr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user-1",
          minutes: 5,
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
