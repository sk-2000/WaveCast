class SoundEngineClass {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, attack: number, decay: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + attack + decay);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + attack + decay);
  }

  playClick() {
    this.playTone(800, 'sine', 0.01, 0.1, 0.1);
  }

  playToggleOn() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    // Low to high chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.setValueAtTime(600, time + 0.1);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playToggleOff() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    // High to low chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.setValueAtTime(400, time + 0.1);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playThud() {
    this.playTone(150, 'sine', 0.05, 0.3, 0.2);
  }
}

export const SoundEngine = new SoundEngineClass();
