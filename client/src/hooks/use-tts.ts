import { useCallback, useRef, useEffect } from "react";

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { lang = "es-ES", rate = 0.9, pitch = 1 } = options;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) {
        console.warn("Speech synthesis not supported");
        return;
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (voice) => voice.lang.startsWith("es") && voice.name.includes("female")
      ) || voices.find((voice) => voice.lang.startsWith("es"));
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang, rate, pitch, stop]
  );

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    
    return () => {
      stop();
    };
  }, [stop]);

  return { speak, stop, isSpeaking: isSpeakingRef.current };
}
