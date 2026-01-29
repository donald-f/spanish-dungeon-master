import { useCallback, useRef, useEffect, useState } from "react";

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

interface TTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

const TTS_WARMUP_KEY = "aventura_tts_warmed_up";

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function useTTS(options: UseTTSOptions = {}) {
  const { lang = "es-ES", rate = 0.9, pitch = 1 } = options;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isWarmedUpRef = useRef(false);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);
  
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: true,
    isReady: false,
    error: null,
  });

  const loadVoices = useCallback(() => {
    if (!window.speechSynthesis) {
      setState(prev => ({ ...prev, isLoading: false, error: "TTS not supported" }));
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesRef.current = voices;
      setState(prev => ({ ...prev, isLoading: false, isReady: true }));
    }
  }, []);

  const getSpanishVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (voices.length === 0) {
      voicesRef.current = window.speechSynthesis?.getVoices() || [];
    }
    
    const spanishVoices = voicesRef.current.filter(v => v.lang.startsWith("es"));
    const femaleVoice = spanishVoices.find(v => 
      v.name.toLowerCase().includes("female") || 
      v.name.toLowerCase().includes("paulina") ||
      v.name.toLowerCase().includes("mónica") ||
      v.name.toLowerCase().includes("monica")
    );
    
    return femaleVoice || spanishVoices[0] || null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const warmUp = useCallback(() => {
    if (isWarmedUpRef.current || !window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    utterance.rate = 10;
    
    try {
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.cancel();
      isWarmedUpRef.current = true;
      sessionStorage.setItem(TTS_WARMUP_KEY, "true");
    } catch (e) {
      console.warn("TTS warm-up failed:", e);
    }
  }, []);

  const speakChunk = useCallback((text: string, voice: SpeechSynthesisVoice | null): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      
      if (voice) {
        utterance.voice = voice;
      }

      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const estimatedDuration = Math.max((text.length / 10) * 1000, 5000);
      const timeout = setTimeout(cleanup, estimatedDuration);

      utterance.onend = () => {
        clearTimeout(timeout);
        cleanup();
      };
      
      utterance.onerror = () => {
        clearTimeout(timeout);
        cleanup();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        clearTimeout(timeout);
        cleanup();
      }
    });
  }, [lang, rate, pitch]);

  const speak = useCallback(
    async (text: string) => {
      if (!window.speechSynthesis) {
        setState(prev => ({ ...prev, error: "TTS not supported" }));
        return;
      }

      if (!text || text.trim().length === 0) {
        return;
      }

      stop();
      abortRef.current = false;
      setState(prev => ({ ...prev, isSpeaking: true, error: null }));

      if (!isWarmedUpRef.current) {
        warmUp();
      }

      const voice = getSpanishVoice();
      
      if (isIOS()) {
        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 250);
      }

      try {
        if (isIOS() && text.length > 200) {
          const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
          const chunks: string[] = [];
          let currentChunk = "";
          
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length > 150) {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }
          if (currentChunk) chunks.push(currentChunk.trim());

          for (const chunk of chunks) {
            if (abortRef.current) break;
            await speakChunk(chunk, voice);
          }
        } else {
          await speakChunk(text, voice);
        }
      } catch (e) {
        console.error("TTS error:", e);
        setState(prev => ({ ...prev, error: "Error al reproducir audio" }));
      } finally {
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        setState(prev => ({ ...prev, isSpeaking: false }));
      }
    },
    [lang, rate, pitch, stop, warmUp, getSpanishVoice, speakChunk]
  );

  useEffect(() => {
    if (!window.speechSynthesis) {
      setState(prev => ({ ...prev, isLoading: false, error: "TTS not supported" }));
      return;
    }

    loadVoices();

    const handleVoicesChanged = () => {
      loadVoices();
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    if (sessionStorage.getItem(TTS_WARMUP_KEY) === "true") {
      isWarmedUpRef.current = true;
    }

    const handleUserInteraction = () => {
      if (!isWarmedUpRef.current) {
        warmUp();
      }
    };

    if (isMobile()) {
      document.addEventListener("touchstart", handleUserInteraction, { once: true, passive: true });
      document.addEventListener("click", handleUserInteraction, { once: true });
    }

    return () => {
      stop();
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("click", handleUserInteraction);
    };
  }, [loadVoices, warmUp, stop]);

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
