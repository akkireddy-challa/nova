"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic } from "lucide-react";
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  SpeechRecognizer,
} from "@/lib/client/voice";

interface Props {
  onTranscription: (text: string) => void;
}

export function VoiceInput({ onTranscription }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setErrorMsg("Speech recognition unavailable in this browser");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setErrorMsg(null);
    const recognizer = createSpeechRecognizer({
      onResult: (text, isFinal) => {
        if (isFinal && text) {
          onTranscription(text.trim());
        }
      },
      onError: (err) => {
        setErrorMsg(err);
        setIsListening(false);
        recognizerRef.current = null;
        setTimeout(() => setErrorMsg(null), 3000);
      },
      onEnd: () => {
        setIsListening(false);
        recognizerRef.current = null;
      },
    });

    recognizerRef.current = recognizer;
    setIsListening(true);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? "Listening... click to stop" : "Voice input"}
        className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
          isListening
            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
            : "text-slate-400 hover:text-teal-300 hover:bg-slate-800"
        }`}
      >
        <Mic className="w-3.5 h-3.5" />
      </button>

      {errorMsg && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 whitespace-nowrap z-50 shadow-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
