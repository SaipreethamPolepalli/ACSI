// Sound synthesis module using Web Audio API to create casino effects without loading audio files

let audioCtx = null;
let isMuted = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export const soundManager = {
  toggleMute() {
    isMuted = !isMuted;
    return isMuted;
  },

  isMuted() {
    return isMuted;
  },

  playClick() {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  },

  playOpenSafe() {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // 1. Splinter / Crack noise burst
    const bufferSize = ctx.sampleRate * 0.05; // 50ms noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseNode.start(now);

    // 2. Diamond Chime
    const playChimeNode = (freq, delay, duration, volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.05);
    };

    // Play ascending sparkly notes (C6, E6, G6, C7)
    playChimeNode(1046.50, 0.0, 0.4, 0.08); // C6
    playChimeNode(1318.51, 0.08, 0.4, 0.08); // E6
    playChimeNode(1567.98, 0.16, 0.4, 0.08); // G6
    playChimeNode(2093.00, 0.24, 0.5, 0.1);  // C7
  },

  playExplosion() {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // 1. Low frequency thud / sine sweep
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(150, now);
    lowpass.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(lowpass);
    lowpass.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);

    // 2. White noise explosion blast
    const bufferSize = ctx.sampleRate * 1.5; // 1.5s noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseNode.start(now);
    noiseNode.stop(now + 1.5);
  },

  playCashOut() {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Cascade of coin sound effects (square waves for retro/arcade coin sounds)
    const playCoin = (freq, startTime, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + startTime + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startTime);
      osc.stop(now + startTime + 0.2);
    };

    // Play rapid succession of coins
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.06;
      // Alternate frequencies for arcade flavor
      const baseFreq = 587.33 + (i * 120); // D5 and scaling up
      playCoin(baseFreq, delay, 0.08);
    }
  },

  playJackpotWin() {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Triumphant chiptune fanfare
    const notes = [
      { f: 523.25, d: 0.1 },  // C5
      { f: 659.25, d: 0.1 },  // E5
      { f: 783.99, d: 0.1 },  // G5
      { f: 1046.50, d: 0.2 }, // C6
      { f: 880.00, d: 0.1 },  // A5
      { f: 1046.50, d: 0.1 }, // C6
      { f: 1174.66, d: 0.1 }, // D6
      { f: 1318.51, d: 0.4 }  // E6
    ];

    let accumTime = 0;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, now + accumTime);

      // Add secondary oscillator for fat chorus sound
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(note.f * 1.005, now + accumTime);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + accumTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + accumTime + note.d);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + accumTime);
      osc2.start(now + accumTime);
      osc.stop(now + accumTime + note.d + 0.05);
      osc2.stop(now + accumTime + note.d + 0.05);

      accumTime += note.d + 0.02;
    });

    // Sub-bass sweep underneath for weight
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(100, now);
    bass.frequency.linearRampToValueAtTime(200, now + accumTime);
    bassGain.gain.setValueAtTime(0.12, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + accumTime);

    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + accumTime);
  }
};
