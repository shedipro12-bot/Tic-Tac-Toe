"""Generate original short effects. Run with Python and --ffmpeg /path/to/ffmpeg."""
import argparse
import math
from pathlib import Path
import struct
import subprocess
import tempfile
import wave

RATE = 44100
EFFECTS = {
    "move-v1": [(440, 0.09)],
    "win-v1": [(523.25, 0.12), (659.25, 0.12), (783.99, 0.20)],
    "loss-v1": [(392, 0.16), (329.63, 0.22)],
    "draw-v1": [(440, 0.14), (440, 0.18)],
}


def samples(notes):
    values = []
    for frequency, duration in notes:
        count = round(duration * RATE)
        for index in range(count):
            time = index / RATE
            envelope = min(time / 0.008, 1) * min((duration - time) / 0.03, 1)
            envelope *= math.exp(-3 * time / duration)
            tone = math.sin(2 * math.pi * frequency * time)
            tone += 0.12 * math.sin(4 * math.pi * frequency * time)
            values.append(round(32767 * 0.35 * envelope * tone))
        values.extend([0] * round(0.025 * RATE))
    return struct.pack(f"<{len(values)}h", *values)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", required=True)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "public" / "sounds"
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        for name, notes in EFFECTS.items():
            source = Path(temporary) / f"{name}.wav"
            with wave.open(str(source), "wb") as recording:
                recording.setnchannels(1)
                recording.setsampwidth(2)
                recording.setframerate(RATE)
                recording.writeframes(samples(notes))
            subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                            "-i", str(source), "-codec:a", "libmp3lame", "-b:a", "64k",
                            "-map_metadata", "-1", str(output / f"{name}.mp3")], check=True,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            print(f"Generated {name}.mp3")


if __name__ == "__main__":
    main()
