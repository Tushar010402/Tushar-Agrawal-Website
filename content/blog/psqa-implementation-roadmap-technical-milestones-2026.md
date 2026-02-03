---
title: "PSQA Implementation Roadmap: Technical Milestones and First Steps"
description: "A detailed technical roadmap for implementing the Phonon-mediated Silicon Carbide Quantum Architecture, from first experiments to million-qubit systems."
date: "2026-02-04"
author: "Tushar Agrawal"
tags: ["Quantum Computing", "PSQA", "Implementation", "Technical Roadmap", "Silicon Carbide", "Research Plan", "Startup Guide", "Technology 2026"]
image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop"
published: true
---

# PSQA Implementation Roadmap

## From First Experiment to Million Qubits

This document provides a detailed technical roadmap for implementing PSQA (Phonon-mediated Silicon Carbide Quantum Architecture). Unlike high-level business plans, this focuses on the actual experiments, equipment, and milestones needed to build a room-temperature quantum computer.

---

## Phase 1: Foundation Experiments (Months 1-18)

### 1.1 Initial Lab Setup

```
MINIMUM VIABLE QUANTUM LAB
═══════════════════════════════════════════════════════════════════════════════

Equipment List (Total: ~$500k-1M for Phase 1):

OPTICAL TABLE & ISOLATION
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ Optical Table             │ 4' × 8' × 12" granite   │ $15,000  │ Newport  │
│ Vibration Isolation Legs  │ Pneumatic, <1 Hz        │ $8,000   │ Newport  │
│ Laser Enclosure           │ Class 4 compliant       │ $5,000   │ Thorlabs │
│ Climate Control           │ ±0.5°C, <40% RH         │ $10,000  │ Various  │
└───────────────────────────────────────────────────────────────────────────┘

LASER SYSTEM
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ Excitation Laser          │ 730 nm, tunable ±5nm    │ $40,000  │ Toptica  │
│                           │ CW, 100 mW, <1 MHz lw   │          │          │
│ Repump Laser              │ 905 nm, 50 mW           │ $15,000  │ Thorlabs │
│ AOM (2×)                  │ 200 MHz, <20 ns switch  │ $8,000   │ AA Opto  │
│ Wavelength Meter          │ ±2 pm accuracy          │ $20,000  │ Bristol  │
└───────────────────────────────────────────────────────────────────────────┘

DETECTION SYSTEM
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ Single Photon Detector    │ SNSPD or APD, >70% QE   │ $50,000  │ ID Quant │
│ Time Tagger               │ <50 ps resolution       │ $15,000  │ Swabian  │
│ Spectrometer              │ 850-950 nm, 0.01 nm res │ $25,000  │ Princeton│
│ CCD Camera                │ Scientific grade        │ $10,000  │ Andor    │
└───────────────────────────────────────────────────────────────────────────┘

MICROSCOPY
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ Confocal Microscope Head  │ Home-built or Attocube  │ $50,000  │ Custom   │
│ Objective (2×)            │ 100×, NA 0.9, NIR       │ $6,000   │ Olympus  │
│ XYZ Piezo Stage           │ 100 μm range, 1 nm res  │ $15,000  │ PI       │
│ Coarse Positioner         │ 10 mm range             │ $5,000   │ Newport  │
└───────────────────────────────────────────────────────────────────────────┘

MICROWAVE SYSTEM
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ Signal Generator          │ DC-6 GHz, <1 Hz phase   │ $30,000  │ R&S      │
│ IQ Modulator              │ DC-6 GHz, >30 dB        │ $5,000   │ Marki    │
│ RF Amplifier              │ 30 dB, 1-6 GHz          │ $3,000   │ Mini-Cir │
│ MW Switch                 │ <10 ns, 50 dB isolation │ $2,000   │ Mini-Cir │
│ AWG                       │ 1 GS/s, 14-bit          │ $40,000  │ Keysight │
└───────────────────────────────────────────────────────────────────────────┘

CONTROL ELECTRONICS
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ FPGA (Timing Control)     │ Artix-7 or better       │ $3,000   │ Xilinx   │
│ DAC Card                  │ 16-bit, 8 channels      │ $5,000   │ NI       │
│ ADC Card                  │ 16-bit, 4 channels      │ $5,000   │ NI       │
│ Digital I/O               │ 32 channels, 100 MHz    │ $2,000   │ NI       │
└───────────────────────────────────────────────────────────────────────────┘

SAMPLES & MATERIALS
─────────────────────────────────────────────────────────────────────────────
│ Item                      │ Specification           │ Cost     │ Vendor   │
├───────────────────────────┼─────────────────────────┼──────────┼──────────┤
│ 4H-SiC Wafers (10×)       │ n-type, 6° off-axis     │ $5,000   │ Cree     │
│ Isotopically Pure SiC     │ >99.9% ²⁸Si, ¹²C       │ $20,000  │ IsoFlex  │
│ Sample Holders            │ Custom machined         │ $2,000   │ Local    │
│ Permanent Magnets         │ NdFeB, various sizes    │ $500     │ K&J      │
│ 3-axis Helmholtz Coils    │ ±100 G, <0.01 G res    │ $5,000   │ Custom   │
└───────────────────────────────────────────────────────────────────────────┘

TOTAL PHASE 1 EQUIPMENT: ~$450,000 - $600,000
```

### 1.2 First Experiments: Single V_Si Characterization

```
EXPERIMENT 1: FIND AND CHARACTERIZE SINGLE V_Si DEFECTS
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 1-6

Objective: Locate individual V_Si defects and measure their basic properties

Setup Diagram:
─────────────

         ┌─────────────────────────────────────────────────────────────────┐
         │                        CONFOCAL MICROSCOPE                      │
         │                                                                 │
         │     Laser (730 nm) ─────┐                                      │
         │                         ▼                                      │
         │                   ┌───────────┐                                │
         │                   │   AOM     │ ◄── TTL from FPGA              │
         │                   └─────┬─────┘                                │
         │                         │                                      │
         │                         ▼                                      │
         │                   ┌───────────┐                                │
         │                   │ Dichroic  │────────────► Filter + Detector │
         │                   │  (800nm)  │   (emission)                   │
         │                   └─────┬─────┘                                │
         │                         │                                      │
         │                         ▼                                      │
         │                   ┌───────────┐                                │
         │                   │ Objective │                                │
         │                   │   100×    │                                │
         │                   └─────┬─────┘                                │
         │                         │                                      │
         │                         ▼                                      │
         │                   ╔═══════════╗                                │
         │                   ║  4H-SiC   ║ on XYZ piezo stage            │
         │                   ║  Sample   ║                                │
         │                   ╚═══════════╝                                │
         │                                                                 │
         └─────────────────────────────────────────────────────────────────┘


Experimental Protocol:
──────────────────────

Step 1: Sample Preparation
├── Start with commercial 4H-SiC wafer (as-grown V_Si density ~10¹⁴/cm³)
├── Cleave to 5×5 mm pieces
├── Clean: Acetone → IPA → Piranha → DI water
└── Mount on sample holder with silver paint (thermal contact)

Step 2: Coarse Scan (Locating Emission)
├── Excitation: 730 nm, 100 μW (below saturation)
├── Scan area: 50 μm × 50 μm
├── Pixel dwell: 10 ms
├── Detection: >850 nm bandpass, count rate
└── Expected: Bright spots from V_Si ensembles

Step 3: Fine Scan (Single Defect Isolation)
├── Zoom to low-density region
├── Scan area: 5 μm × 5 μm
├── Look for isolated spots with count rate ~10-50 kcps
└── Verify single emitter via antibunching (g²(0) < 0.5)

Step 4: Photon Correlation (Single Emitter Proof)
├── Set laser on single spot
├── Split emission 50/50 to two detectors
├── Record coincidences vs delay time τ
├── Fit g²(τ) = 1 - a·exp(-|τ|/τ_life)
└── SUCCESS if g²(0) < 0.5 (proves single emitter!)


Expected Results:
─────────────────

   ┌────────────────────────────────────────────────────────────────────┐
   │  CONFOCAL SCAN                 │  ANTIBUNCHING (Single V_Si)      │
   │                                │                                  │
   │      ·   ·       ·  ·          │  g²(τ)                          │
   │        ·                       │    ↑                             │
   │   ·        ·  ●                │  1 │  ────────────────────      │
   │              ◄─single!         │    │         ╱     ╲            │
   │      ·    ·        ·           │    │        ╱       ╲           │
   │                                │  0 │───────●─────────────►τ     │
   │         ·     ·                │    │    g²(0)<0.5               │
   │                                │    └──────────────────────       │
   └────────────────────────────────────────────────────────────────────┘


Milestone 1.2 Success Criteria:
───────────────────────────────
□ Locate >10 single V_Si defects
□ Measure g²(0) < 0.3 for isolated defects
□ Determine optical lifetime τ = 5-7 ns
□ Measure saturation count rate > 50 kcps
□ Identify V1 vs V2 line via spectroscopy
```

### 1.3 Spin Readout Experiments

```
EXPERIMENT 2: OPTICALLY DETECTED MAGNETIC RESONANCE (ODMR)
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 4-9

Objective: Detect and control V_Si electron spin via optical methods

Additional Equipment Needed:
────────────────────────────
- Microwave antenna (PCB loop, ~2mm diameter)
- Permanent magnet on 3-axis mount
- RF amplifier connected to signal generator

ODMR Principle:
───────────────

   When microwave frequency matches spin transition:

   OFF-RESONANCE                    ON-RESONANCE (MW = ω₀)
   ─────────────                    ─────────────────────

   Optical excitation               Optical excitation
        │                                │
        ▼                                ▼
   ┌─────────┐                     ┌─────────┐
   │ Excited │                     │ Excited │
   └────┬────┘                     └────┬────┘
        │                                │
        │ Fluorescence                   │ Less fluorescence!
        │ (bright)                       │ (dark)
        ▼                                ▼
   ┌─────────┐                     ┌─────────┐
   │ ms = ±½ │ ─────MW───────►    │ ms = ±³⁄₂│
   └─────────┘                     └─────────┘

   The ±³⁄₂ state has lower fluorescence rate!
   This contrast lets us detect spin state.


ODMR Protocol:
──────────────

   Time sequence:

   Laser:     ████████████████████████████████████████████████████████
              (Continuous illumination during scan)

   Microwave: ░░░░░░░░█████░░░░░░░░█████░░░░░░░░█████░░░░░░░░█████░░░░
              (Frequency stepped each cycle)

   Detection: Count photons at each MW frequency
              Plot: counts vs MW frequency


Expected ODMR Spectrum:
───────────────────────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  Fluorescence                                                        │
   │  (counts)                                                            │
   │      ↑                                                               │
   │      │  ────────────────────────────────────────                    │
   │ 100% │                                                               │
   │      │                                                               │
   │      │                 ╲              ╱                              │
   │      │                  ╲            ╱                               │
   │  95% │                   ╲──────────╱                                │
   │      │                        ↑                                      │
   │      │                   Zero-field                                  │
   │      │                   splitting                                   │
   │      │                   2D ≈ 70 MHz                                 │
   │      │                                                               │
   │      └──────────────────────────────────────────────────────►       │
   │        0             35 MHz        70 MHz        105 MHz             │
   │                      MW Frequency (at B=0)                           │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   With magnetic field (B ≠ 0), the dip splits due to Zeeman effect:

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  Fluorescence                                                        │
   │      ↑                                                               │
   │      │  ──────────────────────────────────────────────              │
   │ 100% │                                                               │
   │      │         ╲            ╱╲            ╱                         │
   │      │          ╲──────────╱  ╲──────────╱                          │
   │  95% │               ↑              ↑                                │
   │      │         ω₀ - γB        ω₀ + γB                               │
   │      │                                                               │
   │      └──────────────────────────────────────────────────────►       │
   │                      MW Frequency                                    │
   │                                                                      │
   │   Splitting = 2γB where γ = 28 MHz/mT (electron gyromagnetic ratio) │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Milestone 1.3 Success Criteria:
───────────────────────────────
□ Observe ODMR contrast > 3% on single V_Si
□ Measure zero-field splitting 2D = 70 ± 2 MHz
□ Demonstrate Zeeman splitting with applied B field
□ Achieve ODMR linewidth < 5 MHz (indicates good coherence)
□ Map multiple V_Si defects, verify consistent properties
```

### 1.4 Coherent Spin Control

```
EXPERIMENT 3: RABI OSCILLATIONS AND COHERENCE MEASUREMENT
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 7-12

Objective: Demonstrate coherent control of single V_Si spin

Pulsed ODMR Setup:
──────────────────

   The key is precise timing between laser, microwave, and detection:

   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                                                         │
   │     FPGA ───────┬───────────────┬───────────────┬───────────────       │
   │                 │               │               │                       │
   │                 ▼               ▼               ▼                       │
   │            ┌────────┐     ┌────────┐     ┌────────┐                    │
   │            │ Laser  │     │   MW   │     │ Photon │                    │
   │            │  AOM   │     │ Switch │     │Counter │                    │
   │            └────────┘     └────────┘     │ Gate   │                    │
   │                                          └────────┘                    │
   │                                                                         │
   │   Timing precision required: < 10 ns                                   │
   │   Typical pulse lengths: 100 ns - 10 μs                                │
   │                                                                         │
   └─────────────────────────────────────────────────────────────────────────┘


Rabi Oscillation Protocol:
──────────────────────────

   Pulse sequence:

   Time:      |←─ Init ─→|←── MW pulse ──→|←─ Readout ─→|

   Laser:     ██████████████░░░░░░░░░░░░░░░██████████████
              |   1 μs    |   (laser off)  |   300 ns   |

   Microwave: ░░░░░░░░░░░░░███████████████░░░░░░░░░░░░░░░
              |            |  variable τ   |             |

   Detection: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████████████
              |                             | count here |


   Repeat for different τ (MW pulse duration):

   τ = 0        ───►  100% in |0⟩  (bright)
   τ = τ_π/2   ───►  50% |0⟩ + 50% |1⟩  (intermediate)
   τ = τ_π     ───►  100% in |1⟩  (dark)
   τ = τ_3π/2  ───►  50% |0⟩ + 50% |1⟩  (intermediate)
   τ = τ_2π    ───►  100% in |0⟩  (bright again!)


Expected Rabi Oscillations:
───────────────────────────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  Population                                                          │
   │  in |0⟩                                                              │
   │      ↑                                                               │
   │      │  ●                                                            │
   │ 100% │   ╲        ╱╲        ╱╲        ╱╲                            │
   │      │    ╲      ╱  ╲      ╱  ╲      ╱  ╲                           │
   │      │     ╲    ╱    ╲    ╱    ╲    ╱    ╲                          │
   │  50% │------●--●------●--●------●--●------●---                      │
   │      │       ╲╱        ╲╱        ╲╱        ╲╱                        │
   │      │        ●          ●         ●         ●                       │
   │   0% │                                                               │
   │      └──────────────────────────────────────────────────────►       │
   │        0    τ_π   2τ_π   3τ_π   4τ_π   5τ_π   6τ_π                  │
   │                  MW Pulse Duration                                   │
   │                                                                      │
   │   Rabi frequency Ω = γB₁ where B₁ is MW field amplitude             │
   │   Typical Ω ~ 10-50 MHz → τ_π ~ 10-50 ns                            │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Ramsey Experiment (T2* Measurement):
────────────────────────────────────

   Pulse sequence:

   Time:      |←Init→|←π/2→|←── Free evolution τ ──→|←π/2→|←Readout→|

   Laser:     ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████████
   Microwave: ░░░░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█░░░░░░░░░░░░░
              |        |                               |            |
              |       π/2                             π/2           |


   Expected decay (T2*):

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  Signal                                                              │
   │  (contrast)                                                          │
   │      ↑                                                               │
   │      │ ●                                                             │
   │ 100% │  ●                                                            │
   │      │   ●                                                           │
   │      │    ●●                                                         │
   │  50% │      ●●●                                                      │
   │      │         ●●●●●                                                 │
   │      │               ●●●●●●●●●●●●●●●●●●●●●●                         │
   │   0% │                                                               │
   │      └──────────────────────────────────────────────────────►       │
   │        0      T2*     2T2*    3T2*    4T2*    5T2*                  │
   │                  Free Evolution Time τ                               │
   │                                                                      │
   │   Typical T2* ~ 10-50 μs for V_Si in natural abundance SiC          │
   │   With isotopic purification: T2* ~ 100-500 μs                       │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Milestone 1.4 Success Criteria:
───────────────────────────────
□ Observe Rabi oscillations with > 5 periods visible
□ Achieve π pulse fidelity > 95%
□ Measure T2* > 10 μs at room temperature
□ Demonstrate Hahn echo, measure T2 > 100 μs
□ Implement basic dynamical decoupling, extend to T2 > 500 μs
```

---

## Phase 2: Phononic Coupling (Months 18-36)

### 2.1 Phononic Crystal Fabrication

```
PHONONIC CRYSTAL DESIGN AND FABRICATION
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 12-24

Design Parameters:
──────────────────

   Target phonon frequency: ω_ph ~ 1-5 GHz (matches typical MW transitions)

   For SiC (speed of sound v ~ 13,000 m/s):
   Wavelength λ = v/f = 13,000 / 5×10⁹ = 2.6 μm at 5 GHz

   Phononic crystal parameters:
   - Lattice constant a ~ λ/2 ~ 1.3 μm
   - Hole diameter d ~ 0.6a ~ 0.8 μm
   - Slab thickness t ~ 0.5a ~ 0.65 μm


Design Layout:
──────────────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   PHONONIC CRYSTAL UNIT CELL           CAVITY DESIGN                │
   │                                                                      │
   │        ┌─────┐                    ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○          │
   │        │     │                    ○ ○ ○ ○ ○     ○ ○ ○ ○ ○          │
   │    a   │  ○  │  ← hole           ○ ○ ○ ○     C     ○ ○ ○ ○         │
   │        │ d=  │    diameter        ○ ○ ○ ○ ○     ○ ○ ○ ○ ○          │
   │        │0.6a │                    ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○          │
   │        └─────┘                                                      │
   │                                   C = Cavity (missing holes)         │
   │   a = 1.3 μm                          confines phonons!             │
   │                                                                      │
   │                                                                      │
   │   WAVEGUIDE DESIGN:                                                 │
   │                                                                      │
   │   ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○           │
   │   ○ ○ ○ ○ ○         ○ ○ ○ ○ ○ ○ ○         ○ ○ ○ ○ ○              │
   │   ○ ○ ○ ○     C ═══════════════════ C     ○ ○ ○ ○                  │
   │   ○ ○ ○ ○ ○         ○ ○ ○ ○ ○ ○ ○         ○ ○ ○ ○ ○              │
   │   ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○           │
   │                                                                      │
   │   C = Cavity with V_Si qubit                                        │
   │   ═ = Waveguide (line defect, one row of holes removed)             │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Fabrication Process:
────────────────────

   Step 1: Prepare 4H-SiC-on-Insulator (SiCOI)
   ├── Bond SiC to SiO₂/Si handle wafer (smart-cut or grinding)
   ├── Thin to target thickness t ~ 650 nm
   └── CMP to <1 nm RMS roughness

   Step 2: E-beam Lithography
   ├── Spin PMMA resist (200 nm)
   ├── E-beam write pattern (dose ~1500 μC/cm²)
   ├── Develop in MIBK:IPA (1:3)
   └── Inspect with SEM

   Step 3: Dry Etch
   ├── ICP-RIE with SF₆/O₂ chemistry
   ├── Etch rate ~100 nm/min
   ├── Selectivity to PMMA >5:1
   └── Vertical sidewalls critical!

   Step 4: Undercut Release
   ├── HF vapor etch to remove buried oxide
   ├── Creates suspended membrane
   └── Critical point dry to avoid stiction

   Step 5: V_Si Creation (FIB or Laser)
   ├── Use He⁺ FIB for single-defect precision
   ├── Implant C⁺ at cavity centers
   ├── Anneal at 900°C, 30 min, Ar ambient
   └── PL scan to verify V_Si location


Equipment Required:
───────────────────

│ Equipment              │ Specification           │ Access         │
├────────────────────────┼─────────────────────────┼────────────────┤
│ E-beam Lithography     │ <10 nm resolution       │ Shared fab     │
│ ICP-RIE                │ SiC capability          │ Shared fab     │
│ Focused Ion Beam       │ He⁺ or Ga⁺, <10 nm     │ Shared fab     │
│ SEM                    │ <5 nm resolution        │ Shared fab     │
│ AFM                    │ <1 nm Z resolution      │ In-house       │

Estimated fab cost per wafer: $5,000-10,000
Typical yield: 10-50% (improving with process optimization)
```

### 2.2 Phonon-Spin Coupling Measurement

```
EXPERIMENT 4: MEASURING SPIN-PHONON COUPLING
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 20-30

Objective: Quantify coupling strength between V_Si spin and phononic mode

Measurement Approach:
─────────────────────

   The spin-phonon coupling appears as a frequency shift in ODMR when
   the phononic cavity is driven:

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   EXPERIMENTAL SETUP:                                               │
   │                                                                      │
   │     ┌───────────────────────────────────────────────────────────┐   │
   │     │           4H-SiC Chip with Phononic Crystal               │   │
   │     │                                                           │   │
   │     │   ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○          │   │
   │     │   ○ ○ ○ ○ ○     ○ ○ ○ ○ ○ ○ ○ ○ ○ ○     ○ ○ ○          │   │
   │     │   ○ ○ ○ ○   ●   ○ ○ ○ ○ ○ ○ ○ ○ ○   ●   ○ ○ ○          │   │
   │     │   ○ ○ ○ ○ ○     ○ ○ ○ ○ ○ ○ ○ ○ ○ ○     ○ ○ ○          │   │
   │     │   ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○          │   │
   │     │           ↑                       ↑                       │   │
   │     │        V_Si 1                  V_Si 2                     │   │
   │     │                                                           │   │
   │     │   ──────────────────────────────────────────────────     │   │
   │     │           ↑ Piezo transducer (drives phonons)             │   │
   │     │                                                           │   │
   │     └───────────────────────────────────────────────────────────┘   │
   │                                                                      │
   │     Optical access from top (confocal microscope)                   │
   │     Microwave antenna nearby (for spin control)                     │
   │     Piezo transducer at chip edge (for phonon injection)           │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Measurement Protocol:
─────────────────────

   Method 1: AC Stark Shift

   1. Drive phononic cavity at frequency ω_cav with amplitude n_ph
   2. Measure ODMR while cavity is driven
   3. Observe frequency shift: Δω = g²n_ph/Δ

   Where:
   - g = single-phonon coupling strength (our target parameter)
   - n_ph = phonon number
   - Δ = detuning between spin and phonon

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   ODMR WITH PHONON DRIVE:                                           │
   │                                                                      │
   │   Fluorescence                                                       │
   │       ↑                                                              │
   │       │  ────────────────────────────────────────                   │
   │  100% │                                                              │
   │       │                                                              │
   │       │      No drive    │  With drive                              │
   │       │         ╲        │        ╲                                 │
   │   95% │          ╲───────│─────────╲───────                         │
   │       │                  │      ↑                                   │
   │       │                  │  Frequency shift Δω                      │
   │       │                  │                                          │
   │       └─────────────────────────────────────────────►               │
   │                    MW Frequency                                      │
   │                                                                      │
   │   From shift magnitude: g = √(Δω · Δ / n_ph)                        │
   │   Expected: g/2π ~ 10-100 kHz for V_Si in phononic cavity          │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


   Method 2: Phonon-Mediated Rabi Oscillations

   If spin transition is resonant with phonon mode (ω_spin = ω_cav):
   - Spin ↔ Phonon exchange occurs at rate g
   - Vacuum Rabi splitting visible in spectroscopy

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   AVOIDED CROSSING (Strong Coupling Regime):                        │
   │                                                                      │
   │   Spin transition                                                    │
   │   frequency                                                          │
   │       ↑                                                              │
   │       │                 ╱                                           │
   │       │               ╱                                             │
   │       │             ╱    ← Upper polariton                          │
   │       │           ●                                                 │
   │       │         ╱    ╲   2g = vacuum Rabi splitting                │
   │       │       ╱        ●                                            │
   │       │     ╱            ╲  ← Lower polariton                       │
   │       │   ╱                ╲                                        │
   │       │ ╱                    ╲                                      │
   │       └──────────────────────────────────────────►                  │
   │                    Phonon cavity frequency                          │
   │                    (tuned via strain/temp)                          │
   │                                                                      │
   │   Splitting 2g/2π ~ 20-200 kHz proves strong coupling!             │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Milestone 2.2 Success Criteria:
───────────────────────────────
□ Fabricate phononic crystal with Q > 10⁵ at GHz frequency
□ Measure phonon-induced ODMR shift
□ Extract coupling g/2π > 10 kHz
□ Demonstrate strong coupling regime (g > κ, γ)
□ Show phonon-mediated spin manipulation
```

### 2.3 Two-Qubit Gate via Phonon Exchange

```
EXPERIMENT 5: PHONON-MEDIATED ENTANGLEMENT
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 28-36

Objective: Demonstrate entanglement between two V_Si spins via phonon bus

This is the KEY MILESTONE that validates the PSQA architecture!

Gate Mechanism:
───────────────

   Two qubits coupled to the same phononic mode exchange excitations:

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   EFFECTIVE INTERACTION:                                            │
   │                                                                      │
   │           Qubit 1              Phonon              Qubit 2           │
   │                                                                      │
   │            │0⟩,│1⟩              │n⟩               │0⟩,│1⟩           │
   │               │                  │                   │               │
   │               │       g₁         │         g₂        │               │
   │               └─────────────────┴───────────────────┘               │
   │                                                                      │
   │   If both qubits coupled to same mode with strengths g₁, g₂:        │
   │                                                                      │
   │   H_eff = J (σ₁⁺σ₂⁻ + σ₁⁻σ₂⁺) = J (X₁X₂ + Y₁Y₂) / 2               │
   │                                                                      │
   │   Where J = g₁g₂/Δ (dispersive regime, Δ = detuning)               │
   │                                                                      │
   │   This is an iSWAP-type interaction!                                │
   │                                                                      │
   │   After time τ = π/(2J), get √iSWAP gate                           │
   │   After time τ = π/J, get full iSWAP gate                          │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Experimental Sequence for Bell State:
─────────────────────────────────────

   Prepare |00⟩ ──► Apply H to Q1 ──► Apply √iSWAP ──► Measure both

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   PULSE SEQUENCE:                                                   │
   │                                                                      │
   │   Time:  │←─ Init ─→│←─ H₁ ─→│←── √iSWAP ──→│←─ Readout ─→│        │
   │                                                                      │
   │   Laser: ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░██████████████      │
   │          │ Initialize│                         │ Read both   │      │
   │          │ both to |0⟩                        │              │      │
   │                                                                      │
   │   MW₁:   ░░░░░░░░░░░░██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │
   │          │          │π/2│                                    │      │
   │          │          │   │ Hadamard on Q1                     │      │
   │                                                                      │
   │   Phonon:░░░░░░░░░░░░░░░░███████████████████░░░░░░░░░░░░░░░░░░      │
   │          │              │     Evolution     │                │      │
   │          │              │   t = π/(2J)      │                │      │
   │                                                                      │
   │                                                                      │
   │   STATE EVOLUTION:                                                  │
   │                                                                      │
   │   |00⟩  ──H₁──►  (|0⟩+|1⟩)|0⟩/√2  ──√iSWAP──►  (|00⟩+i|11⟩)/√2   │
   │                                                                      │
   │   This is a Bell state! (maximally entangled)                       │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Bell State Verification:
────────────────────────

   To verify entanglement, measure correlations in multiple bases:

   1. ZZ basis: Measure both qubits, expect perfect correlation
      P(00) + P(11) = 1,  P(01) = P(10) = 0

   2. XX basis: Apply H to both before measurement
      Same correlations in X basis

   3. Calculate Bell state fidelity:
      F = ⟨Ψ|ρ|Ψ⟩ where |Ψ⟩ = (|00⟩+i|11⟩)/√2

   Target: F > 0.9 (proves quantum entanglement!)


   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   EXPECTED RESULTS (CORRELATION HISTOGRAMS):                        │
   │                                                                      │
   │   ZZ Measurement:              XX Measurement:                       │
   │                                                                      │
   │   Counts                       Counts                                │
   │     ↑                            ↑                                   │
   │   █████                        █████                                 │
   │   █████       █████            █████       █████                    │
   │   █████       █████            █████       █████                    │
   │   █████       █████            █████       █████                    │
   │   └─────┴─────┴─────┴────►    └─────┴─────┴─────┴────►              │
   │     00    01    10    11        ++    +-    -+    --               │
   │                                                                      │
   │   Correlated!                  Correlated!                          │
   │   (classical would             (proves quantum                      │
   │    allow this)                  entanglement!)                      │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Milestone 2.3 Success Criteria:
───────────────────────────────
□ Demonstrate controlled √iSWAP gate between two V_Si
□ Gate time < 10 μs
□ Gate fidelity > 90% (via process tomography)
□ Generate Bell state with fidelity > 85%
□ Violate Bell inequality (CHSH > 2)
```

---

## Phase 3: Scaling and Error Correction (Months 36-72)

### 3.1 Multi-Qubit Arrays

```
SCALING TO 100 QUBITS
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 36-48

Architecture Design:
────────────────────

   10×10 array with phononic bus connections:

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║                            │
   │   ●═══●═══●═══●═══●═══●═══●═══●═══●═══●                            │
   │                                                                      │
   │   ● = V_Si qubit in phononic cavity                                 │
   │   ═ = Phononic waveguide (horizontal connections)                   │
   │   ║ = Phononic waveguide (vertical connections)                     │
   │                                                                      │
   │   Qubit spacing: ~20 μm                                             │
   │   Chip size: ~200 μm × 200 μm (excluding I/O)                      │
   │   Total chip: ~1 mm × 1 mm with control electronics                │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Control Infrastructure:
───────────────────────

   For 100 qubits, need efficient multiplexing:

   │ Function           │ Approach                    │ Channel Count │
   ├────────────────────┼─────────────────────────────┼───────────────┤
   │ Optical address    │ Scanning confocal + AOM     │ 1 laser       │
   │ MW control         │ Shared antenna + freq mux   │ 10 frequencies│
   │ Phonon control     │ Shared transducers          │ 10 per chip   │
   │ Readout            │ Scanning + SNSPD array      │ 1-4 detectors │

   Key insight: Don't need individual wiring for each qubit!
   Use frequency and spatial multiplexing.
```

### 3.2 Error Correction Implementation

```
SURFACE CODE ON PSQA
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 48-60

Implementation Strategy:
────────────────────────

   Use 7×7 = 49 physical qubits for distance-3 surface code:

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   SURFACE CODE LAYOUT:                                              │
   │                                                                      │
   │       D ─── Z ─── D ─── Z ─── D ─── Z ─── D                        │
   │       │     │     │     │     │     │     │                        │
   │       X ─── D ─── X ─── D ─── X ─── D ─── X                        │
   │       │     │     │     │     │     │     │                        │
   │       D ─── Z ─── D ─── Z ─── D ─── Z ─── D                        │
   │       │     │     │     │     │     │     │                        │
   │       X ─── D ─── X ─── D ─── X ─── D ─── X                        │
   │       │     │     │     │     │     │     │                        │
   │       D ─── Z ─── D ─── Z ─── D ─── Z ─── D                        │
   │       │     │     │     │     │     │     │                        │
   │       X ─── D ─── X ─── D ─── X ─── D ─── X                        │
   │       │     │     │     │     │     │     │                        │
   │       D ─── Z ─── D ─── Z ─── D ─── Z ─── D                        │
   │                                                                      │
   │   D = Data qubit (25 total)                                         │
   │   Z = Z-type stabilizer qubit (12 total)                           │
   │   X = X-type stabilizer qubit (12 total)                           │
   │                                                                      │
   │   Total: 49 physical qubits = 1 logical qubit (distance 3)         │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Syndrome Extraction Cycle:
──────────────────────────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   TIME STEPS IN ONE SYNDROME CYCLE:                                 │
   │                                                                      │
   │   Step 1: Initialize ancilla (all Z and X) to |0⟩                  │
   │   │                                                                  │
   │   Step 2: Hadamard on all X-ancillas                                │
   │   │                                                                  │
   │   Step 3-6: CNOT pattern (see below)                                │
   │   │                                                                  │
   │   Step 7: Hadamard on all X-ancillas                                │
   │   │                                                                  │
   │   Step 8: Measure all ancillas                                      │
   │                                                                      │
   │                                                                      │
   │   CNOT PATTERN (for Z stabilizer checking DDDD):                   │
   │                                                                      │
   │        D     D                  D     D                             │
   │         ╲   ╱                    ╲   ╱                              │
   │          ╲ ╱                      ╲ ╱                               │
   │           Z          ═══►          Z  (after 4 CNOTs)              │
   │          ╱ ╲                      ╱ ╲                               │
   │         ╱   ╲                    ╱   ╲                              │
   │        D     D                  D     D                             │
   │                                                                      │
   │   Z measures the product Z₁Z₂Z₃Z₄ of its 4 data neighbors          │
   │   If any D flipped: Z measurement flips from +1 to -1              │
   │                                                                      │
   │                                                                      │
   │   CYCLE TIMING:                                                     │
   │   ├── Init: 500 ns                                                  │
   │   ├── Hadamard: 50 ns                                               │
   │   ├── CNOT × 4: 4 × 5 μs = 20 μs                                   │
   │   ├── Hadamard: 50 ns                                               │
   │   └── Measure: 500 ns                                               │
   │                                                                      │
   │   Total cycle: ~25 μs                                               │
   │   Correction rate: 40 kHz                                           │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Error Thresholds:
─────────────────

   For surface code to work:
   - Physical error rate p < 1% (threshold varies by implementation)
   - PSQA target: p ~ 0.1-0.5%

   With p = 0.1% and distance d:
   - d = 3:  Logical error ~10⁻⁴
   - d = 5:  Logical error ~10⁻⁶
   - d = 7:  Logical error ~10⁻⁸
   - d = 15: Logical error ~10⁻¹⁶

   For 1M physical qubits → ~10,000 logical qubits at d=7


Milestone 3.2 Success Criteria:
───────────────────────────────
□ Implement syndrome measurement cycle
□ Achieve cycle fidelity > 99%
□ Demonstrate error detection (inject errors, see syndromes)
□ Show error correction extending logical qubit lifetime
□ Operate continuously for >1000 cycles
```

---

## Phase 4: Million-Qubit System (Months 72-120)

### 4.1 Multi-Chip Optical Interconnect

```
OPTICAL NETWORKING BETWEEN CHIPS
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 60-84

Design:
───────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   CHIP-TO-CHIP ENTANGLEMENT VIA OPTICAL LINK:                       │
   │                                                                      │
   │   ┌─────────────┐                           ┌─────────────┐         │
   │   │   CHIP A    │                           │   CHIP B    │         │
   │   │             │                           │             │         │
   │   │    ●────────┼──── Optical fiber ────────┼────────●    │         │
   │   │   V_Si A    │     (920 nm)              │      V_Si B │         │
   │   │             │                           │             │         │
   │   └─────────────┘                           └─────────────┘         │
   │                                                                      │
   │   Protocol: Barrett-Kok entanglement (heralded)                     │
   │                                                                      │
   │   1. Excite both V_Si with resonant laser                          │
   │   2. Emitted photons collected into fiber                           │
   │   3. Photons interfere at 50/50 beamsplitter                       │
   │   4. Single detector click heralds Bell state |Ψ⁺⟩ or |Ψ⁻⟩        │
   │   5. Local operations correct to |Φ⁺⟩ = (|00⟩+|11⟩)/√2            │
   │                                                                      │
   │                                                                      │
   │   INTERFERENCE SETUP:                                               │
   │                                                                      │
   │        Chip A                                        Chip B          │
   │          │                                             │             │
   │          │  Photon A                       Photon B    │             │
   │          │      │                             │        │             │
   │          │      │         ┌───────┐          │        │             │
   │          │      └────────►│ 50/50 │◄─────────┘        │             │
   │          │                │  BS   │                   │             │
   │          │                └───┬───┘                   │             │
   │          │                    │                       │             │
   │          │              ┌─────┴─────┐                 │             │
   │          │              ▼           ▼                 │             │
   │          │           Det 1       Det 2                │             │
   │          │                                            │             │
   │          │   Click in Det 1 OR Det 2 (not both)      │             │
   │          │   = Successful entanglement!               │             │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Performance Targets:
────────────────────

   │ Parameter            │ Target Value    │ Current State-of-Art │
   ├──────────────────────┼─────────────────┼──────────────────────┤
   │ Photon collection    │ >50%            │ ~30% (SiC waveguides)│
   │ Fiber coupling       │ >90%            │ ~80%                 │
   │ HOM visibility       │ >90%            │ ~70-80%              │
   │ Success probability  │ >1%             │ ~0.1%                │
   │ Entanglement rate    │ >10 kHz         │ ~1 kHz               │
   │ Fidelity             │ >95%            │ ~85%                 │


Milestone 4.1 Success Criteria:
───────────────────────────────
□ Demonstrate chip-to-chip entanglement
□ Heralding success rate > 0.1%
□ Entanglement fidelity > 90%
□ Sustained operation > 1 hour
□ Scale to 3+ chip network
```

### 4.2 Final System Integration

```
1 MILLION QUBIT SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

Timeline: Months 84-120

System Layout:
──────────────

   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   FULL SYSTEM (Room scale: ~10m × 10m)                              │
   │                                                                      │
   │   ┌─────────────────────────────────────────────────────────────┐   │
   │   │                    QUANTUM PROCESSING UNIT                   │   │
   │   │                                                              │   │
   │   │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │   │
   │   │   │Rack 1│ │Rack 2│ │Rack 3│ │Rack 4│ │Rack 5│ │Rack 6│   │   │
   │   │   │100k Q│ │100k Q│ │100k Q│ │100k Q│ │100k Q│ │100k Q│   │   │
   │   │   └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘   │   │
   │   │      │        │        │        │        │        │        │   │
   │   │      └────────┴────────┴────┬───┴────────┴────────┘        │   │
   │   │                             │                               │   │
   │   │                      ┌──────┴──────┐                        │   │
   │   │                      │   OPTICAL   │                        │   │
   │   │                      │   SWITCH    │                        │   │
   │   │                      │ (1024×1024) │                        │   │
   │   │                      └──────┬──────┘                        │   │
   │   │                             │                               │   │
   │   │      ┌────────┬────────┬────┴───┬────────┬────────┐        │   │
   │   │      │        │        │        │        │        │        │   │
   │   │   ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐   │   │
   │   │   │Rack 7│ │Rack 8│ │Rack 9│ │Rck10│ │(more │ │ ...  │   │   │
   │   │   │100k Q│ │100k Q│ │100k Q│ │100k Q│ │racks)│ │      │   │   │
   │   │   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │   │
   │   │                                                              │   │
   │   │   TOTAL: 10 racks × 100,000 qubits = 1,000,000 qubits      │   │
   │   └──────────────────────────────────────────────────────────────┘   │
   │                                                                      │
   │   ┌────────────────────┐      ┌────────────────────┐                │
   │   │   CLASSICAL HPC    │      │   USER INTERFACE   │                │
   │   │   (Decoding &      │◄────►│   (API, Cloud      │                │
   │   │    Control)        │      │    Access)         │                │
   │   └────────────────────┘      └────────────────────┘                │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘


Cost Summary:
─────────────

   │ Category                │ Units    │ Unit Cost │ Total      │
   ├─────────────────────────┼──────────┼───────────┼────────────┤
   │ SiC chips (10k Q each)  │ 100      │ $10k      │ $1M        │
   │ Optical interconnect    │ 1 system │ $5M       │ $5M        │
   │ Control electronics     │ 10 racks │ $1M       │ $10M       │
   │ Classical HPC           │ 1 system │ $10M      │ $10M       │
   │ Facilities              │ 100 m²   │ $5k/m²    │ $0.5M      │
   │ Integration & Testing   │ -        │ -         │ $10M       │
   │ Engineering (5 years)   │ 50 FTEs  │ $200k/yr  │ $50M       │
   ├─────────────────────────┼──────────┼───────────┼────────────┤
   │ TOTAL                   │          │           │ ~$90M      │


   Compare to:
   - IBM Quantum System Two: ~$100M+ (127 qubits!)
   - Google's facility: ~$1B+ (100 qubits)
   - PsiQuantum target: ~$1B (no qubits yet)

   PSQA: $90M for 1,000,000 qubits
   That's <$0.10 per qubit!


Final Milestone Success Criteria:
─────────────────────────────────
□ 1,000,000 physical qubits operational
□ Error-corrected logical qubits: >10,000
□ Fault-tolerant universal gate set
□ Run Shor's algorithm on 100+ bit numbers
□ Demonstrate quantum advantage on practical problem
□ 99.9% uptime over 1 month
```

---

## Risk Mitigation

```
KEY RISKS AND MITIGATIONS
═══════════════════════════════════════════════════════════════════════════════

│ Risk                        │ Probability │ Impact │ Mitigation              │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Phonon coupling too weak    │ Medium      │ High   │ Cavity enhancement,     │
│                             │             │        │ resonant operation      │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ V_Si coherence insufficient │ Low         │ High   │ Isotopic purification,  │
│                             │             │        │ dynamical decoupling    │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Fab yield too low           │ Medium      │ Medium │ Process optimization,   │
│                             │             │        │ defect characterization │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Optical interconnect lossy  │ Low         │ Medium │ Purcell enhancement,    │
│                             │             │        │ better collection       │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Scaling introduces crosstalk│ Medium      │ High   │ Frequency multiplexing, │
│                             │             │        │ shielding               │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Funding gaps                │ High        │ High   │ Milestone-based funding,│
│                             │             │        │ early demos for VCs     │
├─────────────────────────────┼─────────────┼────────┼─────────────────────────┤
│ Competition leapfrogs       │ Medium      │ Medium │ Fast iteration,         │
│                             │             │        │ publish and patent      │


GO/NO-GO DECISION POINTS:
─────────────────────────

Month 18:  Single V_Si control demonstrated?
           ├── YES → Continue to phononic fab
           └── NO  → Reassess V_Si vs other color centers

Month 36:  Phonon-mediated entanglement works?
           ├── YES → Scale to multi-qubit
           └── NO  → Pivot to direct optical coupling

Month 60:  100-qubit chip with error correction?
           ├── YES → Scale to million qubits
           └── NO  → Focus on smaller-scale applications
```

---

## Conclusion

This roadmap provides a concrete path from first experiments to a million-qubit quantum computer. The key milestones are:

1. **Month 18**: Single V_Si qubit control (validates basic physics)
2. **Month 36**: Two-qubit phonon-mediated gate (validates architecture)
3. **Month 60**: 100-qubit chip with error correction (validates scaling)
4. **Month 120**: Million-qubit system (validates practical QC)

Each phase builds on the previous, with clear go/no-go criteria. The total investment required is approximately $100M over 10 years - a fraction of what competitors are spending on less scalable approaches.

The path is challenging but achievable. Let's build it.

---

*Document Version: 1.0*
*Date: February 2026*
*Author: Tushar Agrawal*
