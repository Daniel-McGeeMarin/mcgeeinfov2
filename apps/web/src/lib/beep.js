// Generates the alarm tone via the Web Audio API instead of shipping an audio file.
// `warmUpAudio` must be called from an actual user gesture (a click handler) — browsers
// block AudioContext playback until one has occurred; later programmatic calls (e.g. from
// a setInterval while the alarm is ringing) reuse the same already-unlocked context.
let ctx

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function warmUpAudio() {
  const audioCtx = getCtx()
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

function beep({ frequency = 880, duration = 0.15, delay = 0, volume = 0.3 } = {}) {
  const audioCtx = getCtx()
  const startAt = audioCtx.currentTime + delay
  const oscillator = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = volume
  oscillator.connect(gain)
  gain.connect(audioCtx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration)
}

export function playAlarm() {
  beep({ frequency: 880, duration: 0.15, delay: 0 })
  beep({ frequency: 660, duration: 0.15, delay: 0.2 })
  beep({ frequency: 880, duration: 0.25, delay: 0.4 })
}
