import numpy as np
import scipy.io.wavfile as wav
import os

# Set global sample rate for high-definition audio
SAMPLE_RATE = 44100

def apply_envelope(wave, duration, attack=0.01, decay=0.1):
    """Applies an ADSR-style volume envelope to prevent clicking and add punch."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    envelope = np.ones_like(t)
    
    # Attack (fade in)
    attack_samples = int(attack * SAMPLE_RATE)
    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
        
    # Decay (fade out exponentially for a natural tail)
    decay_samples = int(decay * SAMPLE_RATE)
    if decay_samples > 0:
        decay_curve = np.exp(-np.linspace(0, 5, decay_samples))
        envelope[-decay_samples:] = decay_curve
        
    return wave * envelope

def generate_laser(duration=0.25):
    """
    Generates a high-quality Sci-Fi laser.
    Uses a frequency sweep (chirp) combined with a square wave for extra 'bite'.
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    
    # Frequency drops exponentially from 1200Hz to 300Hz
    freq = 300 + 900 * np.exp(-t * 15)
    
    # Integrate frequency to get phase
    phase = np.cumsum(freq) / SAMPLE_RATE * 2 * np.pi
    
    # Mix a Sine wave (smooth) with a Square wave (crunchy)
    sine_wave = np.sin(phase)
    square_wave = np.sign(np.sin(phase))
    
    # Blend them: 70% Sine, 30% Square
    mixed_wave = (sine_wave * 0.7) + (square_wave * 0.3)
    
    # Apply a sharp decay envelope so it sounds like a snappy 'pew'
    final_wave = apply_envelope(mixed_wave, duration, attack=0.005, decay=duration)
    return final_wave

def generate_explosion(duration=0.6):
    """
    Generates a deep, punchy explosion when an enemy is destroyed.
    Uses white noise passed through a simulated low-pass filter.
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    
    # Generate pure white noise
    noise = np.random.uniform(-1.0, 1.0, len(t))
    
    # Add a sub-bass 'thump' at the beginning (rapidly drops from 150Hz to 40Hz)
    thump_freq = 40 + 110 * np.exp(-t * 20)
    thump_phase = np.cumsum(thump_freq) / SAMPLE_RATE * 2 * np.pi
    thump = np.sin(thump_phase) * np.exp(-t * 10) # Fades out very quickly
    
    # Mix the noise and the thump
    mixed = (noise * 0.4) + (thump * 0.6)
    
    # Apply an exponential envelope so the explosion fades out naturally
    final_wave = apply_envelope(mixed, duration, attack=0.01, decay=duration)
    return final_wave

def generate_time_dilation(duration=1.2):
    """
    Generates the cinematic 'Bass Drop' sound when time slows down.
    A deep sub-frequency sweep with a slight vibrato effect.
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    
    # Frequency sweeps down from a mid-tone 300Hz to a rumbling 30Hz
    base_freq = 30 + 270 * np.exp(-t * 3)
    
    # Add a low-frequency oscillator (LFO) for a 'wobble' effect
    lfo = np.sin(2 * np.pi * 15 * t) * 10 # 15Hz wobble
    
    # Calculate final phase
    phase = np.cumsum(base_freq + lfo) / SAMPLE_RATE * 2 * np.pi
    
    # Generate pure sine wave for deep bass
    wave = np.sin(phase)
    
    # Envelope fades out slowly
    final_wave = apply_envelope(wave, duration, attack=0.1, decay=duration*0.8)
    return final_wave

def save_wav(filename, audio_data):
    """Normalizes the audio and saves it as a 16-bit WAV file."""
    # Normalize to -1.0 to 1.0
    audio_data = audio_data / np.max(np.abs(audio_data))
    # Convert to 16-bit PCM
    audio_16bit = np.int16(audio_data * 32767)
    wav.write(filename, SAMPLE_RATE, audio_16bit)
    print(f"Generated high-quality audio: {filename}")

if __name__ == "__main__":
    # Create an output directory if it doesn't exist
    if not os.path.exists("public/assets"):
        os.makedirs("public/assets")
        
    # Generate and save the files
    save_wav("public/assets/laser.wav", generate_laser())
    save_wav("public/assets/explosion.wav", generate_explosion())
    save_wav("public/assets/time_slow.wav", generate_time_dilation())
