// Procedural Web Audio synthesis and Desktop Notifications engine.
// Zero external media assets required; works cross-platform in standard WebViews.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private volume: number = 0.6;
  private notifEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.soundEnabled = localStorage.getItem("mncode:sound_enabled") !== "false";
      this.notifEnabled = localStorage.getItem("mncode:notif_enabled") !== "false";
      const vol = localStorage.getItem("mncode:sound_volume");
      if (vol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(vol)));
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const Win = window as Window & { webkitAudioContext?: { new (contextOptions?: AudioContextOptions): AudioContext; prototype: AudioContext } };
      const AudioCtx = typeof AudioContext !== "undefined" ? AudioContext : Win.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("mncode:sound_enabled", enabled ? "true" : "false");
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined") {
      localStorage.setItem("mncode:sound_volume", this.volume.toString());
    }
  }

  public isNotificationEnabled(): boolean {
    return this.notifEnabled;
  }

  public setNotificationEnabled(enabled: boolean) {
    this.notifEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("mncode:notif_enabled", enabled ? "true" : "false");
      if (enabled && "Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }
  }

  // Play a pleasant, modern multi-harmonic completion chime
  public playTaskComplete() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major arpeggio)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.35, now);
    masterGain.connect(ctx.destination);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.6, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.7);
    });
  }

  // Play gentle alert for interactive questions or permissions
  public playPromptAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.3, now);
    masterGain.connect(ctx.destination);

    const notes = [440, 880]; // A4 -> A5 prompt chord
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.5, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    });
  }

  // Subtle tick on tool start
  public playToolTick() {
    if (!this.soundEnabled || this.volume === 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(this.volume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  // Send desktop notification if enabled and permitted
  public notify(title: string, body: string) {
    if (!this.notifEnabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon.svg",
        silent: true, // We handle our own audio chime
      });
    } else if (Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(title, { body, icon: "/icon.svg", silent: true });
        }
      });
    }
  }
}

export const sounds = new SoundEngine();
