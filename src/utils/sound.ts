class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.14,
    delay = 0,
    slideToFreq?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick(): void {
    this.playTone(580, 0.07, 'sine', 0.1, 0, 740);
  }

  public playStep(): void {
    this.playTone(150 + Math.random() * 40, 0.045, 'triangle', 0.04, 0, 95);
  }

  public playJump(): void {
    this.playTone(260, 0.16, 'sine', 0.12, 0, 560);
  }

  public playWaterSplash(): void {
    this.playTone(420, 0.12, 'sine', 0.12, 0, 680);
    this.playTone(620, 0.16, 'sine', 0.1, 0.08, 920);
    this.playTone(840, 0.2, 'triangle', 0.08, 0.16, 1120);
  }

  public playIhramSwap(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.18, 'triangle', 0.13, idx * 0.065);
    });
  }

  public playProgressTick(step: number, total: number): void {
    const base = 440 + (step / Math.max(1, total)) * 380;
    this.playTone(base, 0.14, 'triangle', 0.14, 0, base * 1.15);
    this.playTone(base * 1.5, 0.18, 'sine', 0.1, 0.06);
  }

  public playThrowStone(): void {
    this.playTone(320, 0.14, 'sawtooth', 0.08, 0, 140);
    this.playTone(210, 0.09, 'square', 0.12, 0.14, 90);
  }

  public playQuizCorrect(): void {
    this.playTone(587.33, 0.12, 'triangle', 0.14, 0);
    this.playTone(880, 0.24, 'triangle', 0.15, 0.09);
  }

  public playQuizWrong(): void {
    this.playTone(280, 0.16, 'sawtooth', 0.09, 0, 210);
    this.playTone(210, 0.22, 'sawtooth', 0.09, 0.12, 165);
  }

  public playWarning(): void {
    this.playTone(330, 0.12, 'sine', 0.08, 0, 260);
  }

  public playBadgeUnlock(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((freq, i) => {
      this.playTone(freq, i === fanfare.length - 1 ? 0.45 : 0.15, 'triangle', 0.15, i * 0.085);
    });
  }

  public speakIndonesian(text: string): void {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'id-ID';
      utter.rate = 0.98;
      utter.pitch = 1.08;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  }

  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundEngine = new SoundEngine();
