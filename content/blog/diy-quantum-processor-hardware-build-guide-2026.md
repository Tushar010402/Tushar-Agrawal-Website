---
title: "DIY Quantum Processor: Complete Hardware Build Guide"
description: "Step-by-step guide to building a room-temperature NV-center quantum processor. Complete bill of materials, optical setup, microwave system, and assembly instructions."
date: "2026-02-02"
author: "Tushar Agrawal"
tags: ["Quantum Computing", "NV Center", "Diamond Quantum", "DIY Quantum", "Quantum Hardware", "Room Temperature Quantum", "Hardware Build", "Technology 2026"]
image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=630&fit=crop"
published: true
---

## From Theory to Reality: Building Your Quantum Processor

In [Part 1](/blog/room-temperature-quantum-computing-introduction-2026), we introduced room-temperature quantum computing. In [Part 2](/blog/nv-center-diamond-physics-quantum-qubits-2026), we explored the physics of NV centers. Now it's time to build the hardware.

This guide provides everything you need to construct a working NV-center quantum processor. We'll cover component selection, optical design, microwave systems, and step-by-step assembly.

**Safety Warning:** This build involves Class 3B lasers that can cause permanent eye damage and RF equipment that requires careful handling. Review all safety sections before proceeding.

---

## Part 1: Complete System Architecture

### High-Level Overview

```
Room-Temperature NV Quantum Processor Architecture
===================================================

┌──────────────────────────────────────────────────────────────┐
│                     CONTROL COMPUTER                          │
│                     (Your Laptop/PC)                          │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Software Layer                                        │  │
│  │  • Python + NumPy + PySerial                          │  │
│  │  • Pulse sequence programming                          │  │
│  │  • Data acquisition and analysis                       │  │
│  │  • Optional: Qiskit integration                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ USB                │ USB                │ USB
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌────────────────────┐
│  Arduino/FPGA │  │   Microwave     │  │   DAQ / Counter    │
│  Timing       │  │   Signal Gen    │  │   (Photon Count)   │
│  Controller   │  │   (2.87 GHz)    │  │                    │
└───────┬───────┘  └────────┬────────┘  └─────────┬──────────┘
        │                    │                    │
        │ TTL                │ SMA                │
        ▼                    ▼                    │
┌───────────────┐  ┌─────────────────┐           │
│    Laser      │  │  RF Amplifier   │           │
│    Driver     │  │   (+30 dB)      │           │
│               │  │                 │           │
└───────┬───────┘  └────────┬────────┘           │
        │                    │                    │
        │                    │ SMA                │
        ▼                    ▼                    │
┌──────────────────────────────────────────────────────────────┐
│                      OPTICAL TABLE                            │
│                                                               │
│   ┌────────┐    ┌──────────┐    ┌────────────────────────┐  │
│   │ GREEN  │───►│ Dichroic │───►│      Objective         │  │
│   │ LASER  │    │  Mirror  │    │       Lens             │  │
│   └────────┘    └────┬─────┘    └───────────┬────────────┘  │
│                      │                      │                │
│                      │ Red                  ▼                │
│                      │ light           ╔═════════╗          │
│                      ▼                 ║ DIAMOND ║◄─── MW   │
│                ┌──────────┐            ║   NV    ║   Antenna │
│                │ Bandpass │            ╚═════════╝          │
│                │  Filter  │                                  │
│                └────┬─────┘                                  │
│                     │                                        │
│                     ▼                                        │
│                ┌──────────┐                                  │
│                │   APD    │─────────────────────────────────┼──►
│                │ Detector │           Photon counts          │
│                └──────────┘                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 2: Complete Bill of Materials

### Optical Components

```
OPTICAL COMPONENTS - DETAILED
═════════════════════════════════════════════════════════════════

EXCITATION LASER
────────────────
Item:           532nm DPSS Laser Module
Power:          50-100 mW
Type:           Continuous Wave (CW)
Beam quality:   TEM00 preferred
Suppliers:      Thorlabs, CNI Laser, LaserLands
Price range:    $200 - $500

Recommended models:
• Thorlabs CPS532 ($350) - Good beam quality
• CNI MGL-III-532 ($200) - Budget option
• Coherent OBIS 532 ($1500) - Research grade

Notes:
• Avoid laser pointers (poor beam quality, unstable power)
• Must be CW, not pulsed
• TTL or analog modulation input helpful


DICHROIC MIRROR
───────────────
Item:           Longpass Dichroic Mirror
Cutoff:         550-575 nm
Size:           25mm diameter recommended
Suppliers:      Thorlabs, Edmund Optics, Semrock
Price range:    $100 - $200

Recommended:
• Thorlabs DMLP550 ($180)
• Edmund 550nm DCLP (#69-899, $120)
• Semrock Di02-R561 ($250) - Best performance

Specifications needed:
• Reflects: 400-545 nm (>95%)
• Transmits: 565-800 nm (>93%)
• 45° angle of incidence


OBJECTIVE LENS
──────────────
Item:           Microscope Objective
Magnification:  20x - 60x
NA:             0.4 - 0.85
Type:           Plan achromat or better
Suppliers:      Olympus, Nikon, Thorlabs, AmScope
Price range:    $100 - $500

Recommended:
• Olympus MPLN20x ($200) - Good balance
• Thorlabs N40X-PF ($300) - Plan fluorite
• AmScope PA40X ($50) - Budget option

Notes:
• Higher NA = better light collection
• Long working distance helpful for MW antenna
• Infinity-corrected preferred


BANDPASS FILTER
───────────────
Item:           Emission Filter
Passband:       650-750 nm (NV fluorescence)
Blocking:       OD 6+ at 532 nm
Size:           25mm diameter
Suppliers:      Thorlabs, Semrock, Chroma
Price range:    $100 - $250

Recommended:
• Semrock FF01-697/75 ($200)
• Thorlabs FBH700-40 ($100)
• Chroma ET700/75m ($180)


PHOTODETECTOR
─────────────
Item:           Avalanche Photodiode (APD) or Si Photodiode
Wavelength:     Sensitive at 650-750 nm
Type:           Single photon counting OR high sensitivity

Option A: APD Module (Research grade)
• Thorlabs APD410A ($600) - APD with preamp
• Excelitas SPCM-AQRH ($2500) - Single photon counting

Option B: Si Photodiode (Budget)
• Thorlabs PDA36A2 ($400) - Amplified photodiode
• Generic Si photodiode + TIA ($50-100) - DIY option

Option C: PMT (Alternative)
• Hamamatsu H10721 ($800)

For beginners: Start with Si photodiode, upgrade later


OPTICAL MOUNTS AND POSTS
────────────────────────
Items needed:
• Optical posts (4-6): 1/2" diameter, 3-6" tall
• Post holders (4-6): Match post diameter
• Mirror mount (1): 45° kinematic
• Lens mount (1): For objective
• Filter holder (1): Slip-in type
• XYZ stage (1): For sample positioning

Thorlabs kit recommendation:
• ESK-P03 Educational Starter Kit ($300)
• Or individual components (~$200-400)


OPTICAL BREADBOARD OR TABLE
───────────────────────────
Option A: Mini breadboard
• Thorlabs MB1218 (12"×18") - $150
• Edmund 56-936 (12"×12") - $100

Option B: Optical table (if available)
• Any 1/4-20 threaded table works

Option C: DIY
• Aluminum plate with drilled/tapped holes


TOTAL OPTICAL COMPONENTS: $900 - $2,500
```

### Microwave Components

```
MICROWAVE COMPONENTS - DETAILED
═══════════════════════════════════════════════════════════════

SIGNAL GENERATOR
────────────────
Item:           RF/Microwave Signal Generator
Frequency:      2.5 - 3.2 GHz (must cover 2.87 GHz)
Output power:   +10 dBm minimum
Control:        USB preferred

Recommended options:

Budget ($300-600):
• Windfreak SynthNV Pro ($500) - 34 MHz to 4.4 GHz
• Signal Hound VSG25A ($400) - 100 kHz to 2.5 GHz
• Analog Devices EVAL-ADF4351 ($150) + Arduino - DIY

Mid-range ($600-1500):
• Windfreak SynthHD Pro ($850) - Dual channel
• Siglent SSG3021X ($700) - 9 kHz to 2.1 GHz
• Note: Siglent only goes to 2.1 GHz, need 3+ GHz model

Research grade ($2000+):
• Rohde & Schwarz SMB100A
• Keysight N5181B

For this project: Windfreak SynthNV Pro recommended


RF AMPLIFIER
────────────
Item:           Power Amplifier
Frequency:      1-4 GHz (must cover 2.87 GHz)
Gain:           +20 to +35 dB
P1dB:           +20 dBm or higher
Connector:      SMA

Recommended:
• Mini-Circuits ZVE-3W-183+ ($450) - +35 dBm P1dB
• Mini-Circuits ZX60-4016E+ ($200) - +20 dBm P1dB
• RF Bay LPA-3 ($100) - Budget option

Notes:
• More power = faster gates (shorter π pulse)
• May need attenuator for fine control
• Heat sink required for high power amps


SMA CABLES AND CONNECTORS
─────────────────────────
Items:
• SMA cables, 1-3 ft ($15 each)
• SMA-SMA adapters ($5 each)
• SMA-BNC adapters (if needed)

Get extras - these fail!


MICROWAVE ANTENNA
─────────────────
Two main options:

Option A: Loop Antenna (Simple)
• 20-24 AWG copper wire
• ~2mm diameter loop
• Impedance: Not 50Ω (lossy but works)
• Position: Near sample surface

Option B: Stripline/CPW (Better)
• FR4 or Rogers PCB
• 50Ω characteristic impedance
• Needs PCB fabrication or careful design
• Better field uniformity

For beginners: Start with loop antenna


TOTAL MICROWAVE COMPONENTS: $650 - $1,500
```

### Diamond Sample and Mounting

```
DIAMOND AND SAMPLE MOUNTING
═══════════════════════════════════════════════════════════════

NV DIAMOND SAMPLE
─────────────────
Type options:

Option A: HPHT Diamond with NV (Recommended for beginners)
• High NV concentration
• Lower cost
• Ensemble measurements
• Suppliers: Element Six, Applied Diamond, Delaware Diamond
• Price: $100-300

Option B: CVD Diamond with single NV
• Lower NV density
• Single NV addressable
• Higher quality
• Price: $300-1000

Option C: Nanodiamond with NV
• Very small particles
• In solution, needs substrate
• Price: $100-200

Specifications to request:
• NV concentration: 1-10 ppm (for ensemble)
• Or: Single NV centers (for single qubit)
• Orientation: (100) or (111) surface
• Polish: Both sides polished preferred
• Size: 2mm × 2mm × 0.5mm typical

Recommended suppliers:
• Element Six (elementix.com)
• Delaware Diamond Knives
• Applied Diamond Inc
• Adámas Nanotechnologies (nanodiamonds)


SAMPLE HOLDER
─────────────
Requirements:
• Non-magnetic (no iron/steel near sample)
• Allows MW antenna close to diamond
• Thermally stable
• Optically accessible from above

Options:
• Custom 3D printed holder ($10-50)
• Modified microscope slide + tape
• Aluminum or brass machined holder
• PCB with diamond bonded on

Design considerations:
• MW antenna integrated or separate
• XYZ positioning needed
• Consider thermal contact for stability


XYZ POSITIONING STAGE
─────────────────────
Requirements:
• ~10 μm resolution (manual OK)
• Non-magnetic materials
• Stable

Options:
• Thorlabs MT1 XYZ stage ($500)
• AmScope microscope stage ($100-200)
• Manual micrometer stages ($100-300)
• DIY with micrometer heads

For beginners: Start with manual stages


TOTAL DIAMOND + MOUNTING: $200 - $800
```

### Control Electronics

```
CONTROL ELECTRONICS - DETAILED
══════════════════════════════════════════════════════════════

TIMING CONTROLLER
─────────────────
Purpose: Synchronize laser, MW, and detection

Option A: Arduino (Simplest)
• Arduino Uno/Mega (~$30)
• Timing resolution: ~1 μs
• Good for basic experiments
• Limited by USB latency

Option B: Teensy 4.0/4.1 (Better)
• 600 MHz ARM processor (~$30)
• Timing resolution: ~10 ns
• Excellent for pulse sequences

Option C: FPGA (Best)
• Digilent Basys 3 ($150)
• Digilent Arty A7 ($130)
• Timing resolution: <1 ns
• Most flexible, steeper learning curve

Recommended: Start with Teensy, upgrade to FPGA


DATA ACQUISITION / PHOTON COUNTER
─────────────────────────────────
Purpose: Count photons from detector

Option A: Arduino + Interrupt (Simplest)
• Use external interrupt pin
• Limited to ~100 kHz count rate
• Free (use same Arduino)

Option B: Dedicated Counter
• NI USB-6001 ($200) - 100 kHz counter
• Measurement Computing USB-CTR04 ($300)

Option C: FPGA Counter (Best)
• Integrated with timing controller
• MHz count rates possible
• DIY on same FPGA

Option D: Time-Correlated Single Photon Counting
• PicoQuant TimeHarp ($3000+)
• For advanced experiments only


LASER DRIVER / MODULATOR
────────────────────────
If laser has TTL input: Direct Arduino connection
If not: Need AOM or laser driver

Acousto-Optic Modulator (AOM):
• Gooch & Housego 3080-125 ($500+)
• Provides ns switching
• Research grade option

Mechanical shutter:
• Thorlabs SH1 ($300)
• ms switching (adequate for basic work)

Laser current modulation:
• Some lasers allow direct modulation
• Check specifications


POWER SUPPLIES
──────────────
Required:
• 5V for Arduino/Teensy
• 12V-24V for laser (check specs)
• ±15V or 24V for RF amplifier
• Detector power (check specs)

Options:
• Bench power supply ($50-200)
• Individual AC adapters
• Linear supplies for low noise


TOTAL CONTROL ELECTRONICS: $200 - $700
```

### Complete Cost Summary

```
TOTAL BUILD COST SUMMARY
═══════════════════════════════════════════════════════════════

                           Budget    Standard   Research
Component Category        Option      Option     Grade
──────────────────────────────────────────────────────────────
Optical Components        $900      $1,500      $2,500
Microwave Components      $650      $1,000      $1,500
Diamond + Mounting        $200      $400        $800
Control Electronics       $200      $400        $700
Cables, misc, shipping    $150      $200        $300
──────────────────────────────────────────────────────────────
TOTAL                    $2,100    $3,500      $5,800


Notes:
• Budget: Functional but limited performance
• Standard: Good for learning and basic experiments
• Research: Publication-quality capability

What you get:
• Single NV qubit operations
• Rabi oscillations
• Ramsey/Hahn echo experiments
• Basic quantum gate demonstrations
• Quantum sensing experiments
```

---

## Part 3: Detailed Optical Setup

### Optical Path Design

```
OPTICAL PATH - TOP VIEW (DETAILED)
══════════════════════════════════════════════════════════════

All dimensions in mm. Not to scale.

     ┌─────────────────────────────────────────────────────┐
     │                                                     │
     │    LASER                                           │
     │   ┌─────┐                                          │
     │   │ 532 │  Beam diameter: ~1-2mm                   │
     │   │ nm  │  Divergence: <1 mrad                     │
     │   └──┬──┘                                          │
     │      │                                              │
     │      ▼ Green beam                                   │
     │   ┌─────┐                                          │
     │   │ ND  │  Neutral density filter (optional)       │
     │   │Filt │  Adjust power: OD 0.3 - 2.0              │
     │   └──┬──┘                                          │
     │      │                                              │
     │      ▼                                              │
     │   ┌─────┐                                          │
     │   │Beam │  Beam expander (optional)                │
     │   │ Exp │  Expands beam to fill objective          │
     │   └──┬──┘  back aperture                            │
     │      │                                              │
     │      ▼                                              │
     │      ●────────────────────────────────────────●    │
     │      │               Dichroic                  │    │
     │      │                Mirror                   │    │
     │      │                                         │    │
     │   Green reflected                     Red transmitted
     │   at 45°                              straight through
     │      │                                         │    │
     │      ▼                                         ▼    │
     │   ┌─────┐                               ┌──────┐   │
     │   │Obj. │                               │ Band │   │
     │   │Lens │ 40x, NA 0.65                  │ Pass │   │
     │   │     │ Working dist: ~0.5mm          │Filter│   │
     │   └──┬──┘                               └──┬───┘   │
     │      │                                     │       │
     │      ▼                                     ▼       │
     │   ╔═════╗                               ┌─────┐   │
     │   ║ NV  ║ Diamond sample                │ APD │   │
     │   ║DIAM ║                               │     │   │
     │   ╚═════╝                               └─────┘   │
     │      │                                            │
     │   ┌──┴──┐                                         │
     │   │ MW  │ Antenna (loop or stripline)             │
     │   │Ant. │ ~1-2mm from sample                      │
     │   └─────┘                                         │
     │                                                     │
     └─────────────────────────────────────────────────────┘
```

### Detailed Optical Alignment Procedure

```
OPTICAL ALIGNMENT - STEP BY STEP
════════════════════════════════════════════════════════════════

SAFETY FIRST:
• Laser goggles ON at all times when laser is on
• Never look into beam or specular reflections
• Remove watches and jewelry (reflective)
• Work with low power first, increase only when aligned


STEP 1: MOUNT THE LASER
───────────────────────
1. Secure laser to optical post
2. Aim beam parallel to table surface
3. Check beam height: should be 3-4" above table
4. Beam should be horizontal (use iris at two distances)

Verification:
• Beam hits same spot on card at 10cm and 50cm
• Beam height constant along path


STEP 2: ADD NEUTRAL DENSITY FILTER (Optional)
─────────────────────────────────────────────
1. Place in beam path, perpendicular to beam
2. Start with OD 2.0 (1% transmission)
3. This reduces power for safe alignment

Tip: Use OD 1-2 for alignment, remove for experiments


STEP 3: MOUNT DICHROIC MIRROR
─────────────────────────────
1. Mount dichroic in kinematic mirror mount
2. Position at 45° to incoming beam
3. Height: same as beam (3-4")
4. Adjust tip/tilt to reflect beam downward at 90°

Verification:
• Reflected beam goes straight down
• Check with card at multiple heights


STEP 4: MOUNT OBJECTIVE LENS
────────────────────────────
1. Position objective directly below dichroic
2. Focal plane should be accessible from below
3. Secure firmly - vibration is the enemy

Distance from dichroic to objective: ~50-100mm
(Shorter is better for collection efficiency)


STEP 5: POSITION SAMPLE STAGE
─────────────────────────────
1. Mount diamond sample on holder
2. Place holder on XYZ stage
3. Position stage so sample is at objective focal plane
4. Working distance is typically 0.3-1mm

Initial focus:
• With room lights, look for reflection off diamond surface
• Adjust Z until surface is in focus


STEP 6: OPTIMIZE FOCUS
──────────────────────
1. Turn on laser at LOW power
2. Look at sample from side (NOT through objective)
3. You should see focused spot on diamond
4. Adjust Z for smallest spot size

Alternatively:
• Put white paper at sample position
• Focus for smallest, brightest spot
• Then replace with diamond


STEP 7: MOUNT DETECTION PATH
────────────────────────────
1. Transmitted red light goes through dichroic
2. Mount bandpass filter after dichroic
3. Mount detector (APD or photodiode) after filter
4. Align for maximum signal

Collection lens (optional):
• Place lens between filter and detector
• Focus red light onto detector active area
• Improves collection efficiency


STEP 8: VERIFY ALIGNMENT
────────────────────────
With diamond in place:
1. Turn on laser
2. You should see red fluorescence from sample
3. Detector should register signal

If no signal:
• Check focus (most common problem)
• Check filter orientation (some are directional)
• Check detector is working (use flashlight)


ALIGNMENT CHECKLIST:
────────────────────

□ Laser beam parallel to table
□ Dichroic at 45°, reflects beam straight down
□ Objective centered on reflected beam
□ Sample at focus of objective
□ Red fluorescence visible by eye (dim room)
□ Detector registers signal
□ Signal increases when laser power increases
□ All components secure and stable
```

---

## Part 4: Microwave System Setup

### Microwave Antenna Design

```
MICROWAVE ANTENNA OPTIONS
═════════════════════════════════════════════════════════════════

OPTION A: SIMPLE LOOP ANTENNA
─────────────────────────────

Materials:
• 22-24 AWG solid copper wire
• SMA connector (solder type)
• Small PCB or copper tape for ground plane

Construction:
                                    ┌── To RF amplifier
                                    │   (SMA connector)
    ┌───────────────────────────────┴──┐
    │   Ground plane (copper)          │
    │   ~10mm × 10mm                   │
    │                                   │
    │   ○────○                         │
    │  ╱      ╲                        │
    │ │   NV   │  ← Loop ~2mm diameter │
    │  ╲      ╱    made from 22 AWG    │
    │   ○────○     copper wire         │
    │    │  │                          │
    │    │  └── Signal (center of SMA) │
    │    └───── Ground (to SMA shield) │
    │                                   │
    └───────────────────────────────────┘

Loop sits ~0.5-1mm above diamond surface

Pros: Simple, cheap, easy to make
Cons: Inefficient, non-uniform field


OPTION B: STRIPLINE / CPW ANTENNA
─────────────────────────────────

Design for 50Ω characteristic impedance on FR4:

    ┌─────────────────────────────────────────┐
    │           Ground plane (top)            │
    ├─────────────────────────────────────────┤
    │     ┌───────────────────────────┐       │
    │     │    FR4 dielectric          │      │
    │     │    thickness ~0.8mm        │      │
    │     └───────────────────────────┘       │
    ├──────────────────────────────────────────┤
    │  GND │    50Ω trace    │ GND            │
    │ ═════│═════════════════│═════           │
    │      │  width ~1.5mm   │                │
    │      │   (for FR4)     │                │
    │      │                 │                │
    │      │    [DIAMOND]    │ ← Sample placed│
    │      │                 │   on trace     │
    │      │                 │                │
    └──────┴─────────────────┴────────────────┘

Get PCB fabricated (JLCPCB, OSH Park, etc.)

Pros: Better efficiency, uniform field
Cons: Requires PCB design/fabrication


OPTION C: OMEGA ANTENNA
───────────────────────

Omega (Ω) shaped loop:

           ╱─────╲
          ╱       ╲
         │         │
         │   NV    │
         │ sample  │
         │         │
          ╲       ╱
           ╲─┬─┬─╱
             │ │
         SIG GND

Better field uniformity than simple loop
Still easy to make with wire
```

### Microwave System Assembly

```
MICROWAVE CHAIN ASSEMBLY
════════════════════════════════════════════════════════════════

SIGNAL PATH:
────────────

Signal Generator  →  RF Amplifier  →  Antenna
     │                    │              │
  2.87 GHz            +30 dB        Near sample
   +10 dBm            ~+40 dBm

Connection order:
1. Signal generator output → SMA cable
2. SMA cable → RF amplifier input
3. RF amplifier output → SMA cable (short!)
4. SMA cable → Antenna feed


POWER LEVELS:
─────────────

Component            Output Power    Notes
──────────────────────────────────────────────────
Signal Generator     +10 dBm        10 mW
After Amplifier      +40 dBm        10 W (max!)
At Antenna           ~+35 dBm       ~3 W (losses)

WARNING: These power levels can cause:
• RF burns (don't touch antenna when on!)
• Interference with other equipment
• Damage to equipment if mismatched


RF AMPLIFIER SETUP:
───────────────────

1. Power supply connections:
   • Check amplifier specifications
   • Typically +12V to +28V DC
   • Current: 1-3A depending on model

2. Heat management:
   • Mount amplifier on heat sink
   • Ensure airflow
   • May need active cooling (fan)

3. Input/output:
   • Check max input power rating
   • Never exceed to avoid damage
   • Use attenuator if needed


ATTENUATOR (Optional but recommended):
──────────────────────────────────────

Place attenuator between generator and amplifier
to have fine power control:

SigGen → 10dB Atten → Amplifier → Antenna
         (switchable)

This lets you vary effective power by
changing attenuator instead of SigGen setting


SMA CABLE TIPS:
───────────────

• Use low-loss cable (LMR-400 or better)
• Keep cables short (<1m total if possible)
• Hand-tighten SMA, don't over-torque
• Check for damage before use
• Replace if center pin is damaged


VERIFICATION:
─────────────

1. Set signal generator to 2.87 GHz, -20 dBm (safe level)
2. Power on amplifier
3. Check amplifier output with power meter if available
4. Slowly increase power while monitoring

With antenna connected:
• You won't see much on NV without proper detection
• But you can verify no obvious problems (smoke, heat)
```

---

## Part 5: Diamond Sample Preparation

### Handling Your Diamond

```
DIAMOND SAMPLE HANDLING
════════════════════════════════════════════════════════════════

WHEN YOU RECEIVE YOUR SAMPLE:
─────────────────────────────

Typical packaging:
• Small plastic container or gel-pak
• May be in vacuum-sealed bag
• Usually 2mm × 2mm × 0.5mm or similar

First inspection:
• Hold up to light - should see through it
• Look for chips or cracks
• Note any obvious inclusions

Storage:
• Keep in original container
• Store in clean, dry location
• Avoid temperature extremes


CLEANING PROCEDURE:
───────────────────

For best results, diamond should be cleaned
before use. NV fluorescence can be affected
by surface contamination.

Basic cleaning (safe for beginners):
1. Rinse with isopropyl alcohol (IPA)
2. Blow dry with clean compressed air or nitrogen
3. Handle only with clean tweezers

Advanced cleaning (if basic doesn't work):

Acid clean (REQUIRES FUME HOOD AND TRAINING):
1. Boiling acid mixture (3:1 H2SO4:HNO3)
2. 30-60 minutes
3. Rinse thoroughly with DI water
4. IPA rinse and dry

Oxygen plasma clean:
• If you have access to plasma cleaner
• 5-10 minutes O2 plasma
• Removes organic contamination

WARNING: Acid cleaning is DANGEROUS
Only attempt if properly trained!


MOUNTING THE SAMPLE:
────────────────────

Option 1: Temporary mounting (easiest)
• Microscope slide
• Small piece of double-sided tape
• Place diamond on tape
• Tape holds diamond securely

Option 2: Vacuum grease
• Small dab on slide
• Press diamond onto grease
• Holds well, easy to remove

Option 3: Custom holder
• 3D printed or machined
• Small pocket for diamond
• May include MW antenna


SAMPLE ORIENTATION:
───────────────────

NV centers have orientation in crystal:

    (100) surface diamond:        (111) surface diamond:
    ─────────────────────         ─────────────────────
    NV axes at 54.7° to surface   One NV axis perpendicular

For ensemble measurements:
• Both orientations work
• (111) may give stronger signal (more NVs aligned)

For single NV:
• (111) with aligned NV is ideal
• Otherwise need to account for angle


FINDING NV FLUORESCENCE:
────────────────────────

Once diamond is mounted:

1. Focus green laser onto diamond
2. Look for red fluorescence
3. May need to scan sample to find bright spots

What you should see:
• Visible red glow under laser illumination
• Brighter than typical background
• May see structure if non-uniform NV density

If no fluorescence:
• Check focus
• Clean sample
• Verify laser wavelength (532nm not 514nm etc)
• Sample may have low NV density - get another
```

---

## Part 6: Control Electronics Setup

### Arduino-Based Timing Controller

```
ARDUINO TIMING CONTROLLER
════════════════════════════════════════════════════════════════

COMPONENTS NEEDED:
──────────────────
• Arduino Mega 2560 (multiple digital outputs)
  Or Arduino Uno (limited pins but works)
• BNC breakout shield or wires + BNC connectors
• USB cable


WIRING DIAGRAM:
───────────────

Arduino Mega
┌──────────────────────────────────────┐
│                                      │
│    Digital Pin 2 ───── Laser TTL    │◄─ Laser on/off
│    Digital Pin 3 ───── MW Enable    │◄─ Gate for MW
│    Digital Pin 4 ───── MW Trig      │◄─ MW pulse trigger
│    Digital Pin 5 ───── Detection    │◄─ Start counting
│                                      │
│    Digital Pin 18 ◄─── Photon In    │◄─ From detector
│    (External Interrupt)              │
│                                      │
│    GND ─────────────── Common GND   │◄─ All grounds
│                                      │
└──────────────────────────────────────┘


BASIC TIMING CODE:
──────────────────

```cpp
// NV Center Quantum Control - Basic
// Timing resolution: ~1 microsecond

const int LASER_PIN = 2;
const int MW_GATE_PIN = 3;
const int DETECTION_PIN = 5;
const int PHOTON_PIN = 18;

volatile long photon_count = 0;

void setup() {
  pinMode(LASER_PIN, OUTPUT);
  pinMode(MW_GATE_PIN, OUTPUT);
  pinMode(DETECTION_PIN, OUTPUT);
  pinMode(PHOTON_PIN, INPUT);

  attachInterrupt(digitalPinToInterrupt(PHOTON_PIN),
                  countPhoton, RISING);

  Serial.begin(115200);
}

void countPhoton() {
  photon_count++;
}

// Initialize qubit to |0> state
void initialize(int duration_us) {
  digitalWrite(LASER_PIN, HIGH);
  delayMicroseconds(duration_us);
  digitalWrite(LASER_PIN, LOW);
}

// Apply microwave pulse
void mw_pulse(int duration_ns) {
  // Note: delayMicroseconds minimum is 3us on Arduino
  // For ns precision, need Teensy or FPGA
  digitalWrite(MW_GATE_PIN, HIGH);
  delayMicroseconds(max(1, duration_ns/1000));
  digitalWrite(MW_GATE_PIN, LOW);
}

// Read out qubit state
long readout(int duration_us) {
  photon_count = 0;
  digitalWrite(LASER_PIN, HIGH);
  digitalWrite(DETECTION_PIN, HIGH);
  delayMicroseconds(duration_us);
  digitalWrite(DETECTION_PIN, LOW);
  digitalWrite(LASER_PIN, LOW);
  return photon_count;
}

void loop() {
  // Example: Rabi oscillation measurement
  // Vary MW pulse duration and measure result

  for (int pulse_us = 0; pulse_us < 200; pulse_us += 5) {
    long counts = 0;
    int shots = 100;

    for (int i = 0; i < shots; i++) {
      initialize(1000);        // 1ms init
      mw_pulse(pulse_us * 1000); // MW pulse (in ns)
      counts += readout(300);   // 300us readout
    }

    Serial.print(pulse_us);
    Serial.print(",");
    Serial.println(counts);
  }

  delay(1000);
}
```

```
TEENSY 4.0 UPGRADE (RECOMMENDED):
─────────────────────────────────

Teensy provides ~10ns timing resolution:

```cpp
// Teensy 4.0 NV Control
// Much better timing resolution!

const int LASER_PIN = 2;
const int MW_GATE_PIN = 3;
const int PHOTON_PIN = 18;

volatile long photon_count = 0;

void countPhoton() {
  photon_count++;
}

void setup() {
  pinMode(LASER_PIN, OUTPUT);
  pinMode(MW_GATE_PIN, OUTPUT);
  pinMode(PHOTON_PIN, INPUT);
  attachInterrupt(PHOTON_PIN, countPhoton, RISING);
  Serial.begin(115200);
}

// Nanosecond delay using cycle counting
void delayNanoseconds(int ns) {
  // Teensy 4.0 runs at 600 MHz = 1.67ns per cycle
  int cycles = (ns * 600) / 1000;
  for (volatile int i = 0; i < cycles; i++) {
    __asm__ __volatile__("nop");
  }
}

void mw_pulse_ns(int duration_ns) {
  digitalWriteFast(MW_GATE_PIN, HIGH);
  delayNanoseconds(duration_ns);
  digitalWriteFast(MW_GATE_PIN, LOW);
}

// Pi pulse at 2.87 GHz with 10 MHz Rabi frequency
// Duration = pi / (2*pi*10MHz) = 50 ns
void pi_pulse() {
  mw_pulse_ns(50);
}

void pi_over_2_pulse() {
  mw_pulse_ns(25);
}

void loop() {
  // Your experiment code here
}
```

### Photon Counting Setup

```
PHOTON COUNTING APPROACHES
════════════════════════════════════════════════════════════════

OPTION A: ANALOG INTEGRATION (Simplest)
───────────────────────────────────────

If using amplified photodiode:
• Detector outputs voltage proportional to light
• Use Arduino analog input
• Integrate during detection window

```cpp
// Analog readout
long readout_analog(int duration_us) {
  long total = 0;
  int samples = duration_us / 10; // 10us per sample

  for (int i = 0; i < samples; i++) {
    total += analogRead(A0);
    delayMicroseconds(10);
  }

  return total;
}
```


OPTION B: DIGITAL COUNTING (Better)
───────────────────────────────────

If detector has TTL output:
• Each photon → digital pulse
• Count pulses during window

Max rates:
• Arduino: ~100 kHz
• Teensy 4.0: ~1 MHz
• FPGA: ~100 MHz


OPTION C: TIME-TAGGED (Advanced)
────────────────────────────────

Record arrival time of each photon:
• Need TCSPC hardware
• Or fast FPGA implementation
• Enables advanced analysis

For beginners: Start with analog or basic digital


SIGNAL PROCESSING:
──────────────────

After data collection:

1. Background subtraction:
   • Measure counts with no NV (laser blocked)
   • Subtract from signal

2. Normalization:
   • Divide by reference measurement
   • Or by known bright (|0⟩) signal

3. Averaging:
   • Repeat measurement many times
   • Average to reduce noise
```

---

## Part 7: Assembly Procedure

### Step-by-Step Assembly

```
COMPLETE ASSEMBLY PROCEDURE
════════════════════════════════════════════════════════════════

DAY 1: OPTICAL SYSTEM
─────────────────────

Step 1: Set up breadboard/table (30 min)
□ Level the surface
□ Clean thoroughly
□ Plan component layout

Step 2: Mount and align laser (1 hour)
□ Secure laser to post
□ Check beam height and direction
□ Add ND filter for alignment

Step 3: Mount dichroic mirror (30 min)
□ Install in kinematic mount
□ Adjust for 90° reflection
□ Verify with alignment card

Step 4: Mount objective lens (30 min)
□ Position below dichroic
□ Secure firmly
□ Note focal plane location

Step 5: Set up detection path (1 hour)
□ Mount bandpass filter
□ Mount detector
□ Add focusing lens if using
□ Verify detector responds to light


DAY 2: SAMPLE AND DETECTION
───────────────────────────

Step 6: Prepare diamond sample (30 min)
□ Clean sample
□ Mount on holder
□ Position on stage

Step 7: Find NV fluorescence (1-2 hours)
□ Focus laser onto diamond
□ Scan for bright spots
□ Optimize position for max signal
□ Verify red fluorescence

Step 8: Verify detection (30 min)
□ Check detector registers signal
□ Block laser → signal drops
□ Increase laser power → signal increases


DAY 3: MICROWAVE SYSTEM
───────────────────────

Step 9: Assemble MW chain (1 hour)
□ Connect signal generator
□ Connect amplifier with power
□ Connect to antenna
□ Verify amplifier heats (it should)

Step 10: Position antenna (30 min)
□ Place antenna near sample
□ ~0.5-1mm from diamond surface
□ Secure in place

Step 11: Basic MW test (30 min)
□ Set frequency to 2.87 GHz
□ Set low power initially
□ Verify no damage to other components


DAY 4: CONTROL ELECTRONICS
──────────────────────────

Step 12: Set up Arduino/Teensy (1 hour)
□ Upload timing code
□ Connect to laser control
□ Connect to detector input
□ Connect to MW gate

Step 13: Test each subsystem (1 hour)
□ Laser on/off via Arduino
□ Photon counting works
□ MW gate triggers correctly

Step 14: Integration test (1-2 hours)
□ Run basic pulse sequence
□ Initialize → MW pulse → Readout
□ Verify signals on oscilloscope if available


DAY 5: CALIBRATION
──────────────────

Step 15: Find NV resonance (1-2 hours)
□ Sweep MW frequency 2.85-2.89 GHz
□ Monitor fluorescence
□ Find dip at resonance

Step 16: Calibrate π pulse (1-2 hours)
□ Vary MW pulse duration
□ Observe Rabi oscillations
□ Find π and π/2 pulse times

Step 17: Verify coherence (1 hour)
□ Run Ramsey sequence
□ Observe oscillations and decay
□ Extract T2*

TOTAL TIME: ~15-25 hours over 5 days
```

---

## Part 8: Safety Protocols

### Laser Safety

```
LASER SAFETY - CRITICAL
════════════════════════════════════════════════════════════════

YOUR LASER CLASS:
─────────────────

Class 3B (50-500 mW at 532 nm)

Hazards:
• Direct eye exposure → PERMANENT BLINDNESS
• Specular reflections → PERMANENT BLINDNESS
• Diffuse reflections → Usually safe but not at close range
• Skin exposure → Burns possible at high power

REQUIRED SAFETY EQUIPMENT:
──────────────────────────

□ Laser safety goggles
  Specification: OD 4+ at 532 nm
  Example: Thorlabs LG10 ($50)
  MUST be worn whenever laser can be on!

□ Warning signs
  Post "LASER IN USE" signs at entrances
  Use when operating

□ Beam blocks/dumps
  Terminate beams that aren't used
  Prevents stray reflections


SAFE OPERATING PROCEDURES:
──────────────────────────

1. Before turning on laser:
   □ Announce "Laser on" to anyone in room
   □ Everyone puts on goggles
   □ Check beam path is clear
   □ Remove reflective objects (jewelry, watches)

2. During operation:
   □ Never look into beam or reflections
   □ Keep beam at or below waist height
   □ Use minimum necessary power
   □ Don't leave laser on unattended

3. Alignment:
   □ Use IR viewer cards or phosphor screens
   □ Start at lowest power
   □ Increase only when aligned

4. When done:
   □ Turn off laser at source
   □ Wait for confirmation it's off
   □ Goggles can be removed after verification


EMERGENCY PROCEDURES:
─────────────────────

Eye exposure:
1. DO NOT rub eyes
2. Seek immediate medical attention
3. Tell doctor: 532nm laser exposure
4. Bring laser specs to hospital

Skin burn:
1. Treat as normal burn
2. Cool with water
3. Seek medical attention if severe


COMMON MISTAKES TO AVOID:
─────────────────────────

✗ "I'll just do this one thing quickly"
  → Always wear goggles

✗ "The laser isn't that powerful"
  → 50mW can cause permanent damage in ms

✗ "I'll use sunglasses"
  → Sunglasses are NOT adequate protection

✗ "The beam is going into the sample"
  → Reflections can come from anywhere
```

### RF Safety

```
RF/MICROWAVE SAFETY
════════════════════════════════════════════════════════════════

POWER LEVELS IN YOUR SYSTEM:
────────────────────────────

Amplifier output: Up to +40 dBm (10W)
At antenna: ~+35 dBm (3W)

For comparison:
• Cell phone: +30 dBm (1W)
• Microwave oven: 1000W (but shielded)


HAZARDS:
────────

1. RF Burns
   • Direct contact with antenna while active
   • Can cause localized burns
   • Not immediately felt (unlike thermal burns)

2. Interference
   • May affect pacemakers
   • Can interfere with other equipment
   • WiFi/Bluetooth may be disrupted

3. Equipment damage
   • Open/short connections can damage amp
   • Reflected power can damage amp


SAFE PRACTICES:
───────────────

□ Never touch antenna when MW is on
□ Keep at least 30cm from antenna when on
□ Start at low power, increase gradually
□ Use proper 50Ω terminations
□ Ensure good SMA connections
□ Don't operate with antenna disconnected
□ Turn off MW when making adjustments

PEOPLE WITH PACEMAKERS:
• Consult doctor before working near RF
• May need to maintain larger distance
• Consider adding RF shielding
```

### General Lab Safety

```
GENERAL LABORATORY SAFETY
════════════════════════════════════════════════════════════════

ELECTRICAL:
───────────
□ Check all cables before use
□ No exposed wires
□ Keep water away from electronics
□ Use grounded equipment
□ Know location of power shutoff

CHEMICAL (if cleaning diamond):
───────────────────────────────
□ Work in fume hood
□ Wear appropriate PPE (gloves, goggles, lab coat)
□ Know MSDS for all chemicals
□ Have neutralization materials ready
□ Never work alone

ERGONOMICS:
───────────
□ Adjust table/chair heights
□ Take breaks
□ Ensure adequate lighting
□ Don't strain to reach components

EMERGENCY CONTACTS:
───────────────────
Post near workspace:
□ Emergency services: [Your country's number]
□ Poison control: [Your country's number]
□ Campus security: [If applicable]
□ Lab supervisor: [If applicable]
```

---

## Part 9: Testing and Calibration

### Initial System Tests

```
SYSTEM TESTING PROCEDURE
════════════════════════════════════════════════════════════════

TEST 1: LASER FUNCTION
──────────────────────

Setup:
• Connect laser power
• Have safety goggles on
• Point at phosphor card

Test procedure:
1. Turn on laser
2. Verify green beam visible on card
3. Check beam profile (should be round)
4. Test TTL control if available

Expected result:
✓ Bright green spot on card
✓ Power stable over 1 minute
✓ TTL on/off works (if applicable)

Troubleshooting:
• No beam → Check power, connections
• Dim beam → May be warming up
• Flickering → Power supply issue


TEST 2: OPTICAL PATH
────────────────────

Setup:
• Full optical path assembled
• Diamond in place (or paper for now)

Test procedure:
1. Focus laser onto target
2. Place white paper at detection path
3. Look for red light (NV fluorescence or reflections)

Expected result:
✓ Red light reaches detector position
✓ No stray green light leaking through

If using paper:
• Will see green reflection
• Bandpass filter should block it


TEST 3: DETECTION
─────────────────

Setup:
• Detector connected and powered
• Output connected to oscilloscope or Arduino

Test procedure:
1. Block detector → baseline signal
2. Illuminate with flashlight → signal increase
3. Block again → returns to baseline

Expected result:
✓ Clear response to light
✓ Fast response time
✓ Low noise baseline

Troubleshooting:
• No response → Check connections, power
• Saturated → Too much light, add attenuation
• Very noisy → Check grounding


TEST 4: NV FLUORESCENCE
───────────────────────

Setup:
• Diamond sample in place
• Full detection path

Test procedure:
1. Focus laser on diamond
2. Look at sample from side (with goggles!)
3. Should see red glow
4. Monitor detector output

Expected result:
✓ Visible red fluorescence
✓ Detector shows signal
✓ Signal varies with laser power

Troubleshooting:
• No fluorescence → Check focus, clean sample
• Weak fluorescence → Low NV density in sample
• Signal but no visible glow → May be dim, use dark room


TEST 5: MICROWAVE SYSTEM
────────────────────────

Setup:
• MW chain connected
• Frequency set to 2.87 GHz
• Power at minimum

Test procedure:
1. Power on amplifier
2. Set signal generator to 2.87 GHz, -20 dBm
3. Gradually increase power
4. Amplifier should get warm

Expected result:
✓ No smoke or burning smell
✓ Amplifier warm but not hot
✓ Output power measurable (if you have meter)

Troubleshooting:
• No output → Check connections
• Very hot → May be oscillating, check terminations
• Power meter shows wrong frequency → Verify sig gen setting
```

### Finding NV Resonance

```
FINDING THE NV RESONANCE (ODMR)
════════════════════════════════════════════════════════════════

ODMR = Optically Detected Magnetic Resonance

When microwave frequency matches NV transition (2.87 GHz),
fluorescence DECREASES. This is how we find resonance.


PROCEDURE:
──────────

1. Prepare measurement:
   □ Laser on, focused on NV sample
   □ Detector collecting fluorescence
   □ MW power moderate (+20 to +30 dBm at antenna)

2. Sweep frequency:
   □ Sweep from 2.75 GHz to 2.95 GHz
   □ Step size: 5 MHz
   □ Dwell time: 100-500 ms per point

3. Record fluorescence at each frequency:
   □ Count photons or measure analog signal
   □ Plot fluorescence vs frequency


EXPECTED RESULT:
────────────────

Fluorescence
    ▲
    │
100%│────────────────────────────────────────
    │           ╲              ╱
 95%│            ╲            ╱
    │             ╲          ╱
 90%│              ╲        ╱
    │               ╲      ╱
 85%│                ╲    ╱
    │                 ╲  ╱
 80%│                  ╲╱   ← Resonance dip
    │                   │
    └───────────────────┼───────────────────► Frequency
                     2.87 GHz

Dip depth: 10-30% typically
Width: 5-50 MHz depending on conditions


WITH MAGNETIC FIELD:
────────────────────

If external B-field is present:

Fluorescence
    ▲
    │
100%│──────────────────────────────────────
    │     ╲    ╱              ╲    ╱
    │      ╲  ╱                ╲  ╱
 85%│       ╲╱                  ╲╱
    │        │                   │
    │     ms=-1               ms=+1
    └────────┼───────────────────┼────────► Freq
          2.87-γB            2.87+γB

Two dips separated by 2γB (5.6 MHz per Gauss)


ODMR SCAN CODE (Python):
────────────────────────

```python
import serial
import numpy as np
import matplotlib.pyplot as plt

# Connect to signal generator
sig_gen = serial.Serial('/dev/ttyUSB0', 115200)

# Connect to Arduino for photon counting
arduino = serial.Serial('/dev/ttyACM0', 115200)

def set_frequency(freq_hz):
    """Set signal generator frequency"""
    cmd = f"FREQ {freq_hz}\n"
    sig_gen.write(cmd.encode())

def count_photons(duration_ms=100):
    """Count photons for given duration"""
    arduino.write(f"COUNT {duration_ms}\n".encode())
    result = arduino.readline().decode().strip()
    return int(result)

# Sweep parameters
freq_start = 2.75e9  # 2.75 GHz
freq_stop = 2.95e9   # 2.95 GHz
freq_step = 5e6      # 5 MHz
num_points = int((freq_stop - freq_start) / freq_step)

# Perform sweep
frequencies = []
fluorescence = []

for i in range(num_points):
    freq = freq_start + i * freq_step
    set_frequency(freq)
    time.sleep(0.05)  # Wait for frequency to settle

    counts = count_photons(100)

    frequencies.append(freq / 1e9)  # Convert to GHz
    fluorescence.append(counts)

    print(f"Freq: {freq/1e9:.3f} GHz, Counts: {counts}")

# Plot result
plt.figure(figsize=(10, 6))
plt.plot(frequencies, fluorescence, 'b.-')
plt.xlabel('Frequency (GHz)')
plt.ylabel('Fluorescence (counts)')
plt.title('ODMR Spectrum of NV Center')
plt.grid(True)
plt.savefig('odmr_spectrum.png')
plt.show()
```

### Calibrating Rabi Oscillations

```
RABI OSCILLATION CALIBRATION
════════════════════════════════════════════════════════════════

Once you find the resonance frequency, calibrate the
pulse duration for π and π/2 rotations.


PROCEDURE:
──────────

1. Set MW to resonance frequency (from ODMR)
2. Fix MW power
3. Vary MW pulse duration
4. Measure fluorescence after each pulse


PULSE SEQUENCE:
───────────────

       Init          MW Pulse         Readout
        │               │                │
────────┼───────────────┼────────────────┼────────►
        │               │                │
Laser:  ████████████████░░░░░░░░░░░░░░░░░████████
        │←── 1-2 μs ──→│               │← 300ns →│
        │               │                │
MW:     ░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░░░░░░
                        │← τ →│
                        varied

Detect: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
                                        count here


EXPECTED RESULT:
────────────────

Fluorescence
    ▲
    │
 |0⟩│●
    │ ╲
    │  ╲
    │   ╲
    │    ╲
    │     ●
    │      ╲
 |1⟩│       ●─────●
    │              ╲     ● = π pulse
    │               ╲
    │                ●
    │
    └──────────────────────────────────────────► τ
    0      τ_π/2    τ_π    3τ_π/2   2τ_π


Oscillation continues with decreasing amplitude
due to decoherence (T2).

From this plot:
• τ_π = pulse duration for full inversion
• τ_π/2 = τ_π / 2 = Hadamard-like operation
• Rabi frequency Ω = π / τ_π


TYPICAL VALUES:
───────────────

For +30 dBm at antenna:
• τ_π ≈ 50-200 ns
• Ω ≈ 5-20 MHz

Higher power → shorter τ_π


RABI CALIBRATION CODE:
──────────────────────

```python
def rabi_oscillation(tau_list_ns, num_averages=1000):
    """Measure Rabi oscillation"""

    results = []

    for tau in tau_list_ns:
        counts = 0

        for _ in range(num_averages):
            # Initialize
            laser_on(1000)  # 1000 ns = 1 μs
            laser_off()

            # MW pulse of duration tau
            mw_on()
            delay_ns(tau)
            mw_off()

            # Readout
            counts += read_fluorescence(300)  # 300 ns

        results.append(counts / num_averages)
        print(f"tau = {tau} ns, counts = {counts/num_averages:.1f}")

    return results

# Sweep from 0 to 500 ns in 10 ns steps
tau_values = range(0, 500, 10)
rabi_data = rabi_oscillation(tau_values)

# Find pi pulse time
import scipy.optimize as opt

def rabi_fit(t, A, omega, phi, offset, decay):
    return A * np.cos(omega * t + phi) * np.exp(-t/decay) + offset

# Fit the data
popt, pcov = opt.curve_fit(rabi_fit, tau_values, rabi_data)
omega_fit = popt[1]
tau_pi = np.pi / omega_fit

print(f"Pi pulse duration: {tau_pi:.1f} ns")
print(f"Rabi frequency: {omega_fit/(2*np.pi)*1e3:.1f} MHz")
```

---

## Part 10: Troubleshooting Guide

```
COMMON PROBLEMS AND SOLUTIONS
════════════════════════════════════════════════════════════════

PROBLEM: No fluorescence from sample
─────────────────────────────────────
Symptoms:
• Laser on but no red glow
• Detector shows no signal

Causes and solutions:
1. Focus issue
   → Adjust Z position slowly while watching signal

2. Beam blocked
   → Check entire optical path

3. Sample has no NV centers
   → Try different position on sample
   → Get new sample with confirmed NV content

4. Filter blocking all light
   → Check filter orientation
   → Verify it passes 650-750 nm

5. Detector not working
   → Test with flashlight
   → Check power to detector


PROBLEM: No ODMR dip visible
────────────────────────────
Symptoms:
• Fluorescence present
• Sweeping frequency shows flat line

Causes and solutions:
1. MW not reaching sample
   → Check antenna position (<1mm from sample)
   → Check all MW connections

2. MW power too low
   → Increase amplifier power

3. Wrong frequency range
   → Center sweep at 2.87 GHz
   → Try wider sweep (2.5-3.2 GHz)

4. Strong magnetic field
   → Check for magnets nearby
   → Dips may be shifted far from 2.87 GHz

5. Modulation speed too fast
   → Increase dwell time per frequency


PROBLEM: Very weak ODMR contrast
────────────────────────────────
Symptoms:
• Dip visible but small (<5%)

Causes and solutions:
1. Low NV concentration
   → Normal for some samples
   → Need longer averaging

2. MW power insufficient
   → Increase power (if safe)

3. Many NV orientations (ensemble)
   → Only 1/4 of NVs at optimal angle
   → Normal for (100) samples

4. Background fluorescence
   → Clean sample
   → Check for dust in optical path


PROBLEM: Rabi oscillations not visible
──────────────────────────────────────
Symptoms:
• ODMR works but time-domain shows no oscillation

Causes and solutions:
1. Timing resolution too coarse
   → Arduino limited to ~1 μs
   → Upgrade to Teensy or FPGA

2. MW power too low
   → Rabi too slow, decays before oscillation
   → Increase power

3. Pulse times not in right range
   → Calculate expected τ_π from power
   → Start with 50-200 ns range

4. Phase noise in MW source
   → Use better signal generator
   → Check amplifier stability


PROBLEM: Signal very noisy
──────────────────────────
Symptoms:
• Large shot-to-shot variation
• Hard to see trends

Causes and solutions:
1. Not enough averaging
   → Increase number of shots
   → 1000-10000 shots typical

2. Vibrations
   → Isolate optical table
   → Check for HVAC, foot traffic

3. Laser power fluctuations
   → Use laser with power stabilization
   → Add feedback control

4. Electronic interference
   → Check grounding
   → Shield cables
   → Move away from other electronics


PROBLEM: System works sometimes but not others
─────────────────────────────────────────────
Symptoms:
• Intermittent failures
• Hard to reproduce

Causes and solutions:
1. Loose connections
   → Check all cables
   → Re-tighten SMA connectors

2. Temperature drift
   → Let system warm up
   → Temperature stabilize room

3. Alignment drift
   → Secure all optical mounts
   → Reduce vibrations

4. Software/timing bugs
   → Check code carefully
   → Add delays between commands
```

---

## Conclusion and Next Steps

You now have a complete guide to building a room-temperature NV-center quantum processor. The total cost is $2,000-$5,000, compared to millions for a superconducting system.

**What you've built:**
- Optical system for NV initialization and readout
- Microwave system for qubit manipulation
- Control electronics for pulse sequences
- Software interface for experiments

**In Part 4, we'll cover:**
- Complete software architecture
- Implementing quantum gates
- Running your first quantum algorithm
- Integration with Qiskit and other frameworks

---

## Related Articles

- [Part 1: Room-Temperature Quantum Computing Introduction](/blog/room-temperature-quantum-computing-introduction-2026)
- [Part 2: NV-Center Diamond Physics](/blog/nv-center-diamond-physics-quantum-qubits-2026)
- [Part 4: Quantum Processor Software & First Algorithm](/blog/quantum-processor-software-first-algorithm-2026)
- [Quantum Computing Explained: Complete Beginner's Guide 2026](/blog/quantum-computing-complete-guide-beginners-2026)

---

## Component Suppliers Quick Reference

| Category | Supplier | Website |
|----------|----------|---------|
| Optics | Thorlabs | thorlabs.com |
| Optics | Edmund Optics | edmundoptics.com |
| Filters | Semrock | semrock.com |
| RF/MW | Mini-Circuits | minicircuits.com |
| Signal Gen | Windfreak | windfreaktech.com |
| Diamond | Element Six | e6.com |
| Electronics | Digikey | digikey.com |
| PCB Fab | JLCPCB | jlcpcb.com |

---

*Part 3 of 4 in the Room-Temperature Quantum Computing series. Last updated: February 2, 2026.*
