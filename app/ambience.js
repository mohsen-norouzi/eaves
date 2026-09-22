export const AMBIENCE_URL = '/audio/desert.m4a';
const LEVEL = 0.16;

// Stream the long recording; only the short chime samples are decoded into memory.
export class DesertAmbience {
  constructor({
    audio = new Audio(AMBIENCE_URL),
    doc = document,
    schedule = (fn, delay) => setTimeout(() => fn(), delay),
    cancel = (id) => clearTimeout(id),
  } = {}) {
    this.audio = audio;
    this.audio.src = AMBIENCE_URL;
    this.doc = doc;
    this.schedule = schedule;
    this.cancel = cancel;
    this.audio.loop = true;
    this.audio.preload = 'metadata';
    this.muted = false;
    this.wanted = false;
    this.disposed = false;
    this.revision = 0;
    this.visibility = () => {
      void this.sync();
    };
    doc.addEventListener('visibilitychange', this.visibility);
  }
  start(context) {
    if (this.disposed || !context) return Promise.resolve(false);
    if (!this.gain) {
      this.context = context;
      this.source = context.createMediaElementSource(this.audio);
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.source.connect(this.gain);
      this.gain.connect(context.destination);
    }
    this.wanted = true;
    return this.sync();
  }
  setMuted(muted) {
    this.muted = muted;
    return this.sync();
  }
  canPlay() {
    return this.wanted && !this.muted && !this.doc.hidden && !this.disposed;
  }
  fade(level, seconds) {
    if (!this.gain) return;
    const gain = this.gain.gain,
      now = this.context.currentTime;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
    }
    gain.setTargetAtTime(level, now, seconds);
  }
  async sync() {
    const revision = ++this.revision;
    this.cancel(this.pauseTimer);
    if (!this.canPlay()) {
      if (this.doc.hidden || this.disposed) {
        this.audio.pause();
        if (this.gain) {
          this.gain.gain.cancelScheduledValues(this.context.currentTime);
          this.gain.gain.setValueAtTime(0, this.context.currentTime);
        }
      } else {
        this.fade(0, 0.045);
        this.pauseTimer = this.schedule(() => {
          if (revision === this.revision && !this.canPlay()) this.audio.pause();
        }, 250);
      }
      return false;
    }
    try {
      // Called synchronously from the entry/unmute click, before awaiting playback.
      await this.audio.play();
      if (revision !== this.revision) {
        if (!this.canPlay()) this.audio.pause();
        return false;
      }
      this.fade(LEVEL, 0.45);
      return true;
    } catch {
      if (revision === this.revision) this.fade(0, 0.03);
      return false;
    }
  }
  dispose() {
    this.disposed = true;
    ++this.revision;
    this.cancel(this.pauseTimer);
    this.doc.removeEventListener('visibilitychange', this.visibility);
    this.audio.pause();
    this.source?.disconnect();
    this.gain?.disconnect();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
