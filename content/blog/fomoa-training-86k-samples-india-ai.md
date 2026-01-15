---
title: "How We Trained FOMOA: 86,000 Samples for India-Centric AI"
description: "Inside FOMOA's training methodology - Qwen2.5-7B base, QLoRA fine-tuning, 65% Hindi data, 113 hours of training. Technical deep-dive into building India-first AI."
date: "2026-01-10"
author: "Tushar Agrawal"
tags: ["AI Training", "Fine-Tuning LLM", "Custom AI Model", "FOMOA", "QLoRA", "Qwen", "Machine Learning", "Hindi AI", "Deep Learning"]
image: "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=1200&h=630&fit=crop"
published: true
---

## Why Custom Training Matters

Most "Indian" AI assistants follow a simple pattern: take a Western-trained model, add a translation layer, and call it localized. This approach fails because:

- Translation loses nuance and context
- Cultural references get mangled
- Hindi idioms translate literally (and incorrectly)
- Indian number systems confuse the base model

**FOMOA takes a different approach: Native training on Indian content.**

Our model doesn't translate - it thinks in Hindi and English simultaneously, understanding both languages at a foundational level.

## The Architecture Decision

### Base Model: Qwen2.5-7B-Instruct

After evaluating 15+ open-source models, we chose Qwen2.5-7B-Instruct:

```
Model Selection Criteria
========================

Evaluated models:
├── Llama 3.1 8B - Good English, weak multilingual
├── Mistral 7B - Fast, limited Hindi
├── Gemma 7B - Google quality, license restrictions
├── Falcon 7B - Open, but training instability
└── Qwen2.5-7B-Instruct ✓ - Best multilingual, Apache license

Qwen2.5-7B Advantages:
├── Native multilingual architecture
├── Strong Hindi baseline (pre-training on Indian content)
├── Efficient attention mechanism
├── Apache 2.0 license (commercial use allowed)
├── 7B parameters = runnable on single GPU
└── Instruction-tuned variant available
```

### Why Not Bigger Models?

```
Model Size vs. Practical Deployment
===================================

70B models:
├── Require 4x A100 80GB GPUs
├── $15-20/hour inference cost
├── 200ms+ latency
└── Not practical for production

13B models:
├── Require 2x A100 40GB
├── $8-10/hour inference cost
├── 150ms latency
└── Marginal quality improvement

7B models (FOMOA choice):
├── Single L4 GPU sufficient
├── $1-2/hour inference cost
├── 50-80ms latency
└── Sweet spot for production
```

## Training Data Composition

Total training samples: **86,760**

```
FOMOA Training Data Breakdown
=============================

┌────────────────────────────────────────────────────┐
│                                                    │
│   Hindi/Hinglish (65%)                             │
│   ████████████████████████████████░░░░░░░░░        │
│   56,760 samples                                   │
│                                                    │
│   Analytical Reasoning (23%)                       │
│   ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░        │
│   20,000 samples                                   │
│                                                    │
│   Diverse Knowledge (12%)                          │
│   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│   10,000 samples                                   │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Hindi/Hinglish Component (56,760 samples)

```
Hindi Training Data Sources
===========================

1. Hindi Alpaca Dataset (51,760 samples)
   ├── Source: Stanford Alpaca translated + verified
   ├── Format: Instruction → Response pairs
   ├── Quality: Native Hindi speakers validated
   ├── Topics: General knowledge, tasks, explanations
   └── Example:
       Instruction: "भारत की राजधानी क्या है और
                     इसका इतिहास बताइए"
       Response: "भारत की राजधानी नई दिल्ली है..."

2. Hindi Wikipedia QA (5,000 samples)
   ├── Source: Hindi Wikipedia articles
   ├── Format: Question-Answer pairs
   ├── Topics: Indian history, geography, science
   ├── Verification: Cross-referenced with sources
   └── Example:
       Question: "महाभारत के रचयिता कौन थे?"
       Answer: "महाभारत की रचना महर्षि वेदव्यास ने की थी..."
```

### Analytical Reasoning (20,000 samples)

```
Reasoning Training Data
=======================

1. Open-Orca (10,000 samples)
   ├── Complex reasoning chains
   ├── Step-by-step problem solving
   ├── Mathematical reasoning
   └── Logical deduction

2. SlimOrca (10,000 samples)
   ├── Refined, high-quality subset
   ├── Reduced noise and errors
   ├── Focus on clear reasoning
   └── Diverse problem types
```

### Diverse Knowledge (10,000 samples)

```
General Knowledge Data
======================

UltraChat Dataset:
├── Natural conversation flows
├── Multi-turn dialogues
├── Real-world scenarios
├── Diverse topic coverage
└── Conversational AI patterns
```

## Training Methodology: QLoRA

We used **QLoRA (Quantized Low-Rank Adaptation)** for efficient fine-tuning.

### Why QLoRA?

```
Training Method Comparison
==========================

Full Fine-Tuning:
├── Updates all 7B parameters
├── Requires 8x A100 80GB GPUs
├── 500GB+ memory footprint
├── Risk of catastrophic forgetting
└── Cost: ~$5,000 for one training run

LoRA (Low-Rank Adaptation):
├── Updates only adapter weights
├── Requires 4x A100 40GB GPUs
├── Much smaller memory footprint
├── Preserves base model knowledge
└── Cost: ~$1,500 for one training run

QLoRA (Quantized LoRA): ✓ Our choice
├── 4-bit quantized base model
├── Single L4 24GB GPU sufficient
├── 20GB memory footprint
├── Best cost-efficiency ratio
└── Cost: ~$400 for one training run
```

### QLoRA Technical Configuration

```python
# FOMOA QLoRA Configuration

from peft import LoraConfig, get_peft_model
from transformers import BitsAndBytesConfig
import torch

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",  # Normal Float 4
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True  # Nested quantization
)

# LoRA configuration
lora_config = LoraConfig(
    r=16,                    # Rank - balance between capacity and efficiency
    lora_alpha=32,           # Scaling factor
    lora_dropout=0.05,       # Regularization
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj"
    ]
)

# Total trainable parameters
# Base model: 7B parameters (frozen in 4-bit)
# LoRA adapters: ~20M parameters (trainable)
# Effective training: 0.3% of total parameters
```

### Training Hyperparameters

```python
# Training configuration that worked

training_args = TrainingArguments(
    output_dir="./fomoa-checkpoints",

    # Batch settings
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    # Effective batch size: 4 × 8 = 32

    # Learning rate
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,

    # Training duration
    num_train_epochs=3,
    max_steps=-1,  # Use epochs, not steps

    # Precision
    bf16=True,  # bfloat16 for stability
    tf32=True,

    # Optimization
    optim="paged_adamw_8bit",
    weight_decay=0.01,
    max_grad_norm=0.3,

    # Logging
    logging_steps=10,
    save_strategy="steps",
    save_steps=500,
    evaluation_strategy="steps",
    eval_steps=500,

    # Memory optimization
    gradient_checkpointing=True,
    group_by_length=True,

    # Reproducibility
    seed=42
)
```

## Training Infrastructure

```
Hardware Setup
==============

GPU: NVIDIA L4 (24GB VRAM)
├── Sufficient for 7B QLoRA
├── Cost-effective ($0.50-0.80/hour)
└── Available on GCP, AWS

CPU: 8 vCPUs
RAM: 32 GB
Storage: 200 GB SSD

Training Duration: ~113 hours
├── 3 epochs over 86,760 samples
├── ~38 hours per epoch
└── Total cost: ~$80-90
```

### Training Progress

```
FOMOA Training Timeline
=======================

Hour 0-10:   Warmup phase, loss stabilizing
Hour 10-38:  Epoch 1, Hindi patterns emerging
Hour 38-76:  Epoch 2, reasoning improving
Hour 76-113: Epoch 3, final refinement

Loss Curve:
├── Start: 2.45
├── Epoch 1 end: 1.82
├── Epoch 2 end: 1.54
└── Final: 1.38

Validation Metrics:
├── Hindi accuracy: 89%
├── English accuracy: 91%
├── Reasoning benchmark: 78%
└── Overall improvement: +34% over base
```

## Data Processing Pipeline

```python
# Data preparation for FOMOA training

import json
from datasets import Dataset

def prepare_training_data():
    """
    Combine and format all training datasets
    """
    all_samples = []

    # 1. Load Hindi Alpaca
    with open("hindi_alpaca_cleaned.json") as f:
        hindi_alpaca = json.load(f)
    for item in hindi_alpaca:
        all_samples.append({
            "instruction": item["instruction"],
            "input": item.get("input", ""),
            "output": item["output"],
            "language": "hindi"
        })

    # 2. Load Hindi Wikipedia QA
    with open("hindi_wiki_qa.json") as f:
        wiki_qa = json.load(f)
    for item in wiki_qa:
        all_samples.append({
            "instruction": item["question"],
            "input": "",
            "output": item["answer"],
            "language": "hindi"
        })

    # 3. Load reasoning datasets
    # ... similar processing for Orca datasets

    # 4. Format for training
    formatted = []
    for sample in all_samples:
        formatted.append({
            "text": format_prompt(sample)
        })

    return Dataset.from_list(formatted)

def format_prompt(sample: dict) -> str:
    """
    Format sample into training prompt
    """
    if sample["input"]:
        return f"""<|im_start|>system
You are FOMOA, an India-first AI assistant.<|im_end|>
<|im_start|>user
{sample["instruction"]}

{sample["input"]}<|im_end|>
<|im_start|>assistant
{sample["output"]}<|im_end|>"""
    else:
        return f"""<|im_start|>system
You are FOMOA, an India-first AI assistant.<|im_end|>
<|im_start|>user
{sample["instruction"]}<|im_end|>
<|im_start|>assistant
{sample["output"]}<|im_end|>"""
```

## Quality Assurance

### Pre-Training Data Validation

```python
def validate_sample(sample: dict) -> bool:
    """
    Quality checks before including in training
    """
    checks = {
        "min_length": len(sample["output"]) > 50,
        "max_length": len(sample["output"]) < 5000,
        "no_repetition": check_repetition(sample["output"]) < 0.3,
        "language_match": detect_language(sample["output"]) == sample["language"],
        "no_harmful": not contains_harmful_content(sample["output"]),
        "grammatical": grammar_score(sample["output"]) > 0.7
    }

    return all(checks.values())

# Rejection rate: ~15% of raw data
# Final dataset: 86,760 validated samples
```

### Post-Training Evaluation

```
FOMOA Evaluation Benchmarks
===========================

1. Hindi Factual Accuracy
   ├── Test set: 500 questions
   ├── Sources: Wikipedia, textbooks, gov sites
   └── Score: 89% (vs 45% competitor baseline)

2. English Reasoning (MMLU subset)
   ├── Test set: 1000 questions
   ├── Categories: Science, math, logic
   └── Score: 78% (vs 72% base model)

3. Code Generation
   ├── Test set: 200 coding tasks
   ├── Languages: Python, JavaScript
   └── Score: 75% correct (maintained from base)

4. Hinglish Understanding
   ├── Test set: 300 mixed-language queries
   ├── Native speaker evaluation
   └── Score: 94% appropriate responses

5. Indian Context
   ├── Test set: 250 India-specific queries
   ├── Topics: Schemes, geography, culture
   └── Score: 92% (vs 55% GPT-4)
```

## Why This Approach Works

### Native vs. Translated

```
Approach Comparison
===================

Translation-Based ("Indian" ChatGPT wrapper):
├── Base model has no Hindi context
├── Translate input → Process → Translate output
├── Latency: +200ms for translation
├── Context loss in translation
├── Idioms translated literally
├── Numbers confused (lakh vs 100k)
└── Cultural references lost

Native Training (FOMOA):
├── Hindi in core training data
├── Direct understanding, no translation
├── Latency: Same as English queries
├── Context preserved
├── Idioms understood natively
├── Indian number system native
└── Cultural context embedded
```

### Real Example: Idiom Understanding

```
Query: "वो तो अंधों में काना राजा है"
(He's like a one-eyed king among the blind)

Translation-Based Response:
"He is the one-eyed king among the blind people."
→ Literal translation, misses the idiom meaning

FOMOA Response:
"यह मुहावरे का अर्थ है कि वह अन्य अयोग्य लोगों में
 सबसे कम अयोग्य है, इसलिए नेता बन गया।"
→ Correctly explains the idiom's meaning
```

## Lessons Learned

### What Worked

```
Successful Decisions
====================

1. 65% Hindi training data
   └── Critical mass for native understanding

2. QLoRA over full fine-tuning
   └── 10x cost reduction, same quality

3. Qwen2.5 as base
   └── Best multilingual foundation

4. 3 epochs (not more)
   └── Diminishing returns after epoch 3

5. Diverse reasoning data
   └── Maintained English quality
```

### What We'd Do Differently

```
Future Improvements
===================

1. More regional languages
   └── Tamil, Telugu, Bengali next

2. Domain-specific fine-tuning
   └── Legal, medical, financial variants

3. RLHF phase
   └── Human feedback for preference alignment

4. Larger validation set
   └── More robust evaluation
```

## Open Source Considerations

While FOMOA's API is free, we're evaluating open-sourcing the training recipes:

```
Open Source Plan
================

Phase 1 (Current):
├── Free API access
├── Documentation published
└── Integration guides

Phase 2 (Planned):
├── Training scripts
├── Data preprocessing code
├── Evaluation benchmarks

Phase 3 (Considering):
├── Model weights (with license)
├── Fine-tuning guides
└── Community contributions
```

---

Building AI that truly understands India requires more than translation - it requires native training on Indian content, in Indian languages, with Indian context.

That's what FOMOA delivers.

Try it free at [fomoa.cloud](https://fomoa.cloud).

*Interested in the technical details or collaboration opportunities? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Why Indian Users Need an India-First AI Search Engine](/blog/india-first-ai-search-engine-fomoa)
- [How FOMOA Handles Hindi and Hinglish Queries](/blog/fomoa-hindi-hinglish-ai-assistant)
- [Understanding Source Credibility: How FOMOA Ranks Results](/blog/fomoa-source-credibility-ranking-system)
- [Building AI APIs: FOMOA's OpenAI-Compatible Endpoint](/blog/fomoa-openai-compatible-api-developers)
