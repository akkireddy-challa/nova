'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
  onTranscription: (text: string) => void;
}

export function VoiceInput({ onTranscription }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscription(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setErrorMsg('Voice input paused');
        setTimeout(() => setErrorMsg(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscription]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErrorMsg('Speech recognition unavailable in this browser');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setErrorMsg(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Listening... click to stop' : 'Voice input'}
        className={`p-2 rounded-xl transition flex items-center justify-center ${
          isListening
            ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
        }`}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {errorMsg && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 whitespace-nowrap z-50 shadow-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
