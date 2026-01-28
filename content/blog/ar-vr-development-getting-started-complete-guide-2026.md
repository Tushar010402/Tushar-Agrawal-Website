---
title: "AR/VR Development Getting Started: Complete Beginner's Guide 2026"
description: "Learn AR/VR development from scratch - WebXR, Unity AR Foundation, Apple Vision Pro, Meta Quest 3, Samsung Galaxy XR. Beginner-friendly guide for Indian developers with code examples."
date: "2026-01-28"
author: "Tushar Agrawal"
tags: ["AR Development", "VR Development", "WebXR", "Unity XR", "Meta Quest 3", "Apple Vision Pro", "Samsung Galaxy XR", "Indian Developers", "Beginner Guide", "2026"]
image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=1200&h=630&fit=crop"
published: true
---

## The XR Revolution: Why 2026 Is the Year to Start

You've seen the headlines. Apple released Vision Pro. Meta keeps pushing Quest headsets. Samsung announced Galaxy XR. Everyone's talking about the "spatial computing" future.

But here's what most people miss: **You don't need expensive hardware to start building XR experiences today.**

This guide will take you from zero to building your first AR/VR application. Whether you have a smartphone or a high-end headset, you'll be creating immersive experiences by the end of this article.

---

## What Is AR/VR/MR/XR? (Simple Explanations)

Before we dive into code, let's understand what these acronyms actually mean.

```
The XR Spectrum
===============

REALITY ←─────────────────────────────────────────────→ VIRTUAL

  AR              MR              VR              XR
  │               │               │               │
  ↓               ↓               ↓               ↓

┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│        │    │  ╔══╗  │    │████████│    │        │
│  ╔══╗  │    │  ║  ║  │    │████████│    │ ALL OF │
│  ╚══╝  │    │  ╚══╝  │    │████████│    │ THESE  │
│   ↑    │    │   ↑    │    │████████│    │        │
│ Digital│    │Interacts│   │ 100%   │    │Combined│
│ Overlay│    │with Real│   │ Digital│    │        │
└────────┘    └────────┘    └────────┘    └────────┘

Real World    Real World     No Real      Umbrella
   +          interacts      World         Term
Digital       with digital
Objects       objects
```

### Augmented Reality (AR)
Digital content overlaid on the real world. Think Pokémon GO, Instagram filters, or IKEA's furniture placement app.

**You still see the real world** - just with digital elements added on top.

### Virtual Reality (VR)
Completely digital environment that replaces the real world. Put on a VR headset, and you're transported somewhere else entirely.

**You see only the virtual world** - full immersion.

### Mixed Reality (MR)
Digital objects that interact with the real world. A virtual ball bouncing off your real table. A digital character sitting on your actual couch.

**Real and digital worlds interact** - most advanced form.

### Extended Reality (XR)
The umbrella term covering AR, VR, and MR. When people say "XR development," they mean building for any or all of these platforms.

---

## Why Learn XR Development in 2026?

The numbers tell the story:

```
XR Market Growth
================

2024: $32 billion
2025: $42 billion
2026: $52 billion (projected)
2027: $65 billion (projected)

Growth Rate: 25-30% CAGR

Job Postings Trend (India):
2023: ████████░░░░░░░░░░░░   4,200
2024: ████████████░░░░░░░░   7,800
2025: ████████████████░░░░  12,500
2026: ████████████████████  18,000+ (projected)

Average XR Developer Salary (India):
Entry Level:  ₹8-12 LPA
Mid Level:    ₹15-22 LPA
Senior Level: ₹25-40 LPA
```

### What's Changed in 2025-2026?

1. **Apple Vision Pro** brought mainstream attention to spatial computing
2. **Meta Quest 3** made MR accessible at $499
3. **WebXR** matured - build XR with just JavaScript
4. **Samsung Galaxy XR** (October 2025) brought Android XR to market
5. **Unity and Unreal** simplified cross-platform development

---

## Hardware Landscape 2026: What Should You Buy?

Here's an honest comparison of current XR hardware:

```
XR Hardware Comparison 2026
===========================

Device             | Price   | Best For           | Available in India
-------------------|---------|--------------------|-----------------
Meta Quest 3       | $499    | Beginners, MR dev  | Yes (₹45,000)
Meta Quest 3S      | $299    | Budget entry       | Yes (₹28,000)
Apple Vision Pro   | $3,499  | Premium spatial    | Limited
Samsung Galaxy XR  | ~$800   | Android ecosystem  | Coming 2026
Pico 4 Ultra       | $599    | Business apps      | Yes
Steam Frame        | TBA     | PC VR gaming       | Coming 2026

Development Recommendation:
==========================
Budget Tight:   Meta Quest 3S + Smartphone (AR)
Good Starting:  Meta Quest 3
Premium Setup:  Apple Vision Pro + Meta Quest 3
```

### My Recommendation for Indian Developers

**Start with Meta Quest 3 or Quest 3S.** Here's why:

1. Best price-to-capability ratio
2. Large developer community
3. Mixed reality passthrough for AR testing
4. WebXR support built-in
5. Huge app store for reference
6. Available in India through official channels

**You can also start with just your smartphone** using WebXR or ARCore/ARKit!

---

## Three Development Paths: Choose Your Journey

There are three main approaches to XR development:

```
XR Development Paths
====================

                    ┌─────────────────────────┐
                    │   Which Path Is Right   │
                    │        For You?         │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ↓                 ↓                 ↓
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │    PATH 1       │ │    PATH 2       │ │    PATH 3       │
    │    WebXR        │ │    Unity        │ │    Native       │
    ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
    │ • Browser-based │ │ • Cross-platform│ │ • Platform-     │
    │ • JavaScript/TS │ │ • C# language   │ │   specific      │
    │ • No app store  │ │ • Visual editor │ │ • Best perf     │
    │ • Easiest start │ │ • Industry std  │ │ • Most complex  │
    ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
    │ Time: 1-2 weeks │ │ Time: 4-8 weeks │ │ Time: 8-16 weeks│
    │ to first app    │ │ to first app    │ │ to first app    │
    └─────────────────┘ └─────────────────┘ └─────────────────┘

    Best if you:       Best if you:        Best if you:
    • Know JavaScript  • Want game dev     • Need max perf
    • Want quick start • Build for Quest   • One platform only
    • Web background   • Complex 3D apps   • Advanced features
```

### Decision Flowchart

```
Should I Start With WebXR, Unity, or Native?
============================================

Do you know JavaScript?
       │
       ├── YES → Do you want to build games?
       │              │
       │              ├── YES → UNITY (Path 2)
       │              │
       │              └── NO → Are you targeting one platform only?
       │                           │
       │                           ├── YES → NATIVE (Path 3)
       │                           │
       │                           └── NO → WebXR (Path 1)
       │
       └── NO → Do you have Unity/C# experience?
                    │
                    ├── YES → UNITY (Path 2)
                    │
                    └── NO → Start with WebXR (Path 1)
                             Learn JavaScript basics first
```

---

## Path 1: WebXR Development (The Easiest Start)

WebXR is the most accessible way to start XR development. You use JavaScript, HTML, and Three.js to create VR/AR experiences that run directly in the browser.

### What Is WebXR?

```
WebXR Architecture
==================

┌────────────────────────────────────────────────────────┐
│                    YOUR BROWSER                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │              WebXR Device API                    │  │
│  │  • Handles headset/controller communication      │  │
│  │  • Provides tracking data (position, rotation)   │  │
│  │  • Manages sessions (immersive-vr, immersive-ar) │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────┐  │
│  │   Three.js    │  │    A-Frame    │  │ Babylon.js│  │
│  │               │  │               │  │           │  │
│  │ Low-level 3D  │  │ HTML-based    │  │ Full      │  │
│  │ rendering     │  │ declarative   │  │ engine    │  │
│  └───────────────┘  └───────────────┘  └───────────┘  │
└────────────────────────────────────────────────────────┘
                          │
                          ↓
┌────────────────────────────────────────────────────────┐
│                    XR HARDWARE                         │
│  Quest 3 • Vision Pro • Galaxy XR • Any WebXR device  │
└────────────────────────────────────────────────────────┘
```

### Setting Up Your WebXR Development Environment

**Step 1: Install Node.js**

```bash
# Download from nodejs.org or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Step 2: Create Project Structure**

```bash
mkdir my-first-xr
cd my-first-xr
npm init -y
npm install three vite
```

**Step 3: Create Files**

```
my-first-xr/
├── index.html
├── style.css
├── main.js
└── package.json
```

### Your First VR Scene (Three.js + WebXR)

Let's build a VR environment step by step.

**index.html:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First VR Experience</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="container"></div>
    <button id="vr-button">Enter VR</button>
    <script type="module" src="main.js"></script>
</body>
</html>
```

**style.css:**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: system-ui, sans-serif;
    background: #000;
    overflow: hidden;
}

#container {
    width: 100vw;
    height: 100vh;
}

#vr-button {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    font-size: 18px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    z-index: 100;
}

#vr-button:hover {
    background: #45a049;
}

#vr-button:disabled {
    background: #666;
    cursor: not-allowed;
}
```

**main.js:**

```javascript
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,                                    // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                                   // Near clipping plane
    1000                                   // Far clipping plane
);
camera.position.set(0, 1.6, 3); // Average human eye height

// Renderer with WebXR
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true; // Enable WebXR!

document.getElementById('container').appendChild(renderer.domElement);

// Replace our custom button with Three.js VR Button
document.getElementById('vr-button').remove();
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d2d44,
    roughness: 0.8
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Create a floating cube
const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    metalness: 0.3,
    roughness: 0.4
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 1.5, -2);
scene.add(cube);

// Create a sphere
const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    metalness: 0.5,
    roughness: 0.2
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(-1.5, 1.2, -2);
scene.add(sphere);

// Create a cylinder
const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 32);
const cylinderMaterial = new THREE.MeshStandardMaterial({
    color: 0x4ecdc4,
    metalness: 0.4,
    roughness: 0.3
});
const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
cylinder.position.set(1.5, 1, -2);
scene.add(cylinder);

// Animation loop
function animate() {
    // Rotate objects
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    sphere.rotation.y += 0.02;
    sphere.position.y = 1.2 + Math.sin(Date.now() * 0.002) * 0.2;

    cylinder.rotation.z += 0.015;
}

// WebXR-compatible render loop
renderer.setAnimationLoop(() => {
    animate();
    renderer.render(scene, camera);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

**Run your project:**

```bash
npx vite
```

Open your browser to the local server address. If you have a VR headset connected, click "Enter VR"!

### A-Frame: Even Easier XR Development

A-Frame is a web framework that makes XR development as simple as writing HTML.

**Complete A-Frame Example:**

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.2.0/dist/aframe-extras.min.js"></script>
</head>
<body>
    <a-scene>
        <!-- Sky -->
        <a-sky color="#87CEEB"></a-sky>

        <!-- Ground -->
        <a-plane
            position="0 0 0"
            rotation="-90 0 0"
            width="100"
            height="100"
            color="#3a7e4f"
            shadow="receive: true">
        </a-plane>

        <!-- Floating cube -->
        <a-box
            position="-1 1.5 -3"
            rotation="0 45 0"
            color="#4CC3D9"
            animation="property: rotation; to: 0 405 0; loop: true; dur: 5000">
        </a-box>

        <!-- Sphere -->
        <a-sphere
            position="0 1.25 -5"
            radius="1.25"
            color="#EF2D5E"
            animation="property: position; to: 0 2 -5; dir: alternate; loop: true; dur: 2000">
        </a-sphere>

        <!-- Cylinder -->
        <a-cylinder
            position="1 0.75 -3"
            radius="0.5"
            height="1.5"
            color="#FFC65D">
        </a-cylinder>

        <!-- 3D Text -->
        <a-text
            value="Hello XR World!"
            position="0 3 -4"
            color="#000"
            align="center"
            width="8">
        </a-text>

        <!-- Camera with cursor for interaction -->
        <a-entity position="0 1.6 0">
            <a-camera>
                <a-cursor color="#FF0000"></a-cursor>
            </a-camera>
        </a-entity>
    </a-scene>
</body>
</html>
```

That's it! Save this as an HTML file, open it in a browser, and you have a VR scene. No build tools required.

### AR with A-Frame (Marker-based)

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://raw.githack.com/AR-js-org/AR.js/3.4.5/aframe/build/aframe-ar.js"></script>
</head>
<body style="margin: 0; overflow: hidden;">
    <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
        <!-- Marker-based AR: Shows 3D model when HIRO marker is detected -->
        <a-marker preset="hiro">
            <a-box
                position="0 0.5 0"
                material="color: #4CC3D9;"
                animation="property: rotation; to: 0 360 0; loop: true; dur: 3000">
            </a-box>
        </a-marker>

        <a-entity camera></a-entity>
    </a-scene>
</body>
</html>
```

Print a HIRO marker (search "HIRO marker AR.js"), point your phone camera at it, and watch the 3D cube appear!

### Testing Without Hardware: Meta Immersive Web Emulator

You don't need a VR headset to test WebXR. Install the **Meta Immersive Web Emulator** Chrome extension:

```
Testing WebXR Without Hardware
==============================

1. Install Chrome extension:
   "Meta Immersive Web Emulator"

2. Open your WebXR page

3. Open Chrome DevTools (F12)

4. Find the "Meta Immersive Web Emulator" tab

5. Click "Enter VR" to simulate headset

Features:
• Simulates Quest headset
• Test hand tracking
• Controller input simulation
• Room-scale boundary testing
```

---

## Path 2: Unity AR Foundation (Cross-Platform Power)

Unity is the industry standard for XR development. AR Foundation provides a unified API for ARCore (Android), ARKit (iOS), and other platforms.

### Setting Up Unity for XR Development

```
Unity XR Setup Checklist
========================

1. Download Unity Hub
   └── hub.unity3d.com

2. Install Unity 2023.3 LTS or 6.0
   └── Include modules:
       ├── Android Build Support
       ├── iOS Build Support
       └── Windows Build Support

3. Create new 3D (URP) project

4. Install packages via Package Manager:
   ├── AR Foundation (6.x)
   ├── ARCore XR Plugin (Android)
   ├── ARKit XR Plugin (iOS)
   ├── XR Plugin Management
   ├── XR Interaction Toolkit
   └── OpenXR Plugin (for Quest)

5. Configure XR Plugin Management:
   └── Edit → Project Settings → XR Plugin Management
       ├── Android: ARCore ✓
       ├── iOS: ARKit ✓
       └── Windows: OpenXR ✓
```

### Understanding AR Foundation Architecture

```
AR Foundation Architecture
==========================

┌─────────────────────────────────────────────────────────┐
│                  YOUR UNITY PROJECT                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│    ┌────────────────────────────────────────────────┐   │
│    │              AR Foundation                      │   │
│    │  Unified API for all AR features               │   │
│    └──────────────────┬─────────────────────────────┘   │
│                       │                                  │
│       ┌───────────────┼───────────────┐                 │
│       │               │               │                 │
│       ↓               ↓               ↓                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐             │
│  │ ARCore  │    │  ARKit  │    │ OpenXR  │             │
│  │ Plugin  │    │ Plugin  │    │ Plugin  │             │
│  └────┬────┘    └────┬────┘    └────┬────┘             │
│       │              │              │                   │
└───────┼──────────────┼──────────────┼───────────────────┘
        │              │              │
        ↓              ↓              ↓
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Android │    │   iOS   │    │  Quest  │
   │ Devices │    │ Devices │    │ Headset │
   └─────────┘    └─────────┘    └─────────┘
```

### Essential AR Foundation Components

```csharp
// Key components in AR Foundation:

// 1. AR Session - Manages AR lifecycle
[RequireComponent(typeof(ARSession))]

// 2. XR Origin - Tracks device position and orientation
[RequireComponent(typeof(XROrigin))]

// 3. AR Plane Manager - Detects horizontal/vertical surfaces
[RequireComponent(typeof(ARPlaneManager))]

// 4. AR Raycast Manager - Casts rays to detect surfaces
[RequireComponent(typeof(ARRaycastManager))]

// 5. AR Anchor Manager - Places persistent objects
[RequireComponent(typeof(ARAnchorManager))]
```

### Building Your First AR App: Object Placer

Let's create an AR app that places 3D objects on detected surfaces.

**Step 1: Scene Setup**

```
Scene Hierarchy
===============

AR Session Origin
├── AR Session
├── XR Origin
│   ├── Camera Offset
│   │   └── Main Camera
│   │       ├── AR Camera Manager
│   │       └── AR Camera Background
│   └── AR Plane Manager
│       └── AR Raycast Manager
└── [Your UI Canvas]
```

**Step 2: Create the Placement Script**

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using UnityEngine.InputSystem;

public class ARObjectPlacer : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private ARRaycastManager raycastManager;
    [SerializeField] private GameObject objectPrefab;

    [Header("Settings")]
    [SerializeField] private float placementDistance = 0.5f;

    private List<ARRaycastHit> hits = new List<ARRaycastHit>();
    private GameObject placementIndicator;
    private bool canPlace = false;

    void Start()
    {
        // Create a placement indicator (semi-transparent version of prefab)
        CreatePlacementIndicator();
    }

    void Update()
    {
        UpdatePlacementIndicator();
        HandleInput();
    }

    void CreatePlacementIndicator()
    {
        placementIndicator = Instantiate(objectPrefab);

        // Make it semi-transparent
        var renderers = placementIndicator.GetComponentsInChildren<Renderer>();
        foreach (var renderer in renderers)
        {
            var materials = renderer.materials;
            foreach (var mat in materials)
            {
                Color color = mat.color;
                color.a = 0.5f;
                mat.color = color;

                // Enable transparency
                mat.SetFloat("_Mode", 3);
                mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                mat.EnableKeyword("_ALPHABLEND_ON");
                mat.renderQueue = 3000;
            }
        }

        placementIndicator.SetActive(false);
    }

    void UpdatePlacementIndicator()
    {
        // Cast ray from screen center
        Vector2 screenCenter = new Vector2(Screen.width / 2, Screen.height / 2);

        if (raycastManager.Raycast(screenCenter, hits, TrackableType.PlaneWithinPolygon))
        {
            // Hit a surface!
            Pose hitPose = hits[0].pose;

            placementIndicator.SetActive(true);
            placementIndicator.transform.position = hitPose.position;
            placementIndicator.transform.rotation = hitPose.rotation;

            canPlace = true;
        }
        else
        {
            placementIndicator.SetActive(false);
            canPlace = false;
        }
    }

    void HandleInput()
    {
        // Check for screen tap
        if (Touchscreen.current != null &&
            Touchscreen.current.primaryTouch.press.wasPressedThisFrame &&
            canPlace)
        {
            PlaceObject();
        }

        // Also support mouse click for editor testing
        if (Mouse.current != null &&
            Mouse.current.leftButton.wasPressedThisFrame &&
            canPlace)
        {
            PlaceObject();
        }
    }

    void PlaceObject()
    {
        if (!canPlace) return;

        // Create the actual object at indicator position
        GameObject placedObject = Instantiate(
            objectPrefab,
            placementIndicator.transform.position,
            placementIndicator.transform.rotation
        );

        // Optional: Add physics or interaction components
        if (placedObject.GetComponent<Rigidbody>() == null)
        {
            var rb = placedObject.AddComponent<Rigidbody>();
            rb.isKinematic = true;
        }
    }

    // Public method to change the prefab at runtime
    public void SetObjectPrefab(GameObject newPrefab)
    {
        objectPrefab = newPrefab;

        if (placementIndicator != null)
        {
            Destroy(placementIndicator);
        }

        CreatePlacementIndicator();
    }
}
```

**Step 3: Plane Visualization Script**

```csharp
using UnityEngine;
using UnityEngine.XR.ARFoundation;

public class PlaneVisualization : MonoBehaviour
{
    [SerializeField] private ARPlaneManager planeManager;
    [SerializeField] private Material planeMaterial;

    void OnEnable()
    {
        planeManager.planesChanged += OnPlanesChanged;
    }

    void OnDisable()
    {
        planeManager.planesChanged -= OnPlanesChanged;
    }

    void OnPlanesChanged(ARPlanesChangedEventArgs args)
    {
        // New planes detected
        foreach (var plane in args.added)
        {
            Debug.Log($"New plane detected: {plane.classification}");

            // Customize material based on plane type
            var renderer = plane.GetComponent<MeshRenderer>();
            if (renderer != null && planeMaterial != null)
            {
                renderer.material = planeMaterial;

                // Different colors for different plane types
                Color planeColor = plane.classification switch
                {
                    UnityEngine.XR.ARSubsystems.PlaneClassification.Floor => Color.green,
                    UnityEngine.XR.ARSubsystems.PlaneClassification.Wall => Color.blue,
                    UnityEngine.XR.ARSubsystems.PlaneClassification.Ceiling => Color.yellow,
                    UnityEngine.XR.ARSubsystems.PlaneClassification.Table => Color.cyan,
                    _ => Color.white
                };

                planeColor.a = 0.3f;
                renderer.material.color = planeColor;
            }
        }

        // Log updated planes
        foreach (var plane in args.updated)
        {
            Debug.Log($"Plane updated: {plane.trackableId}");
        }

        // Log removed planes
        foreach (var plane in args.removed)
        {
            Debug.Log($"Plane removed: {plane.trackableId}");
        }
    }
}
```

### Face Tracking (iOS ARKit)

```csharp
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

public class FaceTracker : MonoBehaviour
{
    [SerializeField] private ARFaceManager faceManager;
    [SerializeField] private GameObject faceMaskPrefab;

    private Dictionary<TrackableId, GameObject> faceMasks = new();

    void OnEnable()
    {
        faceManager.facesChanged += OnFacesChanged;
    }

    void OnDisable()
    {
        faceManager.facesChanged -= OnFacesChanged;
    }

    void OnFacesChanged(ARFacesChangedEventArgs args)
    {
        // Handle new faces
        foreach (var face in args.added)
        {
            if (!faceMasks.ContainsKey(face.trackableId))
            {
                var mask = Instantiate(faceMaskPrefab, face.transform);
                faceMasks[face.trackableId] = mask;
            }
        }

        // Handle removed faces
        foreach (var face in args.removed)
        {
            if (faceMasks.TryGetValue(face.trackableId, out var mask))
            {
                Destroy(mask);
                faceMasks.Remove(face.trackableId);
            }
        }
    }
}
```

---

## Path 3: Platform-Specific Development

For maximum performance and access to cutting-edge features, native development is the way.

### Meta Quest Development (Unity + Meta XR SDK)

```
Meta Quest Development Stack
============================

┌────────────────────────────────────────────────────────┐
│                      UNITY                              │
├────────────────────────────────────────────────────────┤
│  Meta XR All-in-One SDK (includes):                    │
│  ├── Meta XR Core SDK                                  │
│  ├── Meta XR Interaction SDK                           │
│  ├── Meta XR Platform SDK                              │
│  └── Meta XR Voice SDK                                 │
├────────────────────────────────────────────────────────┤
│  Key Features:                                          │
│  • Passthrough AR (mixed reality)                      │
│  • Hand Tracking 2.0                                    │
│  • Shared Spatial Anchors                              │
│  • Scene Understanding                                  │
│  • Voice commands                                       │
└────────────────────────────────────────────────────────┘
```

**Quest Hand Tracking Example:**

```csharp
using Oculus.Interaction;
using Oculus.Interaction.Input;
using UnityEngine;

public class QuestHandInteraction : MonoBehaviour
{
    [SerializeField] private Hand leftHand;
    [SerializeField] private Hand rightHand;

    void Update()
    {
        // Check if hands are being tracked
        if (leftHand.IsTrackedDataValid)
        {
            // Get fingertip positions
            if (leftHand.GetJointPose(HandJointId.IndexTip, out Pose indexPose))
            {
                Debug.Log($"Left index tip at: {indexPose.position}");
            }

            // Check for pinch gesture
            if (leftHand.GetFingerIsPinching(HandFinger.Index))
            {
                OnPinchDetected(leftHand);
            }
        }

        if (rightHand.IsTrackedDataValid)
        {
            if (rightHand.GetFingerIsPinching(HandFinger.Index))
            {
                OnPinchDetected(rightHand);
            }
        }
    }

    void OnPinchDetected(Hand hand)
    {
        Debug.Log($"{hand.Handedness} hand pinch detected!");
        // Trigger interaction
    }
}
```

### Apple Vision Pro Development (visionOS)

Apple Vision Pro uses SwiftUI and RealityKit for native development.

```swift
// visionOS App Structure
import SwiftUI
import RealityKit

@main
struct MyVisionApp: App {
    var body: some Scene {
        // Window Group - 2D UI floating in space
        WindowGroup {
            ContentView()
        }

        // Immersive Space - 3D content in your room
        ImmersiveSpace(id: "ImmersiveSpace") {
            ImmersiveView()
        }
    }
}

// ContentView.swift
struct ContentView: View {
    @Environment(\.openImmersiveSpace) var openImmersiveSpace

    var body: some View {
        VStack {
            Text("Welcome to Vision Pro!")
                .font(.title)

            Button("Enter Immersive Mode") {
                Task {
                    await openImmersiveSpace(id: "ImmersiveSpace")
                }
            }
            .padding()
        }
    }
}

// ImmersiveView.swift
struct ImmersiveView: View {
    var body: some View {
        RealityView { content in
            // Create a simple 3D sphere
            let sphere = MeshResource.generateSphere(radius: 0.2)
            let material = SimpleMaterial(color: .blue, isMetallic: false)
            let entity = ModelEntity(mesh: sphere, materials: [material])

            // Position it in front of the user
            entity.position = [0, 1.5, -1]

            // Add to scene
            content.add(entity)
        }
    }
}
```

```
Vision Pro Development Requirements
===================================

Hardware:
• Mac with Apple Silicon (M1 or later)
• Apple Vision Pro for testing (or use Simulator)

Software:
• Xcode 15.2 or later
• visionOS SDK
• Reality Composer Pro

Key Concepts:
• Gaze and Pinch: User looks at object, pinches to select
• Spatial Personas: Avatar system for video calls
• SharePlay: Shared experiences across devices
• Hand Tracking: Full hand gesture recognition
```

### Samsung Galaxy XR / Android XR

Samsung Galaxy XR runs Android XR, Google's new operating system for headsets.

```kotlin
// Android XR uses standard Android development patterns
// with additional XR-specific APIs

// Example: Creating an XR Activity
class XRActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable immersive mode
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        )

        // Set up XR content
        setContentView(R.layout.activity_xr)
    }
}

// WebXR is the primary development path for Android XR
// Chrome on Galaxy XR has full WebXR support
```

---

## Indian XR Ecosystem

### Indian XR Startups to Watch

```
Notable Indian XR Companies (2026)
==================================

Company          | Focus Area         | Funding Stage
-----------------|--------------------|--------------
Tesseract        | AR/VR headsets     | Series A
AjnaLens         | Enterprise AR      | Series A
SmartVizX        | VR training        | Seed
Absentia VR      | VR games           | Series A
Merxius          | AR retail          | Seed
Scapic           | AR commerce        | Acquired (Flipkart)
```

### Job Market and Salaries

```
XR Developer Salaries in India (2026)
=====================================

Role                    | Experience | Salary Range
------------------------|------------|--------------
XR Developer (Entry)    | 0-2 years  | ₹6-10 LPA
XR Developer (Mid)      | 2-5 years  | ₹12-20 LPA
XR Developer (Senior)   | 5-8 years  | ₹22-35 LPA
XR Lead/Architect       | 8+ years   | ₹35-50 LPA
Unity Developer (XR)    | 2-5 years  | ₹10-18 LPA

Top Hiring Cities:
• Bangalore (40% of jobs)
• Mumbai (25%)
• Hyderabad (15%)
• Delhi NCR (12%)
• Pune (8%)

Companies Hiring:
• Infosys (XR innovation lab)
• TCS (immersive experiences)
• Wipro (enterprise XR)
• Flipkart (AR shopping)
• Reliance Jio (XR platform)
```

### Learning Resources

**Free Resources:**

1. **Meta Quest Developer Hub** - Official tutorials and documentation
2. **Unity Learn** - Free XR development courses
3. **A-Frame School** - Interactive WebXR tutorials
4. **Google ARCore Codelabs** - Step-by-step AR tutorials

**Paid Courses:**

1. **Udemy: Complete XR Development** - ₹449-3,999
2. **Coursera: XR Specialization** - ₹3,000/month
3. **Unity Certified Developer** - $150 exam

### Indian XR Communities

- **XR Association India** - Industry body
- **VRARA India** - Virtual Reality AR Association
- **XR Developers India** (Discord) - 5,000+ members
- **Bangalore XR Meetup** - Monthly events
- **Mumbai VR** - Active community

---

## Project: AR Business Card

Let's build a complete project - an AR business card that displays your portfolio when someone scans it.

### Concept

```
AR Business Card Flow
=====================

Physical Card                    AR Experience
┌────────────────┐              ┌────────────────┐
│                │              │    [3D Avatar] │
│   TUSHAR       │   Scan      │                │
│   AGRAWAL      │  ─────→     │   Tushar       │
│                │              │   Full Stack   │
│   [QR Code]    │              │   Developer    │
│                │              │                │
│   tushar.dev   │              │  [Portfolio]   │
│                │              │  [LinkedIn]    │
│                │              │  [GitHub]      │
└────────────────┘              └────────────────┘
```

### Implementation (A-Frame + AR.js)

```html
<!DOCTYPE html>
<html>
<head>
    <title>AR Business Card - Tushar Agrawal</title>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://raw.githack.com/AR-js-org/AR.js/3.4.5/aframe/build/aframe-ar.js"></script>
    <style>
        .loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: system-ui;
            z-index: 1000;
        }
        .loading.hidden { display: none; }
    </style>
</head>
<body style="margin: 0; overflow: hidden;">
    <div class="loading" id="loading">
        <p>Point camera at business card...</p>
    </div>

    <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
        vr-mode-ui="enabled: false"
        renderer="logarithmicDepthBuffer: true;">

        <!-- Assets -->
        <a-assets>
            <img id="profile" src="profile-photo.jpg">
            <img id="linkedin" src="linkedin-icon.png">
            <img id="github" src="github-icon.png">
        </a-assets>

        <!-- Barcode marker (you can generate custom markers at AR.js Marker Generator) -->
        <a-marker type="barcode" value="0" smooth="true" smooth-count="5">

            <!-- Profile Photo -->
            <a-image
                src="#profile"
                position="0 0.5 0.1"
                width="0.4"
                height="0.4"
                rotation="-90 0 0"
                animation="property: position; to: 0 0.8 0.1; dir: alternate; loop: true; dur: 2000; easing: easeInOutQuad">
            </a-image>

            <!-- Name -->
            <a-text
                value="TUSHAR AGRAWAL"
                position="0 0.5 -0.3"
                rotation="-90 0 0"
                color="#333"
                width="2"
                align="center"
                font="monoid">
            </a-text>

            <!-- Title -->
            <a-text
                value="Full Stack Developer"
                position="0 0.5 -0.5"
                rotation="-90 0 0"
                color="#666"
                width="1.5"
                align="center">
            </a-text>

            <!-- Skills badges (3D boxes) -->
            <a-box
                position="-0.4 0.2 -0.7"
                width="0.3"
                height="0.05"
                depth="0.15"
                rotation="-90 0 0"
                color="#61DAFB"
                animation="property: rotation; to: -90 360 0; loop: true; dur: 4000">
                <a-text value="React" position="0 0.6 0" color="#000" width="3" align="center"></a-text>
            </a-box>

            <a-box
                position="0 0.2 -0.7"
                width="0.3"
                height="0.05"
                depth="0.15"
                rotation="-90 0 0"
                color="#3776AB"
                animation="property: rotation; to: -90 360 0; loop: true; dur: 4500">
                <a-text value="Python" position="0 0.6 0" color="#fff" width="3" align="center"></a-text>
            </a-box>

            <a-box
                position="0.4 0.2 -0.7"
                width="0.3"
                height="0.05"
                depth="0.15"
                rotation="-90 0 0"
                color="#00ADD8"
                animation="property: rotation; to: -90 360 0; loop: true; dur: 5000">
                <a-text value="Go" position="0 0.6 0" color="#fff" width="3" align="center"></a-text>
            </a-box>

            <!-- Social links -->
            <a-entity position="-0.2 0.1 -0.9">
                <a-image
                    src="#linkedin"
                    width="0.15"
                    height="0.15"
                    rotation="-90 0 0"
                    class="clickable"
                    link="href: https://linkedin.com/in/tushar-agrawal">
                </a-image>
            </a-entity>

            <a-entity position="0.2 0.1 -0.9">
                <a-image
                    src="#github"
                    width="0.15"
                    height="0.15"
                    rotation="-90 0 0"
                    class="clickable"
                    link="href: https://github.com/tushar-agrawal">
                </a-image>
            </a-entity>

            <!-- Contact CTA -->
            <a-box
                position="0 0.1 -1.1"
                width="0.6"
                height="0.05"
                depth="0.15"
                rotation="-90 0 0"
                color="#4CAF50"
                class="clickable"
                animation__hover="property: scale; to: 1.1 1.1 1.1; startEvents: mouseenter; dur: 200"
                animation__leave="property: scale; to: 1 1 1; startEvents: mouseleave; dur: 200">
                <a-text value="Contact Me" position="0 0.6 0" color="#fff" width="3" align="center"></a-text>
            </a-box>
        </a-marker>

        <a-entity camera></a-entity>
    </a-scene>

    <script>
        // Hide loading when marker is found
        AFRAME.registerComponent('marker-handler', {
            init: function () {
                this.el.addEventListener('markerFound', () => {
                    document.getElementById('loading').classList.add('hidden');
                });
                this.el.addEventListener('markerLost', () => {
                    document.getElementById('loading').classList.remove('hidden');
                });
            }
        });
    </script>
</body>
</html>
```

---

## VR Portfolio Gallery (Three.js)

For a more immersive portfolio experience:

```javascript
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class VRPortfolio {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.projects = [
            { title: 'E-Commerce Platform', image: 'project1.jpg', tech: 'React, Node.js, PostgreSQL' },
            { title: 'AI Dashboard', image: 'project2.jpg', tech: 'Python, FastAPI, TensorFlow' },
            { title: 'Mobile App', image: 'project3.jpg', tech: 'React Native, Firebase' },
            { title: 'Microservices', image: 'project4.jpg', tech: 'Go, Kubernetes, gRPC' },
        ];

        this.init();
    }

    init() {
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Environment
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.createEnvironment();
        this.createGallery();
        this.setupControllers();

        // Start render loop
        this.renderer.setAnimationLoop(() => this.animate());

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    createEnvironment() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Spotlights for each project
        this.projects.forEach((_, index) => {
            const angle = (index / this.projects.length) * Math.PI * 2;
            const x = Math.cos(angle) * 5;
            const z = Math.sin(angle) * 5;

            const spotlight = new THREE.SpotLight(0xffffff, 1);
            spotlight.position.set(x, 4, z);
            spotlight.target.position.set(x * 0.7, 1.5, z * 0.7);
            spotlight.angle = 0.3;
            spotlight.penumbra = 0.5;
            this.scene.add(spotlight);
            this.scene.add(spotlight.target);
        });

        // Floor
        const floorGeometry = new THREE.CircleGeometry(10, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d44,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    createGallery() {
        const loader = new THREE.TextureLoader();
        const radius = 4;

        this.projects.forEach((project, index) => {
            const angle = (index / this.projects.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Frame
            const frameGroup = new THREE.Group();

            // Project image
            const imageGeometry = new THREE.PlaneGeometry(1.6, 1);
            const imageMaterial = new THREE.MeshStandardMaterial({
                map: loader.load(project.image),
                metalness: 0,
                roughness: 0.5
            });
            const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
            imageMesh.position.y = 1.8;
            frameGroup.add(imageMesh);

            // Frame border
            const borderGeometry = new THREE.BoxGeometry(1.7, 1.1, 0.05);
            const borderMaterial = new THREE.MeshStandardMaterial({
                color: 0x333344,
                metalness: 0.8,
                roughness: 0.2
            });
            const border = new THREE.Mesh(borderGeometry, borderMaterial);
            border.position.y = 1.8;
            border.position.z = -0.03;
            frameGroup.add(border);

            // Title
            const titleCanvas = this.createTextCanvas(project.title, '24px Arial', '#ffffff', 256, 32);
            const titleTexture = new THREE.CanvasTexture(titleCanvas);
            const titleGeometry = new THREE.PlaneGeometry(1.4, 0.15);
            const titleMaterial = new THREE.MeshBasicMaterial({
                map: titleTexture,
                transparent: true
            });
            const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
            titleMesh.position.y = 1.15;
            frameGroup.add(titleMesh);

            // Tech stack
            const techCanvas = this.createTextCanvas(project.tech, '14px Arial', '#aaaaaa', 256, 24);
            const techTexture = new THREE.CanvasTexture(techCanvas);
            const techGeometry = new THREE.PlaneGeometry(1.4, 0.1);
            const techMaterial = new THREE.MeshBasicMaterial({
                map: techTexture,
                transparent: true
            });
            const techMesh = new THREE.Mesh(techGeometry, techMaterial);
            techMesh.position.y = 1.0;
            frameGroup.add(techMesh);

            // Position frame
            frameGroup.position.set(x, 0, z);
            frameGroup.lookAt(0, 1.5, 0);

            this.scene.add(frameGroup);
        });
    }

    createTextCanvas(text, font, color, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, width, height);

        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        return canvas;
    }

    setupControllers() {
        const controllerModelFactory = new XRControllerModelFactory();

        // Controller 0 (left)
        const controller0 = this.renderer.xr.getController(0);
        controller0.addEventListener('selectstart', () => this.onSelect(controller0));
        this.scene.add(controller0);

        const controllerGrip0 = this.renderer.xr.getControllerGrip(0);
        controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
        this.scene.add(controllerGrip0);

        // Controller 1 (right)
        const controller1 = this.renderer.xr.getController(1);
        controller1.addEventListener('selectstart', () => this.onSelect(controller1));
        this.scene.add(controller1);

        const controllerGrip1 = this.renderer.xr.getControllerGrip(1);
        controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
        this.scene.add(controllerGrip1);

        // Pointer lines
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const line = new THREE.Line(geometry, material);

        controller0.add(line.clone());
        controller1.add(line.clone());
    }

    onSelect(controller) {
        // Raycast from controller to detect project frames
        const raycaster = new THREE.Raycaster();
        const tempMatrix = new THREE.Matrix4();

        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Handle selection - could open project details, link, etc.
            console.log('Selected:', intersects[0].object);
        }
    }

    animate() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the application
const portfolio = new VRPortfolio();
```

---

## Deployment Guide

### Deploying WebXR to the Web

```bash
# Build for production
npx vite build

# Deploy to Vercel
npm i -g vercel
vercel

# Deploy to Netlify
npm i -g netlify-cli
netlify deploy --prod

# Deploy to GitHub Pages
npm i -g gh-pages
gh-pages -d dist
```

### Deploying to Meta Quest (Unity)

```
Quest Deployment Checklist
==========================

1. Build Settings:
   └── File → Build Settings → Android → Switch Platform

2. Player Settings:
   ├── Company Name: Your company
   ├── Product Name: Your app name
   ├── Minimum API Level: Android 10.0 (API 29)
   └── Target API Level: Android 12.0 (API 32)

3. XR Plugin Management:
   └── Enable Oculus for Android

4. OVR Manager settings:
   ├── Target Devices: Quest 3
   ├── Hand Tracking Support: Controllers and Hands
   └── Enable Passthrough (for MR)

5. Build and Run:
   └── Connect Quest via USB → Build and Run

6. For Store submission:
   └── Upload to Meta Quest Developer Hub
       └── dashboard.oculus.com
```

### Deploying to iOS (Unity AR Foundation)

```
iOS Deployment Checklist
========================

1. Xcode installed on Mac

2. Apple Developer account ($99/year)

3. Unity Build Settings:
   └── Switch Platform to iOS

4. Player Settings:
   ├── Bundle Identifier: com.yourcompany.appname
   ├── Camera Usage Description: "AR requires camera"
   ├── Target minimum iOS Version: 14.0
   └── Architecture: ARM64

5. XR Plugin Management:
   └── Enable ARKit for iOS

6. Build:
   └── Build → Creates Xcode project

7. In Xcode:
   ├── Select your team
   ├── Connect device
   └── Build and Run
```

---

## 2026-2027 XR Outlook

```
What's Coming in XR
===================

2026 Predictions:
─────────────────
• True AR glasses from multiple manufacturers
• Quest 4 announcement (higher resolution, better passthrough)
• Android XR ecosystem growth
• WebXR WebGPU integration for better graphics
• Hand tracking becoming primary input

2027 and Beyond:
─────────────────
• AR glasses replace phones for some users
• Spatial computing becomes mainstream
• Enterprise XR adoption accelerates
• Neural interfaces early experiments
• Photorealistic avatars standard

Skills to Develop Now:
─────────────────────
✓ 3D mathematics (vectors, matrices, quaternions)
✓ WebGL/WebGPU fundamentals
✓ Unity or Unreal proficiency
✓ Spatial UI/UX design
✓ Performance optimization
✓ Cross-platform development
```

---

## Quick Reference: XR Development Commands

```bash
# WebXR (Three.js)
npm create vite@latest my-xr-app -- --template vanilla
cd my-xr-app
npm install three
npm run dev

# WebXR (A-Frame) - No install needed!
# Just create an HTML file with A-Frame script

# Unity CLI
# Create new project
unity -createProject MyXRProject -cloneFromTemplate ar3d

# Android build
unity -batchmode -buildTarget Android -executeMethod BuildScript.BuildAndroid

# Meta Quest (ADB)
adb devices                           # List connected devices
adb install -r myapp.apk              # Install APK
adb logcat -s Unity                   # View Unity logs

# Cloudflare Workers (for WebXR hosting)
npm create cloudflare@latest my-xr-site
cd my-xr-site
npx wrangler deploy
```

---

## Common Beginner Mistakes (And How to Avoid Them)

```
XR Development Pitfalls
=======================

❌ Mistake: Building without testing on device
✅ Fix: Test early and often on actual hardware

❌ Mistake: Ignoring performance from the start
✅ Fix: Profile regularly, target 72fps minimum

❌ Mistake: Complex UI in VR
✅ Fix: Keep interactions simple, use diegetic UI

❌ Mistake: Causing motion sickness
✅ Fix: Never move the camera without user input

❌ Mistake: Tiny text and UI elements
✅ Fix: Design for arm's length viewing distance

❌ Mistake: No fallback for non-XR users
✅ Fix: Provide 2D fallback or clear requirements

❌ Mistake: Hardcoding for one platform
✅ Fix: Use abstraction layers (AR Foundation, WebXR)
```

---

## Conclusion: Your XR Journey Starts Now

You've learned:

1. **What XR is** - AR, VR, MR, and the umbrella term XR
2. **Hardware landscape** - Quest 3, Vision Pro, Galaxy XR options
3. **Three development paths** - WebXR, Unity, and Native
4. **WebXR basics** - Three.js and A-Frame for browser-based XR
5. **Unity AR Foundation** - Cross-platform mobile AR development
6. **Platform-specific features** - Quest, Vision Pro, Android XR
7. **Indian ecosystem** - Jobs, salaries, communities
8. **Complete projects** - AR business card, VR portfolio

**Your next steps:**

1. **Today:** Install development tools (Node.js for WebXR or Unity)
2. **This week:** Complete your first VR scene (use the Three.js code above)
3. **This month:** Build the AR business card project
4. **Next month:** Deploy your first app to Quest or web

The XR industry is growing fast, and there's never been a better time to start. The barrier to entry is low (you can start with just a browser), but the ceiling is incredibly high.

**Welcome to the future of computing.**

---

## Resources

### Official Documentation
- [WebXR Device API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Three.js Documentation](https://threejs.org/docs/)
- [A-Frame Documentation](https://aframe.io/docs/)
- [Unity AR Foundation](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/manual/index.html)
- [Meta Quest Developer](https://developer.oculus.com/)
- [Apple visionOS](https://developer.apple.com/visionos/)

### Learning Platforms
- [Unity Learn - XR](https://learn.unity.com/pathway/vr-development)
- [Meta Quest Developer Hub](https://developer.oculus.com/learn/)
- [Immersive Web Working Group](https://immersiveweb.dev/)

### Communities
- [WebXR Discord](https://discord.gg/webxr)
- [r/WebXR](https://reddit.com/r/webxr)
- [r/OculusQuest](https://reddit.com/r/oculusquest)
- [XR Developers India](https://discord.gg/xrindia)

---

*This guide is part of my series on emerging technologies for Indian developers. Follow for more in-depth technical guides.*
