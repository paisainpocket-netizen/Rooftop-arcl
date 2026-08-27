class CricketAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Crisp Bat Hit Sound (Willow / Plastic bat contact)
  public playBatHit() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Noise burst for crack
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.05);

      // Sub-thump tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // Boundary Four Fanfare
  public playFour() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      this.playBatHit();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + 0.08 + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      });
    } catch {}
  }

  // Huge Sixer Roar & Rising Chime
  public playSix() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      this.playBatHit();

      const now = this.ctx.currentTime;
      // Rising sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.45);

      gain.gain.setValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + 0.05);
      osc.stop(now + 0.5);

      // Cheering chords
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      chords.forEach((freq) => {
        if (!this.ctx) return;
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(freq, now + 0.4);
        chordGain.gain.setValueAtTime(0.2, now + 0.4);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        chordOsc.connect(chordGain);
        chordGain.connect(this.ctx.destination);
        chordOsc.start(now + 0.4);
        chordOsc.stop(now + 1.0);
      });
    } catch {}
  }

  // Wicket Fall Sound (Dramatic Down-Pitch & Crash)
  public playWicket() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Stumps rattle / crash
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(110, now + 0.35);

      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Buzzer note
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(220, now + 0.1);
      osc2.frequency.setValueAtTime(164.8, now + 0.3);

      gain2.gain.setValueAtTime(0.3, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);
    } catch {}
  }

  // Direct Roof Out Sound (Special ARCL Rooftop penalty alarm)
  public playRoofOut() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Double siren
      [0, 0.15, 0.3].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now + delay);
        osc.frequency.setValueAtTime(450, now + delay + 0.1);

        gain.gain.setValueAtTime(0.4, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } catch {}
  }

  // Victory Fanfare for Match Finish
  public playVictory() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const sequence = [
        { f: 523.25, d: 0.15, t: 0 },
        { f: 523.25, d: 0.15, t: 0.18 },
        { f: 523.25, d: 0.15, t: 0.36 },
        { f: 659.25, d: 0.4, t: 0.54 },
        { f: 587.33, d: 0.2, t: 0.98 },
        { f: 659.25, d: 0.2, t: 1.2 },
        { f: 783.99, d: 0.6, t: 1.45 },
      ];

      sequence.forEach((item) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, now + item.t);

        gain.gain.setValueAtTime(0.35, now + item.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + item.t);
        osc.stop(now + item.t + item.d);
      });
    } catch {}
  }

  // Over Completion Whistle / Chime
  public playOverComplete() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.15);
      });
    } catch {}
  }

  // Hat-trick Crowd Cheer & Roar (3 wickets in a row!)
  public playHatTrick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Triple stump crash for the 3 wickets
      [0, 0.25, 0.5].forEach((delay) => {
        if (!this.ctx) return;
        const t = now + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });

      // Crowd roar: layered filtered noise swell
      const roarStart = now + 0.6;
      const duration = 2.2;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, roarStart);
      filter.Q.setValueAtTime(0.6, roarStart);

      const roarGain = this.ctx.createGain();
      roarGain.gain.setValueAtTime(0.0001, roarStart);
      roarGain.gain.exponentialRampToValueAtTime(0.5, roarStart + 0.3);
      roarGain.gain.exponentialRampToValueAtTime(0.35, roarStart + 1.2);
      roarGain.gain.exponentialRampToValueAtTime(0.001, roarStart + duration);

      noise.connect(filter);
      filter.connect(roarGain);
      roarGain.connect(this.ctx.destination);
      noise.start(roarStart);
      noise.stop(roarStart + duration);

      // Triumphant chord over the roar
      const chords = [523.25, 659.25, 783.99, 987.77, 1046.5];
      chords.forEach((freq) => {
        if (!this.ctx) return;
        const t = roarStart + 0.3;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 1.4);
      });
    } catch {}
  }

  private isVoiceEnabled: boolean = true;
  private commentaryLanguage: 'pa' | 'hi' | 'en' = 'pa'; // Default authentic Punjabi!

  public setVoiceEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
  }

  public getIsVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public toggleVoice(): boolean {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    return this.isVoiceEnabled;
  }

  public setCommentaryLanguage(lang: 'pa' | 'hi' | 'en') {
    this.commentaryLanguage = lang;
    try {
      localStorage.setItem('arcl_commentary_lang', lang);
    } catch {}
  }

  public getCommentaryLanguage(): 'pa' | 'hi' | 'en' {
    try {
      const saved = localStorage.getItem('arcl_commentary_lang');
      if (saved === 'pa' || saved === 'hi' || saved === 'en') {
        this.commentaryLanguage = saved;
      }
    } catch {}
    return this.commentaryLanguage;
  }

  // Voice Commentary Synthesizer via Web Speech API
  public speak(text: string, rate: number = 1.05) {
    if (!this.isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel(); // cancel previous speech to prevent lagging
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      
      const lang = this.getCommentaryLanguage();
      const voices = window.speechSynthesis.getVoices();

      if (lang === 'pa') {
        // Punjabi voice or fallback to Hindi / Indian English with clear pronunciation
        const paVoice = voices.find(v => v.lang.startsWith('pa') || v.lang.includes('pa-IN')) ||
                        voices.find(v => v.lang.startsWith('hi') || v.lang.includes('hi-IN')) ||
                        voices.find(v => v.lang.includes('en-IN'));
        if (paVoice) utterance.voice = paVoice;
        utterance.lang = paVoice ? paVoice.lang : 'hi-IN';
      } else if (lang === 'hi') {
        const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.lang.includes('hi-IN')) ||
                        voices.find(v => v.lang.includes('en-IN'));
        if (hiVoice) utterance.voice = hiVoice;
        utterance.lang = hiVoice ? hiVoice.lang : 'hi-IN';
      } else {
        const enVoice = voices.find(v => v.lang.includes('en-IN')) ||
                        voices.find(v => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = enVoice ? enVoice.lang : 'en-IN';
      }

      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  // Generate and Speak Real Cricket Commentary in English, Hindi or Punjabi
  public announceBallEvent(params: {
    eventType: 'dot' | 'single' | 'two' | 'three' | 'four' | 'six' | 'wicket' | 'wide' | 'noball' | 'direct_roof' | 'wall_catch' | 'retired_hurt' | 'fifty' | 'century' | 'win';
    batterName: string;
    bowlerName?: string;
    runs?: number;
    wicketType?: string;
    customText?: string;
  }) {
    if (!this.isVoiceEnabled) return;
    const lang = this.getCommentaryLanguage();
    const { eventType, batterName, bowlerName, runs = 0, customText } = params;

    let commentaryText = '';

    if (customText) {
      commentaryText = customText;
    } else if (lang === 'pa') {
      // Authentic Punjabi Rooftop Commentary
      switch (eventType) {
        case 'six':
          commentaryText = `ਓਹੋ ਹੋ! ${batterName} ਦਾ ਵੱਡਾ ਛੱਕਾ! ਗੇਂਦ ਸਿੱਧੀ ਛੱਤ ਤੇ!`;
          break;
        case 'four':
          commentaryText = `ਕੈਮ ਚੌਕਾ! ${batterName} ਨੇ ਕੰਧ ਪਾਰ ਕਰਤੀ!`;
          break;
        case 'direct_roof':
          commentaryText = `ਆਊਟ! ਸਿੱਧੀ ਛੱਤੋਂ ਬਾਹਰ ਮਾਰਤੀ, ਡਾਇਰੈਕਟ ਰੂਫ਼ ਆਊਟ!`;
          break;
        case 'wall_catch':
          commentaryText = `ਆਊਟ! ਇਕ ਟੱਪਾ ਕੰਧ ਕੈਚ, ਬੱਲੇਬਾਜ਼ ਪਵੇਲੀਅਨ ਵੱਲ!`;
          break;
        case 'wicket':
          commentaryText = `ਵਿਕਟ ਡਿੱਗ ਪਈ! ${bowlerName ? bowlerName + ' ਨੇ ' : ''}${batterName} ਨੂੰ ਆਊਟ ਕਰਤਾ!`;
          break;
        case 'single':
          commentaryText = `ਸਿੰਗਲ ਰਨ, ${batterName} ਨੇ ਭੱਜ ਕੇ ਇਕ ਰਨ ਪੂਰਾ ਕੀਤਾ।`;
          break;
        case 'two':
          commentaryText = `ਦੋ ਰਨ, ਵਧੀਆ ਦੌੜ ਬੱਲੇਬਾਜ਼ਾਂ ਦੀ।`;
          break;
        case 'dot':
          commentaryText = `ਡਾਟ ਬਾਲ, ਵਧੀਆ ਗੇਂਦਬਾਜ਼ੀ!`;
          break;
        case 'wide':
          commentaryText = `ਵਾਈਡ ਬਾਲ, ਇਕ ਵਾਧੂ ਰਨ ਮਿਲਿਆ।`;
          break;
        case 'noball':
          commentaryText = `ਨੋ ਬਾਲ! ਅਗਲੀ ਗੇਂਦ ਫ੍ਰੀ ਹਿੱਟ ਹੋਵੇਗੀ!`;
          break;
        case 'retired_hurt':
          commentaryText = `${batterName} ਰਿਟਾਇਰਡ ਹਰਟ ਹੋ ਕੇ ਬਾਹਰ ਗਏ।`;
          break;
        case 'fifty':
          commentaryText = `ਵਾਹ ਜੀ ਵਾਹ! ${batterName} ਦੀ ਸ਼ਾਨਦਾਰ ਫਿਫਟੀ ਪੂਰੀ!`;
          break;
        case 'century':
          commentaryText = `ਕਮਾਲ! ${batterName} ਦਾ ਇਤਿਹਾਸਿਕ ਸੈਂਕੜਾ!`;
          break;
        default:
          commentaryText = `${runs} ਰਨ`;
      }
    } else if (lang === 'hi') {
      // Hindi Commentary
      switch (eventType) {
        case 'six':
          commentaryText = `गगनचुंबी छक्का! ${batterName} ने गेंद को छत के पार भेज दिया!`;
          break;
        case 'four':
          commentaryText = `खूबसूरत चौका! ${batterName} के बल्ले से निकली गोली!`;
          break;
        case 'direct_roof':
          commentaryText = `आउट! छत से बाहर डायरेक्ट शॉट, रूफ आउट!`;
          break;
        case 'wall_catch':
          commentaryText = `आउट! दीवार से लगकर शानदार कैच लपका!`;
          break;
        case 'wicket':
          commentaryText = `विकेट! ${batterName} आउट होकर पवेलियन लौटते हुए!`;
          break;
        case 'single':
          commentaryText = `एक रन, आसानी से स्ट्राइक रोटेट की।`;
          break;
        case 'two':
          commentaryText = `तेजी से भागकर दो रन पूरे किए।`;
          break;
        case 'dot':
          commentaryText = `डॉट बॉल, कोई रन नहीं।`;
          break;
        case 'wide':
          commentaryText = `अंपायर का इशारा वाइड बॉल, एक्स्ट्रा रन।`;
          break;
        case 'noball':
          commentaryText = `नो बॉल! अगली गेंद फ्री हिट होगी!`;
          break;
        case 'retired_hurt':
          commentaryText = `${batterName} रिटायर्ड हर्ट होकर बाहर गए।`;
          break;
        case 'fifty':
          commentaryText = `शानदार अर्धशतक! ${batterName} की बेहतरीन फिफ्टी!`;
          break;
        default:
          commentaryText = `${runs} रन`;
      }
    } else {
      // English Commentary
      switch (eventType) {
        case 'six':
          commentaryText = `Massive Six! ${batterName} clears the terrace with sheer power!`;
          break;
        case 'four':
          commentaryText = `Glorious boundary! Four runs to ${batterName}!`;
          break;
        case 'direct_roof':
          commentaryText = `OUT! Direct Roof Out, hit straight over the boundary boundary!`;
          break;
        case 'wall_catch':
          commentaryText = `OUT! Wall rebound catch taken cleanly!`;
          break;
        case 'wicket':
          commentaryText = `WICKET! ${batterName} is dismissed!`;
          break;
        case 'single':
          commentaryText = `Single taken by ${batterName}.`;
          break;
        case 'two':
          commentaryText = `Quick double taken between the wickets.`;
          break;
        case 'dot':
          commentaryText = `Dot ball, tight line and length.`;
          break;
        case 'wide':
          commentaryText = `Wide ball signaled by the umpire.`;
          break;
        case 'noball':
          commentaryText = `No Ball! Free hit coming up next!`;
          break;
        case 'retired_hurt':
          commentaryText = `${batterName} retired hurt and walks off.`;
          break;
        case 'fifty':
          commentaryText = `Fifty! Brilliant half century by ${batterName}!`;
          break;
        default:
          commentaryText = `${runs} runs scored`;
      }
    }

    this.speak(commentaryText);
  }

  // UI Tap / Click
  public playClick(spokenText?: string) {
    if (spokenText) {
      this.speak(spokenText);
    }
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }
}

export const cricketAudio = new CricketAudioEngine();
