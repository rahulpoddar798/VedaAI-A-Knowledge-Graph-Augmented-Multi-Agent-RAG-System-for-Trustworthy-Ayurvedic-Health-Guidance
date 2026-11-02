<div align="center">

<!-- Animated Header Banner via SVG -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a365d,100:2b6cb0&height=200&section=header&text=🌿%20VedaAI&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Knowledge-Graph%20Augmented%20Multi-Agent%20RAG%20for%20Ayurvedic%20Health&descAlignY=60&descSize=18&descColor=e2e8f0" width="100%"/>

<!-- Animated typing effect -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=2B6CB0&center=true&vCenter=true&width=800&lines=Replacing+probabilistic+hope+with+deterministic+safety+%F0%9F%94%AC;Neo4j+Knowledge+Graph+%2B+5-Agent+Debate+Pipeline+%F0%9F%A4%96;Live+Cloud+Graph+%E2%80%94+46+entities+%2C+150%2B+relationship+edges+%F0%9F%8C%BF;Phase+1+%E2%9C%85+Complete+%7C+Phase+2+%F0%9F%94%84+In+Progress" alt="Typing SVG" />
</a>

<br/>
<br/>

<!-- Badges Row 1 -->
[![AKGEC](https://img.shields.io/badge/🏫_AKGEC-Ghaziabad-1a365d?style=for-the-badge)](https://www.akgec.ac.in/)
[![AKTU](https://img.shields.io/badge/🎓_AKTU-2023--2027-2b6cb0?style=for-the-badge)](https://aktu.ac.in/)
[![Phase 1](https://img.shields.io/badge/Phase_1-✅_Complete-22863a?style=for-the-badge)](/)
[![Phase 2](https://img.shields.io/badge/Phase_2-🔄_Building-e6a817?style=for-the-badge)](/)

<br/>

<!-- Badges Row 2 -->
[![Neo4j](https://img.shields.io/badge/Neo4j_Aura-Live_Cloud_Graph-00b5ad?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com/cloud/aura/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/rahulpoddar798/vedaai?style=for-the-badge&color=gold&logo=github)](/)

</div>

---

## 🎯 What Is VedaAI?

<table>
<tr>
<td width="60%">

**VedaAI** is a neuro-symbolic AI system for **safe Ayurvedic health guidance** — the first to combine a live cloud Knowledge Graph with an adversarial 5-Agent debate pipeline.

Existing RAG chatbots like AyurGenie achieve **85–90%** on simple queries but drop to **78–83%** on complex multi-hop clinical cases — because they cannot detect pharmacological contraindications.

VedaAI intercepts these with **deterministic graph traversals** before any unsafe answer reaches the user.

</td>
<td width="40%" align="center">

```
🌿 Herb Query
      │
      ▼
📊 Knowledge Graph
 (Neo4j Aura Cloud)
      │
   ┌──┴──┐
   ▼     ▼
👍 Pro  👎 Opp
 Agent  Agent
   └──┬──┘
      ▼
  ⚖️ Judge
      │
      ▼
✅ SAFE  ❌ UNSAFE
```

</td>
</tr>
</table>

---

## ⚡ The Flagship Demo

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════╗
║         🧪 THE CLINICAL TRAP QUERY BENCHMARK                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Query: "Can I take Ginger for digestion in summer with             ║
║          acid reflux?"                                               ║
║                                                                      ║
║  Patient: Prakriti = Pitta-Vata | Season = Grishma (Summer)         ║
║           Condition = Acid Reflux                                    ║
╠═══════════════════════════╦══════════════════════════════════════════╣
║  💬 Standard RAG          ║  🌿 VedaAI                               ║
║  "Yes! Ginger is great    ║  ❌ UNSAFE — 97% Confidence              ║
║   for digestion."  ❌      ║                                          ║
║   (DANGEROUS)             ║  Triple Pitta Collision Detected:        ║
║                           ║  [1] Ginger Virya = Ushna (🔥 Hot)      ║
║                           ║  [2] Grishma = Pitta dominant season    ║
║                           ║  [3] Acid Reflux = Pitta disorder       ║
║                           ║                                          ║
║                           ║  ✅ Safe Alternative: Amla / Saunf       ║
╚═══════════════════════════╩══════════════════════════════════════════╝
```

</div>

**Run it yourself in 3 seconds:**
```bash
git clone https://github.com/rahulpoddar798/vedaai.git
cd vedaai && npm install
# Add your .env credentials (see setup below)
node demo.js
```

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER QUERY LAYER                                  │
│              "Herb for symptom in season with condition?"                 │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │   🤖 AGENT 1: Entity Extractor       │
           │   Normalizes: "adrak" → Zingiber     │
           │   officinale (Levenshtein Matching)   │
           └──────────────────┬──────────────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │   🔧 AGENT 2: Cypher Query Builder   │
           │   Generates & runs live Neo4j        │
           │   multi-hop graph traversals         │
           └──────┬───────────────────────┬───────┘
                  │                       │
    ┌─────────────▼──────┐    ┌───────────▼──────────────┐
    │  🗄️ NEO4J AURA      │    │  📚 CHROMADB             │
    │  Symbolic Layer     │    │  Semantic Layer           │
    │  46 entities        │    │  Charaka Samhita chunks   │
    │  150+ edges         │    │  768-dim embeddings       │
    │  Hard constraints   │    │  HNSW cosine search       │
    └─────────────┬───────┘    └───────────┬──────────────┘
                  └───────────┬────────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │   👍 AGENT 3: Proponent Agent        │
           │   "Ginger aids digestion (Agni)"     │
           └──────────────────┬──────────────────┘
           ┌──────────────────▼──────────────────┐
           │   👎 AGENT 4: Opponent Agent         │
           │   "TRIPLE PITTA COLLISION DETECTED!" │
           │   NEO4J: Ginger→AGGRAVATES→Pitta     │
           │   NEO4J: Grishma→DOMINANT_IN→Pitta   │
           │   NEO4J: Reflux→ASSOCIATED_WITH→Pitta│
           └──────────────────┬──────────────────┘
           ┌──────────────────▼──────────────────┐
           │   ⚖️  AGENT 5: Judge Arbitrator      │
           │   Confidence Score = 97%             │
           │   Verdict: UNSAFE ❌                  │
           │   Alternative: Amla / Saunf ✅        │
           └─────────────────────────────────────┘
```

---

## 📁 Project Structure

```
vedaai/
│
├── 🚀 demo.js                    ← Run this first! Main 5-agent pipeline
├── 🔍 query_herb.js              ← Inspect any herb live from cloud graph
├── 📦 package.json               ← Node.js dependencies
├── 🔐 .env.example               ← Copy to .env, add your credentials
│
├── 📁 data/
│   ├── Plant_Information_IMPPAT.tsv              (541 KB)
│   ├── IMPPAT_TherapeuticUse_Plant_Association.tsv (7.35 MB)
│   ├── IMPPAT_SingleHerbalFormulations.tsv        (304 KB)
│   └── vedaai_seed.cypher                         ← Seed script for Neo4j
│
├── 📁 scripts/
│   ├── generate_cypher.js        ← Parses IMPPAT TSV → Cypher seed
│   ├── convert_chapter6_only_to_docx.js
│   └── convert_synopsis_to_docx.js
│
├── 📁 images/
│   ├── figure_6_0_system_architecture.jpg  ← 3-tier architecture diagram
│   ├── figure_6_1_neo4j_nodes.png          ← Neo4j entity cloud
│   ├── figure_6_2_neo4j_relationships.png  ← Active graph sub-network
│   ├── figure_6_3_terminal_part1.png       ← Execution trace Part 1
│   ├── figure_6_4_terminal_part2.png       ← Execution trace Part 2
│   └── figure_6_5_terminal_part3.png       ← Execution trace Part 3
│
├── 📄 Chapter_6_System_Implementation.md
├── 📄 VedaAI_Synopsis_Intro_Abstract_LitReview.md
└── 📄 VedaAI_Phase1_Work_Completed_Report.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | v18+ | `node --version` |
| npm | v9+ | `npm --version` |
| Git | any | `git --version` |
| Neo4j Aura | Free tier | [console.neo4j.io](https://console.neo4j.io) |

### 1️⃣ Clone & Install

```bash
git clone https://github.com/rahulpoddar798/vedaai.git
cd vedaai
npm install
```

### 2️⃣ Configure Credentials

```bash
cp .env.example .env
```

Open `.env` and fill in:
```env
NEO4J_URI=neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io
NEO4J_USERNAME=YOUR_USERNAME
NEO4J_PASSWORD=YOUR_PASSWORD
```

> 🔑 **Get credentials from:** Rahul Kumar (Team Lead) — `rahulpoddar798@gmail.com`  
> Or create your own free Neo4j Aura instance at [console.neo4j.io](https://console.neo4j.io)

### 3️⃣ Seed the Knowledge Graph *(First-time setup only)*

```bash
# Generate Cypher seed from IMPPAT 2.0 data
node scripts/generate_cypher.js

# Then go to Neo4j Aura Console → your instance → Run Script
# Paste contents of: data/vedaai_seed.cypher
```

### 4️⃣ Run the Demo!

```bash
# 🔴 Main 5-agent trap query demo
node demo.js

# 🔍 Inspect any herb live from the cloud graph
node query_herb.js Neem
node query_herb.js Ashwagandha
node query_herb.js Turmeric
```

---

## 📊 Knowledge Graph — What's Inside

<div align="center">

| Entity | Count | Examples |
|--------|-------|---------|
| 🌿 `:Herb` | **25** | Ginger, Neem, Amla, Turmeric, Tulsi, Ashwagandha, Brahmi |
| 🤒 `:Condition` | **12** | Acid Reflux, GERD, Arthritis, Diabetes, Hypertension |
| 🍂 `:Season` | **6** | Grishma (Summer), Varsha (Monsoon), Shishira (Winter) |
| ⚖️ `:Dosha` | **3** | Vata, Pitta, Kapha |
| **TOTAL** | **46 nodes** | |

</div>

<div align="center">

| Relationship | Direction | Meaning |
|-------------|-----------|---------|
| `[:PACIFIES]` | Herb → Dosha | Herb reduces vitiated bio-energy |
| `[:AGGRAVATES]` | Herb → Dosha | Herb increases bio-energy *(danger flag)* |
| `[:CONTRAINDICATED_IN]` | Herb → Season | Herb is clinically dangerous in this season |
| `[:DOMINANT_IN]` | Season → Dosha | Season naturally elevates this dosha |
| `[:ASSOCIATED_WITH]` | Condition → Dosha | Condition is a Pitta/Vata/Kapha disorder |
| `[:TREATS]` | Herb → Condition | Herb has verified clinical indication |

</div>

---

## ✅ Phase 1 — Complete *(What's Already Done)*

<details>
<summary><b>🔽 Click to expand full Phase 1 status</b></summary>

| Task | Status | File / Evidence |
|------|--------|----------------|
| IMPPAT 2.0 data download & parsing | ✅ Done | `data/*.tsv` |
| Cypher ingestion pipeline | ✅ Done | `scripts/generate_cypher.js` |
| Neo4j Aura Cloud deployment | ✅ Done | `725b9403.databases.neo4j.io` |
| Knowledge Graph seeded | ✅ Done | 46 entities, 150+ edges |
| 5-Agent feasibility prototype | ✅ Done | `demo.js` |
| Trap Query benchmark | ✅ Done | **97% confidence, < 200ms** |
| Live herb query tool | ✅ Done | `query_herb.js` |
| System architecture diagram | ✅ Done | `images/figure_6_0_*.jpg` |
| Chapter 6 (Implementation) | ✅ Done | `.md` + `.docx` with 6 figures |
| Synopsis Chapters 1 & 2 | ✅ Done | `.md` + `.docx` |
| Academic viva documentation | ✅ Done | `VedaAI_Phase1_Work_Completed_Report.md` |

</details>

---

## 🔄 Phase 2 — Roadmap *(What Your Team Needs to Build)*

<details>
<summary><b>🔽 Click to expand Phase 2 tasks</b></summary>

| Task | Priority | Assigned To | Notes |
|------|----------|------------|-------|
| LangGraph Multi-Agent State Machine | 🔴 **High** | — | Replace `demo.js` with production pipeline |
| ChromaDB Vector Store Setup | 🔴 **High** | — | Chunk Charaka Samhita, embed with `text-embedding-004` |
| Gemini API Integration | 🔴 **High** | — | Real LLM entity extraction + response generation |
| Entity Normalization Engine | 🟡 Medium | — | Fuzzy Levenshtein for arbitrary user input |
| 50-Query Clinical Benchmark | 🟡 Medium | — | Precision, Recall, BERTScore, Hallucination Rate |
| BAMS Doctor Validation | 🟡 Medium | — | Expert ground-truth annotation |
| Multimodal Vision Agent | 🟠 Low | — | Herb image classification + prescription OCR |
| Next.js Web Frontend | 🟠 Low | — | Chat UI for users |
| Research Paper Submission | 🟠 Low | — | Target: IEEE BIBM / IEEE Confluence |

</details>

---

## 🧠 Algorithms

| Layer | Algorithm | Where |
|-------|-----------|-------|
| Data Normalization | Fuzzy Levenshtein Edit Distance | `scripts/generate_cypher.js` |
| Knowledge Graph Safety | Breadth-First Multi-Hop Path Traversal | Neo4j Cypher |
| Multi-Agent Decision | Dialectical Adversarial Debate (Dung's Argumentation Framework) | `demo.js` |
| Vector Retrieval | HNSW Approximate Nearest Neighbour — Cosine Similarity | ChromaDB |
| Embeddings | `text-embedding-004` — 768-dimensional | Google AI |

---

## 🗄️ Dataset

<div align="center">

> **IMPPAT 2.0** — *Indian Medicinal Plants, Phytochemistry And Therapeutics*  
> Computational Biology Group, The Institute of Mathematical Sciences (IMSc), Chennai  
> *(Autonomous institution under Dept. of Atomic Energy, Govt. of India)*  
> 🔗 [cb.imsc.res.in/imppat](https://cb.imsc.res.in/imppat)

</div>

| File | Size | Content |
|------|------|---------|
| `Plant_Information_IMPPAT.tsv` | 541 KB | Botanical names, families, Sanskrit names, synonyms |
| `IMPPAT_TherapeuticUse_Plant_Association.tsv` | 7.35 MB | Clinical disease-herb associations |
| `IMPPAT_SingleHerbalFormulations.tsv` | 304 KB | Classical formulations & parts used |

---

## 🛠️ Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot find module 'neo4j-driver'` | Run `npm install` |
| `Authentication failed` | Check `.env` credentials |
| `EBUSY: resource busy` on .docx | Close the Word file first |
| Herb not found | `node query_herb.js xyz` — lists all 25 herbs |
| `.env` not found | Copy `.env.example` → `.env` and fill in values |

---

## 👥 Team

<div align="center">

| | Member | Roll No | Contribution |
|--|--------|---------|-------------|
| 🧑‍💻 | **Rahul Kumar** *(Lead)* | 2300270100136 | Architecture, Neo4j, Demo |
| 🧑‍💻 | **Mohit Gupta** | 2300270100104 | Data Engineering, Graph Ingestion |
| 🧑‍💻 | **Prasun Sharma** | 2400270109013 | Multi-Agent Pipeline |
| 🧑‍💻 | **Ravi Baliyan** | 2300270100137 | Documentation, Literature Review |

**Supervisor:** Ms. Mahima Saxena *(Assistant Professor, CSE — AKGEC Ghaziabad)*

</div>

---

## 📚 References

1. Bhatnagar et al. — *"AyurGenie: An AI Genie for Ayurvedic health guidance using RAG"* — ACM AICCC 2025. [`10.1145/3789982.3790044`](https://doi.org/10.1145/3789982.3790044)
2. Joshi et al. — *"GRAYU: graph-based database integrating Ayurvedic formulations"* — Frontiers in Pharmacology, 2025.
3. Du et al. — *"Improving Factuality and Reasoning in LLMs through Multiagent Debate"* — ICML 2024. [`arXiv:2305.14325`](https://arxiv.org/abs/2305.14325)
4. Lewis et al. — *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"* — NeurIPS 2020.

---

## 📄 License

MIT License © 2026 — VedaAI Group 16, AKGEC Ghaziabad. See [LICENSE](LICENSE).

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2b6cb0,100:1a365d&height=120&section=footer&text=Built%20with%20%E2%9D%A4%EF%B8%8F%20at%20AKGEC%20Ghaziabad&fontSize=20&fontColor=ffffff&animation=fadeIn" width="100%"/>

</div>
