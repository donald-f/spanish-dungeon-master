import { useCallback, useRef, useState } from "react";

interface TTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

function getStoredPassword(): string {
  return localStorage.getItem("sdm_password") ?? "";
}

async function speakWithOpenAI(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>): Promise<void> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Password": getStoredPassword(),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`TTS API error: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch(reject);
  });
}

function speakWithBrowser(text: string, lang: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function useTTS(options: { lang?: string; rate?: number } = {}) {
  const { lang = "es-ES", rate = 0.9 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: false,
    isReady: true,
    error: null,
  });

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text?.trim()) return;
    stop();
    setState(prev => ({ ...prev, isSpeaking: true, isLoading: true, error: null }));

    try {
      await speakWithOpenAI(text, audioRef);
    } catch (err) {
      console.warn("OpenAI TTS failed, falling back to browser TTS:", err);
      try {
        await speakWithBrowser(text, lang, rate);
      } catch (fallbackErr) {
        console.error("Browser TTS fallback also failed:", fallbackErr);
        setState(prev => ({ ...prev, error: "Error al reproducir audio" }));
      }
    } finally {
      setState(prev => ({ ...prev, isSpeaking: false, isLoading: false }));
    }
  }, [lang, rate, stop]);

  // warmUp is a no-op now (OpenAI TTS doesn't need it) but kept for API compatibility
  const warmUp = useCallback(() => {}, []);

  return {
    speak,
    stop,
    warmUp,
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    isReady: state.isReady,
    error: state.error,
  };
}
