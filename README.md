<div align="center">

# 🌿 VedaAI
### A Knowledge-Graph Augmented Multi-Agent RAG System for Trustworthy Ayurvedic Health Guidance

[![AKGEC](https://img.shields.io/badge/AKGEC-Ghaziabad-blue)](https://www.akgec.ac.in/)
[![AKTU](https://img.shields.io/badge/AKTU-2023--2027-orange)](https://aktu.ac.in/)
[![Neo4j](https://img.shields.io/badge/Database-Neo4j%20Aura-00b5ad)](https://neo4j.com/cloud/aura/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Phase](https://img.shields.io/badge/Phase%201-✅%20Complete-brightgreen)]()
[![Phase](https://img.shields.io/badge/Phase%202-🔄%20In%20Progress-yellow)]()

</div>

---

## 👥 Team — Group 16, CSE-2, B.Tech (2023–2027)

| Name | Roll Number | Role |
|------|------------|------|
| **Rahul Kumar** | 2300270100136 | Project Lead, Backend & Knowledge Graph |
| **Mohit Gupta** | 2300270100104 | Data Engineering & Graph Ingestion |
| **Prasun Sharma** | 2400270109013 | Multi-Agent Engine & Demo |
| **Ravi Baliyan** | 2300270100137 | Documentation & Literature Review |

**Supervisor:** Ms. Mahima Saxena (Assistant Professor, CSE)  
**Institution:** Ajay Kumar Garg Engineering College, Ghaziabad (AKTU, Lucknow)

---

## 📌 Project Summary

Current RAG-based Ayurvedic chatbots (e.g. AyurGenie) achieve **85–90% accuracy** on simple queries but drop to **78–83%** on complex, multi-hop clinical questions — because pure vector search cannot detect combinatorial pharmacological contraindications.

**VedaAI** solves this by combining:
1. A **Dual-Knowledge Substrate** — Neo4j Aura cloud graph (strict symbolic rules) + ChromaDB (semantic vector search)
2. A **5-Agent Dialectical Debate Pipeline** — Proponent ↔ Opponent → Judge arbitration that deterministically blocks unsafe recommendations

### 🔬 Live Proof (The Trap Query)
> **"Can I take Ginger for digestion in summer with acid reflux?"**

| System | Answer | Why |
|--------|--------|-----|
| Standard ChatGPT/RAG | ✅ "Yes, Ginger aids digestion" | Only matched digestive keyword |
| **VedaAI** | ❌ **UNSAFE (97% confidence)** | Detected Triple Pitta Collision: Hot virya + Summer heat + Acid Reflux → Recommends Amla/Saunf instead |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERY LAYER                          │
│       "Herb for symptom in season with condition?"           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              5-AGENT ORCHESTRATION LAYER                     │
│                                                              │
│  Agent 1: Entity Extractor & Patient Profiler               │
│      ↓ (herb, season, prakriti, conditions)                 │
│  Agent 2: Dynamic Cypher Query Builder → Neo4j Aura         │
│      ↓ (graph traversal results)                            │
│  Agent 3: Proponent — argues FOR the herb                   │
│  Agent 4: Opponent — catches contraindications in graph     │
│      ↓ (debate arguments)                                   │
│  Agent 5: Judge — weighted safety score → final verdict     │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
┌──────────────▼──────────┐   ┌────────────▼──────────────────┐
│  NEO4J AURA (Symbolic)  │   │  CHROMADB (Semantic)          │
│  Entities: 46 nodes     │   │  Charaka Samhita chunks       │
│  Edges: 150+ triples    │   │  768-dim embeddings           │
│  Hard contraindication  │   │  Cosine similarity (HNSW)     │
│  rules from IMPPAT 2.0  │   │  Narrative explanations       │
└─────────────────────────┘   └───────────────────────────────┘
```

---

## 📁 Repository Structure

```
veda_original/
│
├── 📄 demo.js                        # ⭐ Main live demo — Run this first!
├── 📄 query_herb.js                  # Live herb inspection tool
├── 📄 package.json                   # Node.js dependencies
├── 📄 .env                           # ⚠️ NOT committed — create from .env.example
├── 📄 .env.example                   # Template for your credentials
│
├── 📁 data/                          # Dataset files (IMPPAT 2.0)
│   ├── Plant_Information_IMPPAT.tsv           (541 KB) Botanical names, families
│   ├── IMPPAT_TherapeuticUse_Plant_Association.tsv (7.35 MB) Disease-herb links
│   ├── IMPPAT_SingleHerbalFormulations.tsv    (304 KB) Classical formulations
│   └── vedaai_seed.cypher                     (38 KB) Generated Neo4j Cypher script
│
├── 📁 scripts/                       # Utility scripts
│   ├── generate_cypher.js            # Parses IMPPAT TSV → generates vedaai_seed.cypher
│   ├── convert_chapter6_only_to_docx.js      # Generates Chapter 6 .docx
│   └── convert_synopsis_to_docx.js           # Generates Synopsis .docx
│
├── 📁 images/                        # Academic figures
│   ├── figure_6_0_system_architecture.jpg    # System architecture diagram
│   ├── figure_6_1_neo4j_nodes.png            # Neo4j node cloud
│   ├── figure_6_2_neo4j_relationships.png    # Active sub-network
│   ├── figure_6_3_terminal_part1.png         # Execution trace Part 1
│   ├── figure_6_4_terminal_part2.png         # Execution trace Part 2
│   └── figure_6_5_terminal_part3.png         # Execution trace Part 3
│
├── 📄 Chapter_6_System_Implementation.md     # Implementation chapter (Markdown)
├── 📄 Chapter_6_System_Implementation.docx   # Implementation chapter (Word)
├── 📄 VedaAI_Synopsis_Intro_Abstract_LitReview.md   # Chapters 1 & 2 (Markdown)
└── 📄 VedaAI_Synopsis_Intro_Abstract_LitReview.docx # Chapters 1 & 2 (Word)
```

---

## ⚙️ Prerequisites

Make sure these are installed on your machine before starting:

| Requirement | Version | How to Check |
|-------------|---------|-------------|
| **Node.js** | v18+ | `node --version` |
| **npm** | v9+ | `npm --version` |
| **Git** | Any | `git --version` |
| Neo4j Aura Cloud account | Free tier | [Sign up](https://neo4j.com/cloud/aura/) |

---

## 🚀 Setup & Installation (Step by Step)

### Step 1: Clone the Repository
```bash
git clone https://github.com/rahul-kumar-akgec/vedaai.git
cd vedaai
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```
This installs:
- `neo4j-driver` — connects to Neo4j Aura Cloud
- `dotenv` — loads your secret credentials from `.env`

### Step 3: Set Up Environment Variables
Create a `.env` file in the root folder (copy from the example):
```bash
cp .env.example .env
```

Now open `.env` and fill in your Neo4j Aura credentials:
```env
NEO4J_URI=neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io
NEO4J_USERNAME=YOUR_USERNAME
NEO4J_PASSWORD=YOUR_PASSWORD
```

> ⚠️ **IMPORTANT:** Never commit your `.env` file. It is already in `.gitignore`.  
> Get credentials from the **Team Lead (Rahul Kumar)** or set up your own free Neo4j Aura instance.

### Step 4: Seed the Knowledge Graph (First time only)
If you are setting up a fresh Neo4j Aura instance:
```bash
# Step 4a: Generate the Cypher seed script from IMPPAT 2.0 data
node scripts/generate_cypher.js

# Step 4b: Open Neo4j Aura console → run data/vedaai_seed.cypher
# Go to: https://console.neo4j.io → Open your instance → Run Script
```
This seeds:
- 25 Herbs with full pharmacological properties (*Virya, Rasa, Vipaka, Guna*)
- 3 Doshas (*Vata, Pitta, Kapha*)
- 6 Seasons (*Vasanta, Grishma, Varsha, Sharada, Hemanta, Shishira*)
- 12 Chronic Conditions (*Acid Reflux, GERD, Arthritis, Diabetes, etc.*)
- 150+ clinical relationship edges (`:PACIFIES`, `:AGGRAVATES`, `:CONTRAINDICATED_IN`, `:TREATS`, `:DOMINANT_IN`)

---

## ▶️ Running the Project

### 🔴 Command 1: Run the Main 5-Agent Trap Query Demo
```bash
node demo.js
```
**What it does:**
- Connects live to Neo4j Aura Cloud
- Executes the benchmark query: *"Can I take Ginger for digestion in summer with acid reflux?"*
- Runs all 5 agents (Extractor → Cypher Builder → Proponent → Opponent → Judge)
- Prints the full clinical verdict with graph evidence
- Shows contrast vs. standard RAG

Expected output time: ~2–3 seconds

---

### 🔍 Command 2: Query Any Herb from the Live Graph
```bash
node query_herb.js Neem
node query_herb.js Ashwagandha
node query_herb.js Turmeric
node query_herb.js Ginger
```
**What it does:**
- Searches the live Neo4j Aura graph by name, botanical name, or Sanskrit name
- Prints all pharmacological properties and graph relationships for that herb

If the herb is not found, it lists all 25 available herbs automatically.

---

### 📄 Command 3: Generate Academic Documents (.docx)
```bash
# Generate Chapter 6 (System Implementation & Validation)
node scripts/convert_chapter6_only_to_docx.js

# Generate Synopsis Chapters 1 & 2 (Abstract, Intro, Literature Review)
node scripts/convert_synopsis_to_docx.js
```

---

## 📊 Knowledge Graph Overview

### Entities (Nodes) in the Live Database
| Entity Type | Count | Examples |
|-------------|-------|---------|
| `:Herb` | 25 | Ginger, Neem, Amla, Ashwagandha, Turmeric, Tulsi |
| `:Condition` | 12 | Acid Reflux, GERD, Arthritis, Diabetes, Hypertension |
| `:Season` | 6 | Grishma (Summer), Varsha (Monsoon), Shishira (Winter) |
| `:Dosha` | 3 | Vata, Pitta, Kapha |
| **Total** | **46** | |

### Relationship Types (Edges)
| Relationship | Meaning | Example |
|-------------|---------|---------|
| `[:PACIFIES]` | Herb reduces a vitiated dosha | Amla pacifies Pitta |
| `[:AGGRAVATES]` | Herb increases a dosha | Ginger aggravates Pitta (strength: 4/5) |
| `[:CONTRAINDICATED_IN]` | Herb is dangerous in that season | Ginger contraindicated in Grishma |
| `[:DOMINANT_IN]` | Season elevates a dosha | Grishma (Summer) dominant in Pitta |
| `[:ASSOCIATED_WITH]` | Condition is linked to a dosha | Acid Reflux associated with Pitta (strength: 5/5) |
| `[:TREATS]` | Herb treats a condition | Amla treats Acid Reflux |

---

## ✅ What Has Been Done (Phase 1 — 100% Complete)

| Task | Status | Details |
|------|--------|---------|
| IMPPAT 2.0 data download & parsing | ✅ Done | 3 TSV files (8+ MB total) in `data/` |
| Cypher ingestion script | ✅ Done | `scripts/generate_cypher.js` |
| Neo4j Aura Cloud deployment | ✅ Done | Live at `725b9403.databases.neo4j.io` |
| Knowledge Graph seeding | ✅ Done | 46 entities, 150+ edges |
| 5-Agent feasibility prototype | ✅ Done | `demo.js` — fully functional |
| Trap Query benchmark | ✅ Done | 97% confidence, < 200ms |
| Live herb query tool | ✅ Done | `query_herb.js` |
| System Architecture Diagram | ✅ Done | `images/figure_6_0_system_architecture.jpg` |
| Chapter 6 (Implementation) | ✅ Done | `.md` + `.docx` with 6 academic figures |
| Synopsis (Abstract + Chapters 1 & 2) | ✅ Done | `.md` + `.docx` |

---

## 🔄 What Remains (Phase 2 — Upcoming)

| Task | Priority | Notes |
|------|----------|-------|
| **LangGraph Multi-Agent State Machine** | 🔴 High | Replace `demo.js` prototype with production LangGraph pipeline |
| **ChromaDB Vector Store Setup** | 🔴 High | Chunk & embed Charaka Samhita using `text-embedding-004` |
| **Gemini API Integration** | 🔴 High | Connect Gemini Flash for real LLM-based entity extraction and generation |
| **Entity Normalization Engine** | 🟡 Medium | Fuzzy Levenshtein synonym matching for arbitrary user input |
| **50-Query Clinical Trap Benchmark** | 🟡 Medium | Evaluate against standard RAG (precision, recall, BERTScore, hallucination rate) |
| **Ayurvedic Doctor Validation** | 🟡 Medium | Expert BAMS annotation of ground-truth answers |
| **Multimodal Vision Agent** | 🟠 Low | Herb image classification + prescription OCR |
| **Next.js Web Frontend** | 🟠 Low | User-facing chat interface |
| **Research Paper Submission** | 🟠 Low | Target: IEEE BIBM or IEEE Confluence (Scopus-indexed) |

---

## 📐 Algorithms Used

| Layer | Algorithm | Tool/Library |
|-------|-----------|-------------|
| **Data Normalization** | Fuzzy Levenshtein Edit Distance | `scripts/generate_cypher.js` |
| **Knowledge Graph** | Breadth-First Multi-Hop Path Traversal | Neo4j Cypher |
| **Multi-Agent Decision** | Dialectical Adversarial Debate (Dung's Argumentation Framework) | `demo.js` |
| **Vector Retrieval** | HNSW Approximate Nearest Neighbour (Cosine Similarity) | ChromaDB |
| **Embeddings** | `text-embedding-004` (768-dim) | Google AI |

---

## 🗂️ Dataset Source

All pharmacological data is sourced from the official government research database:

> **IMPPAT 2.0** — *Indian Medicinal Plants, Phytochemistry And Therapeutics*  
> Computational Biology Group, The Institute of Mathematical Sciences (IMSc), Chennai  
> (An autonomous institution under the Dept. of Atomic Energy, Govt. of India)  
> Website: [cb.imsc.res.in/imppat](https://cb.imsc.res.in/imppat)

Cross-referenced with:
- **Ayurvedic Pharmacopoeia of India (API)** — AYUSH Ministry
- **Charaka Samhita** (public domain English translations)

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot find module 'neo4j-driver'` | Run `npm install` |
| `Authentication failed` (Neo4j) | Check `.env` credentials — get them from Rahul |
| `EBUSY: resource busy` on .docx | Close the Word document first, then re-run |
| Herb not found in `query_herb.js` | The tool will list all 25 available herb names |
| `Error: .env not found` | Copy `.env.example` to `.env` and fill in credentials |

---

## 📚 Key References

1. P. Bhatnagar et al., "AyurGenie: An AI Genie for Ayurvedic health guidance using RAG," *ACM AICCC 2025*. DOI: `10.1145/3789982.3790044`
2. K. Joshi et al., "GRAYU: graph-based database integrating Ayurvedic formulations," *Frontiers in Pharmacology*, 2025.
3. Y. Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate," *ICML 2024*. arXiv:2305.14325.
4. P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," *NeurIPS 2020*.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ at AKGEC Ghaziabad | B.Tech CSE 2023–2027**  
*"Replacing probabilistic hope with deterministic graph-grounded clinical safety."*

</div>
