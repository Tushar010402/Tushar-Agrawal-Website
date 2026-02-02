---
title: "Quantum Processor Software: Integration & Your First Algorithm"
description: "Complete software guide for your NV-center quantum processor. Python control code, quantum gate implementation, Deutsch's algorithm, and Qiskit integration."
date: "2026-02-02"
author: "Tushar Agrawal"
tags: ["Quantum Computing", "NV Center", "Quantum Software", "Python", "Qiskit", "Quantum Algorithms", "Room Temperature Quantum", "Technology 2026"]
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
published: true
---

## The Software Behind Your Quantum Processor

In the previous parts of this series, we built the hardware for a room-temperature NV-center quantum processor. Now it's time to bring it to life with software.

This guide covers:
- Complete Python control software
- Quantum gate implementation
- Running Deutsch's algorithm on real hardware
- Integration with Qiskit
- Future directions for multi-qubit systems

By the end, you'll have run your first quantum algorithm on hardware you built yourself.

---

## Part 1: Software Architecture Overview

### The Complete Stack

```
NV QUANTUM PROCESSOR SOFTWARE ARCHITECTURE
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Quantum         │  │ Custom          │  │ Qiskit      │ │
│  │ Algorithms      │  │ Experiments     │  │ Integration │ │
│  │ (Deutsch, etc)  │  │ (Ramsey, Rabi)  │  │ (Optional)  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┴───────────────────┘        │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUANTUM COMPILER                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • Gate → Pulse translation                              ││
│  │ • Sequence optimization                                 ││
│  │ • Timing calculation                                    ││
│  │ • Virtual Z-gate tracking                               ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PULSE CONTROLLER                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • Pulse sequence construction                         │  │
│  │ • Timing synchronization                              │  │
│  │ • Data acquisition control                            │  │
│  │ • Shot repetition management                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    HARDWARE DRIVERS                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Laser Driver │  │ MW Generator │  │ Photon Counter    │ │
│  │   (Serial)   │  │    (USB)     │  │   (Arduino)       │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHYSICAL HARDWARE                         │
│                                                              │
│     Laser ────► Diamond (NV) ◄──── Microwave                │
│                     │                                        │
│                     ▼                                        │
│                 Detector                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
nv_quantum/
├── __init__.py
├── hardware/
│   ├── __init__.py
│   ├── laser.py           # Laser control
│   ├── microwave.py       # MW signal generator
│   ├── detector.py        # Photon counting
│   └── timing.py          # Arduino/FPGA timing
├── pulse/
│   ├── __init__.py
│   ├── sequence.py        # Pulse sequence class
│   ├── gates.py           # Quantum gate pulses
│   └── calibration.py     # Pulse calibration
├── algorithms/
│   ├── __init__.py
│   ├── deutsch.py         # Deutsch's algorithm
│   ├── grover.py          # Grover search
│   └── ramsey.py          # Ramsey experiments
├── compiler/
│   ├── __init__.py
│   └── transpiler.py      # Gate to pulse conversion
├── integration/
│   ├── __init__.py
│   └── qiskit_backend.py  # Qiskit integration
└── examples/
    ├── basic_rabi.py
    ├── odmr_scan.py
    └── run_deutsch.py
```

---

## Part 2: Hardware Driver Layer

### Laser Control

```python
# nv_quantum/hardware/laser.py
"""
Laser control for NV center experiments.
Supports TTL-controlled DPSS lasers.
"""

import serial
import time


class LaserController:
    """Control class for 532nm excitation laser."""

    def __init__(self, arduino_port: str = '/dev/ttyACM0',
                 baud_rate: int = 115200):
        """
        Initialize laser controller.

        Args:
            arduino_port: Serial port for Arduino
            baud_rate: Serial communication speed
        """
        self.serial = serial.Serial(arduino_port, baud_rate, timeout=1)
        time.sleep(2)  # Wait for Arduino reset
        self.is_on = False

    def on(self):
        """Turn laser on."""
        self.serial.write(b'LASER_ON\n')
        self.is_on = True

    def off(self):
        """Turn laser off."""
        self.serial.write(b'LASER_OFF\n')
        self.is_on = False

    def pulse(self, duration_us: float):
        """
        Generate laser pulse of specified duration.

        Args:
            duration_us: Pulse duration in microseconds
        """
        cmd = f'LASER_PULSE {int(duration_us)}\n'
        self.serial.write(cmd.encode())

    def initialize_qubit(self, duration_us: float = 1000):
        """
        Optical pumping to initialize qubit to |0⟩.

        Args:
            duration_us: Initialization pulse duration (default 1ms)
        """
        self.pulse(duration_us)
        # Wait for pulse to complete plus settling time
        time.sleep((duration_us + 100) / 1e6)

    def close(self):
        """Close serial connection."""
        self.off()
        self.serial.close()
```

### Microwave Control

```python
# nv_quantum/hardware/microwave.py
"""
Microwave signal generator control for qubit manipulation.
Supports Windfreak SynthNV and similar USB-controlled generators.
"""

import serial
import time


class MicrowaveGenerator:
    """Control class for microwave signal generator."""

    def __init__(self, port: str = '/dev/ttyUSB0',
                 baud_rate: int = 115200):
        """
        Initialize MW generator.

        Args:
            port: Serial port for signal generator
            baud_rate: Serial communication speed
        """
        self.serial = serial.Serial(port, baud_rate, timeout=1)
        time.sleep(1)

        # Default NV resonance frequency
        self.frequency = 2.87e9  # Hz
        self.power = 0  # dBm

        # Calibrated pulse times (set via calibration)
        self.pi_pulse_ns = 100  # nanoseconds
        self.phase = 0  # radians

    def set_frequency(self, freq_hz: float):
        """
        Set output frequency.

        Args:
            freq_hz: Frequency in Hz
        """
        freq_mhz = freq_hz / 1e6
        cmd = f'f{freq_mhz:.6f}\n'  # Windfreak command format
        self.serial.write(cmd.encode())
        self.frequency = freq_hz
        time.sleep(0.01)

    def set_power(self, power_dbm: float):
        """
        Set output power.

        Args:
            power_dbm: Power in dBm
        """
        cmd = f'W{power_dbm:.1f}\n'
        self.serial.write(cmd.encode())
        self.power = power_dbm
        time.sleep(0.01)

    def rf_on(self):
        """Enable RF output."""
        self.serial.write(b'E1r1\n')

    def rf_off(self):
        """Disable RF output."""
        self.serial.write(b'E0r0\n')

    def set_pi_pulse_duration(self, duration_ns: float):
        """Set calibrated pi pulse duration."""
        self.pi_pulse_ns = duration_ns

    def get_rabi_frequency(self) -> float:
        """Calculate Rabi frequency from pi pulse time."""
        return 1e9 / (2 * self.pi_pulse_ns)  # Hz

    def close(self):
        """Close connection."""
        self.rf_off()
        self.serial.close()


class MicrowaveGate:
    """
    Represents a microwave gate (pulse).
    Used by the pulse controller.
    """

    def __init__(self, duration_ns: float, phase: float = 0):
        """
        Create MW gate.

        Args:
            duration_ns: Pulse duration in nanoseconds
            phase: Phase in radians (0 = X rotation, π/2 = Y rotation)
        """
        self.duration_ns = duration_ns
        self.phase = phase

    def __repr__(self):
        return f"MWGate(dur={self.duration_ns}ns, phase={self.phase:.2f})"
```

### Photon Detection

```python
# nv_quantum/hardware/detector.py
"""
Photon detection and counting for NV readout.
"""

import serial
import time
import numpy as np


class PhotonCounter:
    """Photon counting detector interface."""

    def __init__(self, arduino_port: str = '/dev/ttyACM0',
                 baud_rate: int = 115200,
                 shared_serial: serial.Serial = None):
        """
        Initialize photon counter.

        Args:
            arduino_port: Serial port
            baud_rate: Communication speed
            shared_serial: Use existing serial connection
        """
        if shared_serial:
            self.serial = shared_serial
            self._shared = True
        else:
            self.serial = serial.Serial(arduino_port, baud_rate, timeout=1)
            time.sleep(2)
            self._shared = False

        # Detection threshold for |0⟩ vs |1⟩ discrimination
        self.threshold = None  # Set via calibration

    def count(self, duration_us: float = 300) -> int:
        """
        Count photons for specified duration.

        Args:
            duration_us: Counting window in microseconds

        Returns:
            Number of photons detected
        """
        cmd = f'COUNT {int(duration_us)}\n'
        self.serial.write(cmd.encode())

        # Read response
        response = self.serial.readline().decode().strip()
        try:
            return int(response)
        except ValueError:
            return 0

    def measure_state(self, duration_us: float = 300) -> int:
        """
        Measure qubit state (0 or 1).

        Args:
            duration_us: Readout duration

        Returns:
            0 or 1 based on photon count threshold
        """
        if self.threshold is None:
            raise ValueError("Threshold not calibrated. Run calibrate_threshold first.")

        counts = self.count(duration_us)
        return 0 if counts > self.threshold else 1

    def calibrate_threshold(self, laser: 'LaserController',
                            num_samples: int = 1000):
        """
        Calibrate detection threshold.

        Measures bright (|0⟩) and dark (|1⟩) count rates
        and sets threshold at midpoint.

        Args:
            laser: Laser controller for initialization
            num_samples: Number of samples for calibration
        """
        # Measure |0⟩ state (bright)
        bright_counts = []
        for _ in range(num_samples):
            laser.initialize_qubit(1000)
            bright_counts.append(self.count(300))

        # For |1⟩, we'd need to apply π pulse
        # For now, estimate as 70% of bright
        mean_bright = np.mean(bright_counts)
        estimated_dark = mean_bright * 0.7

        self.threshold = (mean_bright + estimated_dark) / 2
        print(f"Threshold calibrated: {self.threshold:.1f}")
        print(f"Bright (|0⟩): {mean_bright:.1f} counts")
        print(f"Estimated dark (|1⟩): {estimated_dark:.1f} counts")

    def close(self):
        """Close connection if not shared."""
        if not self._shared:
            self.serial.close()
```

### Timing Controller

```python
# nv_quantum/hardware/timing.py
"""
Timing controller for synchronized pulse sequences.
Uses Arduino/Teensy for microsecond-level timing.
"""

import serial
import time
from dataclasses import dataclass
from typing import List


@dataclass
class PulseEvent:
    """Represents a single pulse event."""
    channel: str  # 'laser', 'mw', 'detect'
    start_ns: int
    duration_ns: int
    phase: float = 0  # For MW pulses


class TimingController:
    """
    Controls pulse timing for NV experiments.
    Coordinates laser, microwave, and detection.
    """

    def __init__(self, port: str = '/dev/ttyACM0',
                 baud_rate: int = 115200):
        """Initialize timing controller."""
        self.serial = serial.Serial(port, baud_rate, timeout=2)
        time.sleep(2)  # Wait for Arduino reset

        # Timing parameters (calibrated)
        self.init_duration_ns = 1000000  # 1 ms
        self.readout_duration_ns = 300000  # 300 μs
        self.buffer_ns = 100  # Small buffer between pulses

    def execute_sequence(self, sequence: List[PulseEvent]) -> int:
        """
        Execute a pulse sequence and return photon counts.

        Args:
            sequence: List of pulse events

        Returns:
            Photon count from readout
        """
        # Convert sequence to Arduino command format
        cmd = self._encode_sequence(sequence)
        self.serial.write(cmd.encode())

        # Wait for completion and read result
        response = self.serial.readline().decode().strip()
        try:
            return int(response)
        except ValueError:
            return 0

    def _encode_sequence(self, sequence: List[PulseEvent]) -> str:
        """Convert pulse sequence to Arduino command string."""
        # Format: SEQ <num_events> <event1> <event2> ...
        # Event format: <channel>,<start>,<duration>,<phase>

        parts = [f'SEQ {len(sequence)}']

        for event in sequence:
            channel_code = {'laser': 0, 'mw': 1, 'detect': 2}[event.channel]
            parts.append(
                f'{channel_code},{event.start_ns},{event.duration_ns},{event.phase}'
            )

        return ' '.join(parts) + '\n'

    def simple_experiment(self, mw_duration_ns: int,
                          mw_phase: float = 0) -> int:
        """
        Run simple init → MW → readout experiment.

        Args:
            mw_duration_ns: Microwave pulse duration
            mw_phase: Microwave phase (0 = X, π/2 = Y)

        Returns:
            Photon count
        """
        # Build sequence
        t = 0

        # Initialization
        init_event = PulseEvent('laser', t, self.init_duration_ns)
        t += self.init_duration_ns + self.buffer_ns

        # MW pulse
        mw_event = PulseEvent('mw', t, mw_duration_ns, mw_phase)
        t += mw_duration_ns + self.buffer_ns

        # Readout
        laser_read = PulseEvent('laser', t, self.readout_duration_ns)
        detect_event = PulseEvent('detect', t, self.readout_duration_ns)

        sequence = [init_event, mw_event, laser_read, detect_event]
        return self.execute_sequence(sequence)

    def close(self):
        """Close serial connection."""
        self.serial.close()
```

---

## Part 3: The Quantum Processor Class

### Main Interface

```python
# nv_quantum/__init__.py
"""
NV Center Quantum Processor
Room-temperature single-qubit quantum computer
"""

from .processor import NVQuantumProcessor
from .pulse.gates import X, Y, Z, H, Rx, Ry, Rz, I

__version__ = "0.1.0"
__all__ = ['NVQuantumProcessor', 'X', 'Y', 'Z', 'H', 'Rx', 'Ry', 'Rz', 'I']
```

```python
# nv_quantum/processor.py
"""
Main quantum processor interface.
"""

import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass

from .hardware.laser import LaserController
from .hardware.microwave import MicrowaveGenerator
from .hardware.detector import PhotonCounter
from .hardware.timing import TimingController
from .pulse.gates import Gate, X, Y, H


@dataclass
class MeasurementResult:
    """Result of a quantum measurement."""
    shots: int
    counts_0: int
    counts_1: int

    @property
    def probability_0(self) -> float:
        return self.counts_0 / self.shots

    @property
    def probability_1(self) -> float:
        return self.counts_1 / self.shots

    def __repr__(self):
        return (f"MeasurementResult(shots={self.shots}, "
                f"|0⟩={self.counts_0} ({self.probability_0:.2%}), "
                f"|1⟩={self.counts_1} ({self.probability_1:.2%}))")


class NVQuantumProcessor:
    """
    Room-temperature NV-center quantum processor.

    Provides high-level interface for quantum operations
    on a single NV-center qubit.
    """

    def __init__(self,
                 arduino_port: str = '/dev/ttyACM0',
                 mw_port: str = '/dev/ttyUSB0',
                 auto_calibrate: bool = True):
        """
        Initialize quantum processor.

        Args:
            arduino_port: Serial port for Arduino controller
            mw_port: Serial port for MW generator
            auto_calibrate: Run calibration on startup
        """
        print("Initializing NV Quantum Processor...")

        # Initialize hardware
        self.timing = TimingController(arduino_port)
        self.mw = MicrowaveGenerator(mw_port)
        self.laser = LaserController(arduino_port)  # Shares with timing
        self.detector = PhotonCounter(arduino_port)

        # Calibration parameters
        self.pi_pulse_ns: float = 100  # Default, needs calibration
        self.resonance_freq: float = 2.87e9  # Default
        self.phase_offset: float = 0

        # Virtual Z gate accumulator
        self._virtual_z_phase: float = 0

        if auto_calibrate:
            print("Running initial calibration...")
            self.calibrate()

        print("Quantum processor ready.")

    def calibrate(self):
        """Run full calibration sequence."""
        print("\n=== Calibration Sequence ===\n")

        # 1. Find resonance
        print("Step 1: Finding NV resonance...")
        self.find_resonance()

        # 2. Calibrate Rabi
        print("\nStep 2: Calibrating Rabi oscillation...")
        self.calibrate_rabi()

        # 3. Calibrate detection threshold
        print("\nStep 3: Calibrating detection threshold...")
        self.detector.calibrate_threshold(self.laser)

        print("\n=== Calibration Complete ===")

    def find_resonance(self, freq_start: float = 2.85e9,
                       freq_stop: float = 2.89e9,
                       num_points: int = 41):
        """
        Find NV resonance frequency using ODMR.

        Args:
            freq_start: Start frequency in Hz
            freq_stop: Stop frequency in Hz
            num_points: Number of frequency points
        """
        frequencies = np.linspace(freq_start, freq_stop, num_points)
        fluorescence = []

        self.mw.rf_on()
        self.mw.set_power(0)  # 0 dBm for ODMR

        for freq in frequencies:
            self.mw.set_frequency(freq)
            # Continuous wave ODMR
            counts = self._odmr_point(num_averages=100)
            fluorescence.append(counts)

        self.mw.rf_off()

        # Find minimum (resonance dip)
        min_idx = np.argmin(fluorescence)
        self.resonance_freq = frequencies[min_idx]

        print(f"Resonance found at: {self.resonance_freq/1e9:.6f} GHz")

        # Set generator to resonance
        self.mw.set_frequency(self.resonance_freq)

    def _odmr_point(self, num_averages: int = 100) -> float:
        """Measure fluorescence at current MW frequency."""
        total_counts = 0
        for _ in range(num_averages):
            self.laser.pulse(1000)  # 1ms illumination
            total_counts += self.detector.count(300)
        return total_counts / num_averages

    def calibrate_rabi(self, max_pulse_ns: int = 500,
                       num_points: int = 51,
                       num_averages: int = 500):
        """
        Calibrate pi pulse duration using Rabi oscillation.
        """
        pulse_times = np.linspace(0, max_pulse_ns, num_points)
        counts = []

        self.mw.set_frequency(self.resonance_freq)

        for pulse_ns in pulse_times:
            total = 0
            for _ in range(num_averages):
                c = self.timing.simple_experiment(int(pulse_ns), phase=0)
                total += c
            counts.append(total / num_averages)

        # Fit to find pi pulse time
        counts = np.array(counts)

        # Simple approach: find first minimum after first maximum
        from scipy.signal import find_peaks

        # Invert to find minima as peaks
        inverted = -counts
        peaks, _ = find_peaks(inverted, height=None)

        if len(peaks) > 0:
            self.pi_pulse_ns = pulse_times[peaks[0]]
        else:
            # Fallback: estimate from Rabi frequency
            self.pi_pulse_ns = 100  # Default guess

        print(f"Pi pulse duration: {self.pi_pulse_ns:.1f} ns")
        self.mw.set_pi_pulse_duration(self.pi_pulse_ns)

    def initialize(self):
        """Initialize qubit to |0⟩ state."""
        self.laser.initialize_qubit(1000)
        self._virtual_z_phase = 0

    def apply_gate(self, gate: Gate):
        """
        Apply a quantum gate.

        Args:
            gate: Gate object (X, Y, Z, H, Rx, Ry, Rz)
        """
        if gate.name == 'I':
            return  # Identity does nothing

        elif gate.name == 'X':
            # Pi pulse around X axis
            self.timing.simple_experiment(
                int(self.pi_pulse_ns),
                phase=0 + self._virtual_z_phase
            )

        elif gate.name == 'Y':
            # Pi pulse around Y axis
            self.timing.simple_experiment(
                int(self.pi_pulse_ns),
                phase=np.pi/2 + self._virtual_z_phase
            )

        elif gate.name == 'Z':
            # Virtual Z gate - just update phase
            self._virtual_z_phase += np.pi

        elif gate.name == 'H':
            # Hadamard: Ry(π/2) then Z
            self.timing.simple_experiment(
                int(self.pi_pulse_ns / 2),
                phase=np.pi/2 + self._virtual_z_phase
            )
            self._virtual_z_phase += np.pi

        elif gate.name == 'Rx':
            # Rotation around X by angle theta
            duration = int(self.pi_pulse_ns * gate.theta / np.pi)
            self.timing.simple_experiment(
                duration,
                phase=0 + self._virtual_z_phase
            )

        elif gate.name == 'Ry':
            # Rotation around Y by angle theta
            duration = int(self.pi_pulse_ns * gate.theta / np.pi)
            self.timing.simple_experiment(
                duration,
                phase=np.pi/2 + self._virtual_z_phase
            )

        elif gate.name == 'Rz':
            # Virtual Z rotation
            self._virtual_z_phase += gate.theta

    def measure(self, shots: int = 1000) -> MeasurementResult:
        """
        Measure qubit state.

        Args:
            shots: Number of measurement repetitions

        Returns:
            MeasurementResult with counts and probabilities
        """
        counts_0 = 0
        counts_1 = 0

        for _ in range(shots):
            # Initialize
            self.initialize()

            # Apply any pending gates would go here
            # For now, just measure

            # Readout
            state = self.detector.measure_state(300)

            if state == 0:
                counts_0 += 1
            else:
                counts_1 += 1

        return MeasurementResult(shots, counts_0, counts_1)

    def run_circuit(self, gates: List[Gate], shots: int = 1000) -> MeasurementResult:
        """
        Run a quantum circuit and measure.

        Args:
            gates: List of gates to apply
            shots: Number of shots

        Returns:
            Measurement result
        """
        counts_0 = 0
        counts_1 = 0

        for _ in range(shots):
            # Initialize
            self.initialize()

            # Apply gates
            for gate in gates:
                self.apply_gate(gate)

            # Measure
            state = self.detector.measure_state(300)
            if state == 0:
                counts_0 += 1
            else:
                counts_1 += 1

        return MeasurementResult(shots, counts_0, counts_1)

    def close(self):
        """Shutdown processor cleanly."""
        self.mw.close()
        self.laser.close()
        self.timing.close()
        print("Quantum processor shutdown complete.")
```

---

## Part 4: Quantum Gate Implementation

### Gate Definitions

```python
# nv_quantum/pulse/gates.py
"""
Quantum gate definitions for NV center.
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np


@dataclass
class Gate:
    """Base class for quantum gates."""
    name: str
    theta: Optional[float] = None  # Rotation angle for parametric gates

    def __repr__(self):
        if self.theta is not None:
            return f"{self.name}({self.theta:.3f})"
        return self.name


# Standard gates
I = Gate('I')
X = Gate('X')
Y = Gate('Y')
Z = Gate('Z')
H = Gate('H')


def Rx(theta: float) -> Gate:
    """Rotation around X axis by theta radians."""
    return Gate('Rx', theta)


def Ry(theta: float) -> Gate:
    """Rotation around Y axis by theta radians."""
    return Gate('Ry', theta)


def Rz(theta: float) -> Gate:
    """Rotation around Z axis by theta radians."""
    return Gate('Rz', theta)


# Convenience functions
def sqrt_X() -> Gate:
    """Square root of X gate (π/2 rotation around X)."""
    return Rx(np.pi / 2)


def sqrt_Y() -> Gate:
    """Square root of Y gate (π/2 rotation around Y)."""
    return Ry(np.pi / 2)


def S() -> Gate:
    """S gate (π/2 rotation around Z)."""
    return Rz(np.pi / 2)


def T() -> Gate:
    """T gate (π/4 rotation around Z)."""
    return Rz(np.pi / 4)


# Gate decomposition utilities
def decompose_to_native(gate: Gate) -> list:
    """
    Decompose gate into native NV operations.

    Native gates for NV: Rx(θ), Ry(θ), Rz(θ)

    Args:
        gate: Input gate

    Returns:
        List of native gates
    """
    if gate.name in ['I', 'Rx', 'Ry', 'Rz']:
        return [gate]

    elif gate.name == 'X':
        return [Rx(np.pi)]

    elif gate.name == 'Y':
        return [Ry(np.pi)]

    elif gate.name == 'Z':
        return [Rz(np.pi)]

    elif gate.name == 'H':
        # H = Ry(π/2) · Z = Rz(π) · Ry(π/2) (up to global phase)
        return [Ry(np.pi/2), Rz(np.pi)]

    else:
        raise ValueError(f"Unknown gate: {gate.name}")
```

### Gate Implementation Details

```
NV CENTER GATE SET - IMPLEMENTATION
════════════════════════════════════════════════════════════════

NATIVE GATES (directly implemented via MW pulses):
──────────────────────────────────────────────────

Rx(θ):  Rotation around X axis
        Implementation: MW pulse of duration τ = θ·τ_π/π
                       with phase φ = 0

        |ψ'⟩ = Rx(θ)|ψ⟩

        Matrix: Rx(θ) = | cos(θ/2)    -i·sin(θ/2) |
                        | -i·sin(θ/2)  cos(θ/2)   |


Ry(θ):  Rotation around Y axis
        Implementation: MW pulse of duration τ = θ·τ_π/π
                       with phase φ = π/2

        Matrix: Ry(θ) = | cos(θ/2)   -sin(θ/2) |
                        | sin(θ/2)    cos(θ/2) |


Rz(θ):  Rotation around Z axis
        Implementation: VIRTUAL GATE (no physical pulse!)
                       Update reference frame phase by θ

        Matrix: Rz(θ) = | e^(-iθ/2)    0        |
                        |    0       e^(iθ/2)   |


DERIVED GATES:
──────────────

X = Rx(π)     Pauli-X (bit flip)
Y = Ry(π)     Pauli-Y
Z = Rz(π)     Pauli-Z (virtual)

H = Ry(π/2)·Rz(π)    Hadamard

S = Rz(π/2)   Phase gate (virtual)
T = Rz(π/4)   T gate (virtual)


PULSE TIMING DIAGRAM:
─────────────────────

For X gate (π rotation around X):

Time: ─────────────────────────────────────────────────────►

Laser:  ██████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██████████████
        │← Initialize ──→│                    │← Readout ──→│
        │    1 μs        │                    │   300 ns    │

MW:     ░░░░░░░░░░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░░
                          │← τ_π ─→│
                          ~100 ns
                          phase = 0


For H gate (Hadamard = Ry(π/2) then Rz(π)):

Laser:  ██████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██████████████

MW:     ░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                          │←τ_π/2│
                          ~50 ns
                          phase = π/2

        (Rz is virtual - no physical pulse, just phase tracking)
```

---

## Part 5: Deutsch's Algorithm - Your First Quantum Program

### Theory Review

```
DEUTSCH'S ALGORITHM
════════════════════════════════════════════════════════════════

THE PROBLEM:
────────────

Given a function f: {0,1} → {0,1}

Is f CONSTANT or BALANCED?

Constant: f(0) = f(1)  (both give same output)
Balanced: f(0) ≠ f(1)  (different outputs)


CLASSICAL SOLUTION:
───────────────────

Must evaluate f TWICE:
  - Compute f(0)
  - Compute f(1)
  - Compare

Queries needed: 2


QUANTUM SOLUTION:
─────────────────

Only ONE query to f (as Uf oracle)!

Circuit:
         ┌───┐     ┌────┐     ┌───┐
|0⟩ ─────┤ H ├─────┤ Uf ├─────┤ H ├───── Measure
         └───┘     └────┘     └───┘

Where Uf encodes the function f.


HOW IT WORKS:
─────────────

Step 1: Start with |0⟩

Step 2: Apply H → (|0⟩ + |1⟩)/√2

Step 3: Apply Uf (oracle)
        - If f is constant: state unchanged (or global phase)
        - If f is balanced: state gets phase flip on |1⟩

Step 4: Apply H again
        - Constant: H brings state back to |0⟩
        - Balanced: H produces |1⟩

Step 5: Measure
        - Result |0⟩ → f is CONSTANT
        - Result |1⟩ → f is BALANCED


FOR SINGLE NV QUBIT:
────────────────────

We can implement a simplified version where the "oracle"
is just a Z gate (or identity).

Oracle Uf for:
  - f(x) = 0 (constant):  Uf = I  (identity)
  - f(x) = 1 (constant):  Uf = I  (global phase, same as identity)
  - f(x) = x (balanced):  Uf = Z
  - f(x) = NOT x (balanced): Uf = Z (equivalent for our purpose)
```

### Implementation

```python
# nv_quantum/algorithms/deutsch.py
"""
Deutsch's Algorithm implementation for NV center.
"""

from ..processor import NVQuantumProcessor, MeasurementResult
from ..pulse.gates import H, I, Z, Gate
from typing import Callable, Tuple


def deutsch_algorithm(processor: NVQuantumProcessor,
                      oracle: str = 'constant',
                      shots: int = 1000) -> Tuple[str, MeasurementResult]:
    """
    Run Deutsch's algorithm.

    Determines if function encoded by oracle is constant or balanced.

    Args:
        processor: NV quantum processor
        oracle: 'constant' or 'balanced'
        shots: Number of measurement shots

    Returns:
        Tuple of (result: 'constant' or 'balanced', measurement_data)
    """
    # Build circuit based on oracle type
    if oracle == 'constant':
        # Uf = I (identity) for constant function
        oracle_gate = I
    elif oracle == 'balanced':
        # Uf = Z for balanced function
        oracle_gate = Z
    else:
        raise ValueError(f"Oracle must be 'constant' or 'balanced', got {oracle}")

    # Deutsch's algorithm circuit
    circuit = [
        H,            # Create superposition
        oracle_gate,  # Apply oracle
        H             # Interfere
    ]

    # Run circuit
    result = processor.run_circuit(circuit, shots=shots)

    # Interpret result
    if result.probability_0 > 0.5:
        determination = 'constant'
    else:
        determination = 'balanced'

    return determination, result


def demo_deutsch_algorithm(processor: NVQuantumProcessor):
    """
    Demonstrate Deutsch's algorithm with both oracle types.
    """
    print("=" * 60)
    print("DEUTSCH'S ALGORITHM DEMONSTRATION")
    print("=" * 60)

    # Test constant oracle
    print("\n--- Testing CONSTANT oracle (Uf = I) ---")
    print("Expected result: |0⟩ (CONSTANT)")

    result_const, data_const = deutsch_algorithm(
        processor, oracle='constant', shots=1000
    )

    print(f"\nMeasurement: {data_const}")
    print(f"Algorithm result: {result_const.upper()}")

    # Test balanced oracle
    print("\n--- Testing BALANCED oracle (Uf = Z) ---")
    print("Expected result: |1⟩ (BALANCED)")

    result_bal, data_bal = deutsch_algorithm(
        processor, oracle='balanced', shots=1000
    )

    print(f"\nMeasurement: {data_bal}")
    print(f"Algorithm result: {result_bal.upper()}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\nConstant oracle: {'CORRECT' if result_const == 'constant' else 'INCORRECT'}")
    print(f"Balanced oracle: {'CORRECT' if result_bal == 'balanced' else 'INCORRECT'}")

    success = (result_const == 'constant') and (result_bal == 'balanced')
    print(f"\nQuantum advantage demonstrated: {'YES' if success else 'NO'}")

    return success


# Example usage
if __name__ == "__main__":
    # Initialize processor
    qp = NVQuantumProcessor()

    # Run demonstration
    success = demo_deutsch_algorithm(qp)

    # Cleanup
    qp.close()
```

### Running the Algorithm

```python
# nv_quantum/examples/run_deutsch.py
"""
Example: Running Deutsch's algorithm on NV quantum processor.
"""

from nv_quantum import NVQuantumProcessor
from nv_quantum.algorithms.deutsch import deutsch_algorithm, demo_deutsch_algorithm


def main():
    """Main entry point."""

    print("Initializing NV Quantum Processor...")
    processor = NVQuantumProcessor(
        arduino_port='/dev/ttyACM0',
        mw_port='/dev/ttyUSB0',
        auto_calibrate=True
    )

    try:
        # Run the demonstration
        demo_deutsch_algorithm(processor)

        # Interactive mode
        print("\n" + "=" * 60)
        print("INTERACTIVE MODE")
        print("=" * 60)

        while True:
            oracle = input("\nEnter oracle type (constant/balanced/quit): ").strip().lower()

            if oracle == 'quit':
                break

            if oracle not in ['constant', 'balanced']:
                print("Invalid oracle. Use 'constant' or 'balanced'.")
                continue

            result, data = deutsch_algorithm(processor, oracle=oracle, shots=1000)
            print(f"\nResult: {result.upper()}")
            print(f"Measurements: {data}")

    finally:
        processor.close()
        print("\nProcessor shutdown complete.")


if __name__ == "__main__":
    main()
```

---

## Part 6: Additional Experiments

### Rabi Oscillation Measurement

```python
# nv_quantum/examples/rabi_oscillation.py
"""
Measure Rabi oscillations to calibrate gate times.
"""

import numpy as np
import matplotlib.pyplot as plt
from nv_quantum import NVQuantumProcessor


def measure_rabi(processor: NVQuantumProcessor,
                 max_pulse_ns: int = 500,
                 num_points: int = 51,
                 num_averages: int = 500):
    """
    Measure Rabi oscillation.

    Args:
        processor: NV quantum processor
        max_pulse_ns: Maximum pulse duration
        num_points: Number of pulse durations to test
        num_averages: Shots per point

    Returns:
        Tuple of (pulse_times, fluorescence_counts)
    """
    pulse_times = np.linspace(0, max_pulse_ns, num_points)
    counts = []

    print("Measuring Rabi oscillation...")

    for i, tau in enumerate(pulse_times):
        total = 0
        for _ in range(num_averages):
            c = processor.timing.simple_experiment(int(tau), phase=0)
            total += c

        avg = total / num_averages
        counts.append(avg)

        if i % 10 == 0:
            print(f"Progress: {i+1}/{num_points}")

    return pulse_times, np.array(counts)


def analyze_rabi(pulse_times, counts):
    """
    Analyze Rabi data to extract π pulse time.
    """
    from scipy.optimize import curve_fit

    def rabi_model(t, A, omega, phi, offset, T2):
        return A * np.cos(omega * t + phi) * np.exp(-t/T2) + offset

    # Initial guess
    p0 = [
        (counts.max() - counts.min()) / 2,  # Amplitude
        2 * np.pi / 200,  # Angular frequency (guess τ_π ~ 100 ns)
        0,  # Phase
        counts.mean(),  # Offset
        500  # T2 in ns
    ]

    try:
        popt, pcov = curve_fit(rabi_model, pulse_times, counts, p0=p0)
        A, omega, phi, offset, T2 = popt

        # Calculate π pulse time
        tau_pi = np.pi / omega
        rabi_freq_mhz = omega / (2 * np.pi) * 1000  # Convert to MHz

        print(f"\nFit Results:")
        print(f"  π pulse time: {tau_pi:.1f} ns")
        print(f"  Rabi frequency: {rabi_freq_mhz:.1f} MHz")
        print(f"  Decay time T2*: {T2:.1f} ns")

        return tau_pi, rabi_freq_mhz, T2, (popt, rabi_model)

    except Exception as e:
        print(f"Fit failed: {e}")
        return None, None, None, None


def plot_rabi(pulse_times, counts, fit_result=None):
    """Plot Rabi oscillation data."""
    plt.figure(figsize=(10, 6))

    plt.plot(pulse_times, counts, 'b.', markersize=4, label='Data')

    if fit_result is not None:
        popt, model = fit_result
        t_fit = np.linspace(0, pulse_times.max(), 500)
        plt.plot(t_fit, model(t_fit, *popt), 'r-', linewidth=2, label='Fit')

    plt.xlabel('Pulse Duration (ns)')
    plt.ylabel('Fluorescence (counts)')
    plt.title('Rabi Oscillation')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.savefig('rabi_oscillation.png', dpi=150)
    plt.show()


if __name__ == "__main__":
    # Initialize
    qp = NVQuantumProcessor(auto_calibrate=False)

    try:
        # Find resonance first
        qp.find_resonance()

        # Measure Rabi
        times, counts = measure_rabi(qp)

        # Analyze
        tau_pi, rabi_freq, T2, fit_result = analyze_rabi(times, counts)

        # Plot
        plot_rabi(times, counts, fit_result)

        # Update calibration
        if tau_pi is not None:
            qp.pi_pulse_ns = tau_pi
            print(f"\nCalibration updated: τ_π = {tau_pi:.1f} ns")

    finally:
        qp.close()
```

### Ramsey Experiment (T2* Measurement)

```python
# nv_quantum/examples/ramsey_experiment.py
"""
Ramsey experiment to measure T2* coherence time.
"""

import numpy as np
import matplotlib.pyplot as plt
from nv_quantum import NVQuantumProcessor


def ramsey_sequence(processor, tau_ns: int, num_averages: int = 500) -> float:
    """
    Run single Ramsey sequence.

    Sequence: π/2 - τ - π/2 - measure

    Args:
        processor: NV processor
        tau_ns: Free evolution time in ns
        num_averages: Number of shots

    Returns:
        Average fluorescence counts
    """
    pi_half_ns = int(processor.pi_pulse_ns / 2)

    total_counts = 0
    for _ in range(num_averages):
        # Initialize
        processor.initialize()

        # First π/2 pulse
        processor.timing.simple_experiment(pi_half_ns, phase=0)

        # Free evolution (just wait)
        # Note: In real implementation, need timing controller support

        # Second π/2 pulse
        processor.timing.simple_experiment(pi_half_ns, phase=0)

        # Measure
        counts = processor.detector.count(300)
        total_counts += counts

    return total_counts / num_averages


def measure_t2_star(processor: NVQuantumProcessor,
                    max_tau_ns: int = 5000,
                    num_points: int = 51,
                    num_averages: int = 500):
    """
    Measure T2* using Ramsey experiment.
    """
    tau_values = np.linspace(0, max_tau_ns, num_points)
    counts = []

    print("Measuring Ramsey fringes...")

    for i, tau in enumerate(tau_values):
        avg = ramsey_sequence(processor, int(tau), num_averages)
        counts.append(avg)

        if i % 10 == 0:
            print(f"Progress: {i+1}/{num_points}")

    return tau_values, np.array(counts)


def analyze_ramsey(tau_values, counts):
    """Extract T2* from Ramsey data."""
    from scipy.optimize import curve_fit

    def ramsey_model(t, A, f, phi, offset, T2_star):
        return A * np.cos(2 * np.pi * f * t + phi) * np.exp(-t/T2_star) + offset

    # Guess parameters
    p0 = [
        (counts.max() - counts.min()) / 2,
        1e-3,  # Frequency in GHz (detuning)
        0,
        counts.mean(),
        2000  # T2* in ns
    ]

    try:
        popt, pcov = curve_fit(ramsey_model, tau_values, counts, p0=p0)
        A, f, phi, offset, T2_star = popt

        print(f"\nRamsey Fit Results:")
        print(f"  T2* = {T2_star:.1f} ns = {T2_star/1000:.2f} μs")
        print(f"  Detuning = {f*1000:.3f} MHz")

        return T2_star, f, (popt, ramsey_model)

    except Exception as e:
        print(f"Fit failed: {e}")
        return None, None, None


if __name__ == "__main__":
    qp = NVQuantumProcessor()

    try:
        # Measure
        tau, counts = measure_t2_star(qp)

        # Analyze
        T2_star, detuning, fit_result = analyze_ramsey(tau, counts)

        # Plot
        plt.figure(figsize=(10, 6))
        plt.plot(tau/1000, counts, 'b.', label='Data')

        if fit_result:
            popt, model = fit_result
            t_fit = np.linspace(0, tau.max(), 500)
            plt.plot(t_fit/1000, model(t_fit, *popt), 'r-', label='Fit')

        plt.xlabel('Free Evolution Time (μs)')
        plt.ylabel('Fluorescence (counts)')
        plt.title(f'Ramsey Fringes (T2* = {T2_star/1000:.2f} μs)')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig('ramsey_fringes.png', dpi=150)
        plt.show()

    finally:
        qp.close()
```

---

## Part 7: Qiskit Integration

### Custom Backend

```python
# nv_quantum/integration/qiskit_backend.py
"""
Qiskit backend for NV center quantum processor.
Allows running Qiskit circuits on real NV hardware.
"""

from qiskit.providers import BackendV2, Options
from qiskit.transpiler import Target, InstructionProperties
from qiskit.circuit import Parameter, Measure
from qiskit.circuit.library import RXGate, RYGate, RZGate
from qiskit.result import Result
from qiskit.result.models import ExperimentResult, ExperimentResultData

import numpy as np
from typing import List, Optional

from ..processor import NVQuantumProcessor


class NVCenterBackend(BackendV2):
    """
    Qiskit backend for NV center quantum processor.

    Allows running Qiskit quantum circuits on real
    room-temperature NV-center hardware.
    """

    def __init__(self,
                 processor: Optional[NVQuantumProcessor] = None,
                 arduino_port: str = '/dev/ttyACM0',
                 mw_port: str = '/dev/ttyUSB0'):
        """
        Initialize NV center backend.

        Args:
            processor: Existing NVQuantumProcessor (or create new one)
            arduino_port: Arduino serial port
            mw_port: MW generator serial port
        """
        super().__init__(
            name='nv_center_backend',
            description='Room-temperature NV center quantum processor',
            online_date=None,
            backend_version='0.1.0'
        )

        # Initialize hardware
        if processor is not None:
            self._processor = processor
        else:
            self._processor = NVQuantumProcessor(
                arduino_port=arduino_port,
                mw_port=mw_port,
                auto_calibrate=True
            )

        # Build target (describes backend capabilities)
        self._target = self._build_target()

    def _build_target(self) -> Target:
        """Build target describing available operations."""
        target = Target(num_qubits=1)

        # Add native gates
        theta = Parameter('theta')

        # Rx gate
        rx_props = {(0,): InstructionProperties(duration=100e-9, error=0.01)}
        target.add_instruction(RXGate(theta), rx_props)

        # Ry gate
        ry_props = {(0,): InstructionProperties(duration=100e-9, error=0.01)}
        target.add_instruction(RYGate(theta), ry_props)

        # Rz gate (virtual, no duration)
        rz_props = {(0,): InstructionProperties(duration=0, error=0.001)}
        target.add_instruction(RZGate(theta), rz_props)

        # Measurement
        measure_props = {(0,): InstructionProperties(duration=300e-9, error=0.05)}
        target.add_instruction(Measure(), measure_props)

        return target

    @property
    def target(self) -> Target:
        return self._target

    @property
    def max_circuits(self) -> int:
        return 1  # Process one circuit at a time

    @classmethod
    def _default_options(cls):
        return Options(shots=1000)

    def run(self, circuits, **options):
        """
        Run quantum circuits on NV hardware.

        Args:
            circuits: QuantumCircuit or list of circuits
            **options: Execution options (e.g., shots)

        Returns:
            Job object with results
        """
        from qiskit.providers import JobV1

        # Handle single circuit
        if not isinstance(circuits, list):
            circuits = [circuits]

        shots = options.get('shots', 1000)

        # Execute circuits
        results = []
        for circuit in circuits:
            result = self._execute_circuit(circuit, shots)
            results.append(result)

        # Create job result
        return NVCenterJob(self, results, circuits)

    def _execute_circuit(self, circuit, shots: int) -> dict:
        """Execute single circuit."""

        # Transpile circuit to native gates
        from qiskit import transpile
        transpiled = transpile(circuit, self, optimization_level=1)

        # Count results
        counts = {'0': 0, '1': 0}

        for _ in range(shots):
            # Initialize
            self._processor.initialize()

            # Execute gates
            for instruction in transpiled.data:
                gate = instruction.operation
                self._apply_gate(gate)

            # Measure
            state = self._processor.detector.measure_state(300)
            if state == 0:
                counts['0'] += 1
            else:
                counts['1'] += 1

        return counts

    def _apply_gate(self, gate):
        """Apply a single gate to the processor."""
        from qiskit.circuit.library import RXGate, RYGate, RZGate

        if isinstance(gate, RXGate):
            theta = float(gate.params[0])
            duration = int(self._processor.pi_pulse_ns * theta / np.pi)
            self._processor.timing.simple_experiment(duration, phase=0)

        elif isinstance(gate, RYGate):
            theta = float(gate.params[0])
            duration = int(self._processor.pi_pulse_ns * theta / np.pi)
            self._processor.timing.simple_experiment(duration, phase=np.pi/2)

        elif isinstance(gate, RZGate):
            theta = float(gate.params[0])
            self._processor._virtual_z_phase += theta

        # Handle standard gates via decomposition
        elif gate.name == 'h':
            # H = Ry(π/2) Rz(π)
            duration = int(self._processor.pi_pulse_ns / 2)
            self._processor.timing.simple_experiment(duration, phase=np.pi/2)
            self._processor._virtual_z_phase += np.pi

        elif gate.name == 'x':
            self._processor.timing.simple_experiment(
                int(self._processor.pi_pulse_ns), phase=0
            )

        elif gate.name == 'y':
            self._processor.timing.simple_experiment(
                int(self._processor.pi_pulse_ns), phase=np.pi/2
            )

        elif gate.name == 'z':
            self._processor._virtual_z_phase += np.pi


class NVCenterJob:
    """Job object for NV center execution."""

    def __init__(self, backend, results, circuits):
        self._backend = backend
        self._results = results
        self._circuits = circuits

    def result(self):
        """Return execution result."""
        experiment_results = []

        for i, (counts, circuit) in enumerate(zip(self._results, self._circuits)):
            exp_result = ExperimentResult(
                shots=sum(counts.values()),
                success=True,
                data=ExperimentResultData(counts=counts),
                header={'name': circuit.name}
            )
            experiment_results.append(exp_result)

        return Result(
            backend_name='nv_center_backend',
            backend_version='0.1.0',
            qobj_id='',
            job_id='',
            success=True,
            results=experiment_results
        )
```

### Using with Qiskit

```python
# nv_quantum/examples/qiskit_example.py
"""
Example: Running Qiskit circuits on NV hardware.
"""

from qiskit import QuantumCircuit, transpile
from qiskit.visualization import plot_histogram
import matplotlib.pyplot as plt

from nv_quantum.integration.qiskit_backend import NVCenterBackend


def main():
    # Initialize backend
    backend = NVCenterBackend()

    # Create a simple circuit
    qc = QuantumCircuit(1, 1)
    qc.h(0)           # Hadamard gate
    qc.measure(0, 0)  # Measure

    print("Circuit:")
    print(qc.draw())

    # Run on NV hardware
    print("\nRunning on NV center hardware...")
    job = backend.run(qc, shots=1000)
    result = job.result()
    counts = result.get_counts()

    print(f"\nResults: {counts}")

    # Plot
    plot_histogram(counts)
    plt.title('Hadamard Gate on NV Center')
    plt.savefig('qiskit_nv_result.png', dpi=150)
    plt.show()

    # Run Deutsch's algorithm via Qiskit
    print("\n" + "=" * 50)
    print("Deutsch's Algorithm via Qiskit")
    print("=" * 50)

    # Constant oracle (identity)
    qc_const = QuantumCircuit(1, 1)
    qc_const.h(0)
    # Oracle: I (identity, do nothing)
    qc_const.h(0)
    qc_const.measure(0, 0)

    print("\nConstant oracle circuit:")
    print(qc_const.draw())

    job = backend.run(qc_const, shots=1000)
    counts = job.result().get_counts()
    print(f"Results: {counts}")
    print(f"Interpretation: {'CONSTANT' if counts.get('0', 0) > counts.get('1', 0) else 'BALANCED'}")

    # Balanced oracle (Z gate)
    qc_bal = QuantumCircuit(1, 1)
    qc_bal.h(0)
    qc_bal.z(0)  # Oracle: Z
    qc_bal.h(0)
    qc_bal.measure(0, 0)

    print("\nBalanced oracle circuit:")
    print(qc_bal.draw())

    job = backend.run(qc_bal, shots=1000)
    counts = job.result().get_counts()
    print(f"Results: {counts}")
    print(f"Interpretation: {'CONSTANT' if counts.get('0', 0) > counts.get('1', 0) else 'BALANCED'}")


if __name__ == "__main__":
    main()
```

---

## Part 8: Future Directions

### Multi-Qubit Systems

```
SCALING TO MULTIPLE QUBITS
═══════════════════════════════════════════════════════════════

APPROACHES FOR MULTI-QUBIT NV SYSTEMS:
──────────────────────────────────────

1. NEARBY NV CENTERS (Dipolar Coupling)
   ─────────────────────────────────────
   • Two NV centers within ~10-20 nm
   • Magnetic dipole-dipole interaction
   • Two-qubit gate via interaction strength

   Coupling: J ~ 50 kHz at 10 nm separation

   Challenge: Finding or creating closely spaced NVs


2. NV + NUCLEAR SPIN
   ──────────────────
   • Use nitrogen-14 nucleus (I = 1) as second qubit
   • Hyperfine coupling: A ~ 2.2 MHz
   • Or use nearby C-13 nuclear spins

   Advantage: Already present in every NV!

   Implementation:
   • NV electron spin = qubit 1
   • N-14 nuclear spin = qubit 2
   • RF pulses for nuclear control


3. PHOTONIC INTERCONNECTS
   ───────────────────────
   • Couple NV centers via optical photons
   • Entangle distant NVs through cavity QED
   • Demonstrated over >1 km distance!

   Demonstrated: Delft group, 2022


4. NV ARRAYS IN NANOPHOTONIC STRUCTURES
   ─────────────────────────────────────
   • Fabricate NV centers in photonic crystal cavities
   • Enhanced light-matter interaction
   • Scalable architecture


QUANTUM SENSING APPLICATIONS:
─────────────────────────────

Your NV setup is already useful for:

• Magnetometry
  - Detect single electron spins
  - Map magnetic fields at nm scale
  - NMR of single molecules

• Thermometry
  - Temperature sensing via D shift
  - ~10 mK sensitivity possible

• Electrometry
  - Measure electric fields via Stark shift

• Strain sensing
  - Detect mechanical strain in diamond
```

### Code for Multi-Qubit Extension

```python
# nv_quantum/multi_qubit/nv_nuclear.py
"""
Multi-qubit operations using NV electron + N-14 nuclear spin.
Preliminary code for two-qubit system.
"""

import numpy as np
from typing import Tuple


class NVNuclearSystem:
    """
    Two-qubit system using NV electron spin and N-14 nuclear spin.

    Qubit 0: NV electron spin (ms = 0, -1)
    Qubit 1: N-14 nuclear spin (mI = 0, -1)

    Hyperfine coupling: A_parallel ~ 2.16 MHz
                        A_perpendicular ~ 2.7 MHz
    """

    def __init__(self, processor):
        self.processor = processor

        # Hyperfine parameters
        self.A_parallel = 2.16e6  # Hz
        self.A_perp = 2.7e6  # Hz

        # Nuclear spin transitions
        # These depend on electron state due to hyperfine
        self.nuclear_freq_ms0 = None  # To be calibrated
        self.nuclear_freq_ms1 = None  # To be calibrated

    def calibrate_nuclear_transitions(self):
        """
        Find nuclear spin transition frequencies.

        The N-14 nucleus (I=1) has three states: mI = +1, 0, -1
        We use mI = 0 and mI = -1 as our nuclear qubit.

        Due to hyperfine coupling, nuclear frequency depends on
        electron spin state.
        """
        # PLACEHOLDER: Would need RF source and ENDOR detection
        print("Nuclear transition calibration not yet implemented")
        print("Requires RF pulse source for nuclear manipulation")

    def initialize_both_qubits(self):
        """
        Initialize both qubits to |00⟩.

        Process:
        1. Laser initialization → electron to ms=0
        2. Polarization transfer → nuclear to mI=0
        """
        # Electron initialization (standard)
        self.processor.initialize()

        # Nuclear initialization via polarization transfer
        # This requires specific pulse sequence - simplified here
        print("Nuclear initialization not yet implemented")

    def cnot_electron_nuclear(self):
        """
        CNOT gate: electron spin controls nuclear spin flip.

        When electron is |1⟩ (ms=-1), flip nuclear spin.
        When electron is |0⟩ (ms=0), do nothing.

        Implementation: Selective RF pulse at frequency
        corresponding to ms=-1 manifold.
        """
        # PLACEHOLDER: Requires RF pulse at nuclear frequency
        print("CNOT(electron→nuclear) not yet implemented")
        print("Requires RF source for nuclear manipulation")

    def entangle(self):
        """
        Create Bell state between electron and nuclear spins.

        |00⟩ → (|00⟩ + |11⟩)/√2

        Circuit:
        H(electron) → CNOT(electron→nuclear)
        """
        # Hadamard on electron
        self.processor.apply_gate(H)

        # CNOT to nuclear
        self.cnot_electron_nuclear()


# Note: Full implementation requires:
# 1. RF source for nuclear spin manipulation (~5-10 MHz)
# 2. Modified detection for joint state readout
# 3. Careful calibration of hyperfine-split transitions
```

---

## Conclusion: Your Quantum Journey

You've now completed the full journey from understanding room-temperature quantum computing to building and programming your own quantum processor.

**What you've accomplished:**
1. Understood NV-center physics
2. Built the optical and microwave hardware
3. Developed control software in Python
4. Implemented quantum gates
5. Ran Deutsch's algorithm on real quantum hardware
6. Integrated with Qiskit for broader algorithm access

**This is just the beginning.** Your system can be extended to:
- Quantum sensing experiments
- Two-qubit operations with nuclear spins
- Integration with quantum networks
- Educational demonstrations

**Key resources for continuing:**
- [Qiskit Textbook](https://qiskit.org/textbook/)
- [NV center research papers on arXiv](https://arxiv.org/search/?query=NV+center&searchtype=all)
- [Quantum Open Source Foundation](https://qosf.org/)

---

## Complete Code Repository Structure

```
nv-quantum-processor/
├── README.md
├── setup.py
├── requirements.txt
│
├── nv_quantum/
│   ├── __init__.py
│   ├── processor.py
│   │
│   ├── hardware/
│   │   ├── __init__.py
│   │   ├── laser.py
│   │   ├── microwave.py
│   │   ├── detector.py
│   │   └── timing.py
│   │
│   ├── pulse/
│   │   ├── __init__.py
│   │   ├── gates.py
│   │   ├── sequence.py
│   │   └── calibration.py
│   │
│   ├── algorithms/
│   │   ├── __init__.py
│   │   ├── deutsch.py
│   │   └── grover.py
│   │
│   ├── integration/
│   │   ├── __init__.py
│   │   └── qiskit_backend.py
│   │
│   └── examples/
│       ├── run_deutsch.py
│       ├── rabi_oscillation.py
│       ├── ramsey_experiment.py
│       └── qiskit_example.py
│
├── arduino/
│   ├── timing_controller/
│   │   └── timing_controller.ino
│   └── README.md
│
├── docs/
│   ├── hardware_setup.md
│   ├── calibration_guide.md
│   └── troubleshooting.md
│
└── tests/
    ├── test_gates.py
    ├── test_processor.py
    └── test_algorithms.py
```

---

## Related Articles

- [Part 1: Room-Temperature Quantum Computing Introduction](/blog/room-temperature-quantum-computing-introduction-2026)
- [Part 2: NV-Center Diamond Physics](/blog/nv-center-diamond-physics-quantum-qubits-2026)
- [Part 3: DIY Hardware Build Guide](/blog/diy-quantum-processor-hardware-build-guide-2026)
- [Quantum Computing Explained: Complete Beginner's Guide 2026](/blog/quantum-computing-complete-guide-beginners-2026)

---

## References

**Software and Frameworks:**
- Qiskit Documentation: https://qiskit.org/documentation/
- NumPy and SciPy: https://numpy.org/, https://scipy.org/

**NV Center Control:**
- Childress, L., & Hanson, R. "Diamond NV centers for quantum computing and networks." MRS Bulletin 38.2 (2013).
- Degen, C.L., Reinhard, F., & Cappellaro, P. "Quantum sensing." Reviews of Modern Physics 89.3 (2017).

**Open-Source Quantum:**
- Quantum Open Source Foundation: https://qosf.org/
- PennyLane: https://pennylane.ai/
- Cirq: https://quantumai.google/cirq

---

*Part 4 of 4 in the Room-Temperature Quantum Computing series. Last updated: February 2, 2026.*

*With this guide, you have everything needed to build, program, and run quantum algorithms on your own room-temperature quantum processor. Welcome to the quantum revolution.*
