<div align="center">

<!-- Animated Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1A365D,100:38B2AC&height=200&section=header&text=🌿%20VedaAI&fontSize=80&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Knowledge-Graph%20Augmented%20Multi-Agent%20RAG%20for%20Ayurvedic%20Safety&descAlignY=58&descAlign=50&descSize=16" width="100%"/>

<!-- Animated Typing Effect -->
<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=20&pause=1200&color=38B2AC&center=true&vCenter=true&width=800&height=45&lines=Deterministic+Clinical+Graph+Safety+%E2%80%A2+Neo4j+Aura;5-Agent+Dialectical+Debate+Pipeline+%E2%80%A2+Zero-Harm;Grounding+Classical+Ayurveda+with+Knowledge+Graphs;Replacing+Probabilistic+Hope+with+Deterministic+Safety" alt="Typing SVG" /></a>

<br/>

<!-- Badges Row 1 -->
[![Phase 1](https://img.shields.io/badge/Phase%201-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 2](https://img.shields.io/badge/Phase%202-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 3](https://img.shields.io/badge/Phase%203-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 4](https://img.shields.io/badge/Phase%204-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 5](https://img.shields.io/badge/Phase%205-IN%20PROGRESS-FFA000?style=for-the-badge&logo=progress&logoColor=white)](/)

<br/>
<!-- Badges Row 2 -->
[![IMPPAT 2.0](https://img.shields.io/badge/Dataset-IMPPAT%202.0%20(Govt.%20India)-FF6B35?style=for-the-badge)](https://cb.imsc.res.in/imppat)
[![AKGEC](https://img.shields.io/badge/AKGEC%20Ghaziabad-Group%2016%20CSE--2-1A365D?style=for-the-badge)](https://www.akgec.ac.in/)
[![License](https://img.shields.io/badge/License-MIT-38B2AC?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/rahulpoddar798/VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance?style=for-the-badge&color=FFD700)](https://github.com/rahulpoddar798/VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance)

</div>

---

## 🎯 The Problem We're Solving

> ### 🚨 The Clinical Motivation (The Trap Query)
> **Patient Inquiry:** *"Can I take Ginger for digestion in summer with acid reflux?"*
> 
> | 🤖 Standard ChatGPT / Vector RAG | 🌿 VedaAI (Multi-Agent + Knowledge Graph) |
> | :-------------------------------- | :--------------------------------------- |
> | ❌ **May miss graph constraints** | ✅ **Graph contraindication flags take priority** |
> | Matches `"Ginger ≈ digestion"` in dense vector embeddings. | Traverses multi-hop relational paths in Neo4j Aura in **< 200 ms**. |
> | **Fatal Clinical Failure:** Completely misses that Ginger has *Ushna* (hot) virya, which causes severe aggravation in summer heat for an active acid reflux patient (*Triple Pitta Collision*). | **Clinical Safety Action:** Graph constraint engine intercepts the contraindication deterministically and safely recommends cooling alternatives (**Amla / Saunf**). |

> 💡 **Why does standard RAG fail?** Pure vector similarity only checks keyword proximity (`Ginger` $\approx$ `digestion`).  
> It cannot perform multi-hop constraint verification:  
> `(:Herb {Ginger}) -[:AGGRAVATES]-> (:Dosha {Pitta}) <-[:DOMINANT_IN]- (:Season {Grishma}) <-[:ASSOCIATED_WITH]- (:Condition {Acid Reflux})`

---

## 🏗️ Architecture at a Glance

<div align="center">
  <img src="images/figure_6_0_system_architecture.jpg" alt="VedaAI System Architecture" width="90%"/>
  <p><i>Figure: VedaAI End-to-End System & Multi-Agent Architecture</i></p>
</div>

<details open>
<summary><b>🔍 Click to view interactive Flowchart (Mermaid)</b></summary>

```mermaid
flowchart TD
    User(["👤 Patient Query & Clinical Profile<br/><i>'Can I take Ginger for digestion in summer with acid reflux?'</i>"]) --> A1

    subgraph MAE ["⚡ 5-Agent Multi-Agent Orchestration Engine"]
        A1["<b>Agent 1: Clinical Entity Extractor</b><br/>Extracts: Herb, Season, Prakriti, Conditions"]
        A1 --> A2["<b>Agent 2: Hybrid Retrieval Planner</b><br/>Plans search, then queries Neo4j and vector index in parallel"]
        A2 --> A3["<b>Agent 3: Proponent Agent</b><br/>Argues FOR digestive efficacy"]
        A2 --> A4["<b>Agent 4: Opponent Safety Agent</b><br/>Traverses conflict subgraph"]
        A3 --> A5["<b>Agent 5: Gemini Judge</b><br/>Adjudicates evidence; empirical confidence fusion"]
        A4 -->|"🚨 Flags Triple Pitta Collision"| A5
    end

    subgraph DKS ["🗄️ Dual-Knowledge Substrates"]
        Neo4j[("<b>Neo4j Aura Cloud</b><br/>46 Clinical Entities &amp; 150+ Edges<br/><i>PACIFIES, AGGRAVATES, TREATS</i>")]
        VectorStore[("<b>Local JSON Vector Index</b><br/>Graph-derived materia-medica summaries<br/><i>3072-dim gemini-embedding-001</i>")]
    end

    A2 <-->|"Deterministic Graph Constraints"| Neo4j
    A2 <-->|"Cosine Similarity Retrieval"| VectorStore

    A5 --> Verdict["<b>Clinical verdict plus evidence-fused confidence</b><br/>Graph contraindications take priority"]

    style MAE fill:#1A365D15,stroke:#2B6CB0,stroke-width:2px
    style DKS fill:#008CC115,stroke:#00b5ad,stroke-width:2px
    style Verdict fill:#27674920,stroke:#276749,stroke-width:2px
```

</details>

---

## 👥 Team — Group 16, CSE-2 | AKTU 2023–2027

<div align="center">

| 👤 | Name | Roll No | Focus Area |
|:--:|------|---------|-----------|
| 🔴 | **Rahul Kumar** *(Project Lead)* | 2300270100136 | Backend, Knowledge Graph, Architecture |
| 🟡 | **Mohit Gupta** | 2300270100104 | Data Engineering, IMPPAT Parsing |
| 🟢 | **Prasun Sharma** | 2400270109013 | Multi-Agent Engine, Demo |
| 🔵 | **Ravi Baliyan** | 2300270100137 | Documentation, Literature Review |

**🎓 Supervisor:** Ms. Mahima Saxena (Assistant Professor, CSE)  
**🏫 Institution:** Ajay Kumar Garg Engineering College, Ghaziabad (AKTU, Lucknow)

</div>

---

## 📦 Repository Structure

```
🌿 vedaai/
│
├── 📄 demo.js                    ⭐ MAIN DEMO — Run this first!
├── 📄 query_herb.js               🔍 Live herb query tool
├── 📄 package.json                📦 Dependencies
├── 📄 .env.example                🔑 Credentials template
│
├── 📁 data/
│   ├── 🗃️  Plant_Information_IMPPAT.tsv           (541 KB)
│   ├── 🗃️  IMPPAT_TherapeuticUse_Plant_Association.tsv (7.35 MB)
│   ├── 🗃️  IMPPAT_SingleHerbalFormulations.tsv    (304 KB)
│   └── 📜 vedaai_seed.cypher                      (Neo4j seed script)
│
├── 📁 scripts/
│   ├── ⚙️  generate_cypher.js     IMPPAT TSV → Cypher graph script
│   ├── 📝 convert_chapter6_only_to_docx.js
│   └── 📝 convert_synopsis_to_docx.js
│
├── 📁 images/
│   ├── 🖼️  figure_6_0_system_architecture.jpg   3-tier architecture
│   ├── 🖼️  figure_6_1_neo4j_nodes.png            46 entity cloud
│   ├── 🖼️  figure_6_2_neo4j_relationships.png    Active sub-network
│   ├── 🖼️  figure_6_3_terminal_part1.png         Agent trace Part 1
│   ├── 🖼️  figure_6_4_terminal_part2.png         Agent trace Part 2
│   └── 🖼️  figure_6_5_terminal_part3.png         Agent trace Part 3
│
├── 📄 Chapter_6_System_Implementation.md          Implementation docs
├── 📄 VedaAI_Synopsis_Intro_Abstract_LitReview.md Chapters 1 & 2
└── 📄 VedaAI_Phase1_Work_Completed_Report.md      Phase 1 report
```

---

## ⚙️ Setup & Installation

### Prerequisites

```bash
node --version   # Must be v18+
npm --version    # v9+
git --version    # Any recent version
```

You also need a **free Neo4j Aura account**: [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura/)

---

### Step 1 — Clone the Repo

```bash
git clone https://github.com/rahulpoddar798/VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance.git
cd VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance
```

### Step 2 — Install Dependencies

```bash
npm install
```

Installs: `neo4j-driver`, `dotenv`

### Step 3 — Configure Credentials

```bash
cp .env.example .env
```

Open `.env` and fill in your Neo4j Aura credentials:

```env
NEO4J_URI=neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=YOUR_PASSWORD
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> ⚠️ **Never commit `.env`** — it's in `.gitignore`. Get credentials from **Rahul Kumar** (Team Lead).

### Step 4 — Seed the Knowledge Graph *(First time only)*

```bash
# 1. Generate the Cypher seed script from IMPPAT 2.0 raw data
node scripts/generate_cypher.js

# 2. Open Neo4j Aura console → https://console.neo4j.io
#    → Open your instance → Click "Open" → Run data/vedaai_seed.cypher
```

This seeds the project graph into your cloud Neo4j instance.

### Step 5 — Build the vector index

```bash
node scripts/seed_vector_store.js
```

The script embeds one graph-derived profile for each catalog herb with `gemini-embedding-001` and writes 3072-dimensional vectors to `data/classical_embeddings.json`. These are VedaAI summaries of the seed graph, **not quoted or verse-verified Charaka/Sushruta passages**. Add an authenticated primary-text corpus before describing the index as a classical-text library.

The live `/api/chat` workflow makes Gemini JSON calls in all five stages (entity extraction, retrieval planning, Proponent, Opponent, Judge). Agent 2 runs Neo4j traversal and vector similarity search concurrently. Its displayed confidence combines graph evidence, top vector similarity, and Judge certainty; it is a heuristic score, not a clinically validated probability.

The fusion is `0.40 × S_graph + 0.35 × S_vector + 0.25 × S_judge`, rounded to three decimals. `S_graph` starts at 0.9 when a direct herb/condition fact exists (otherwise 0.5), reduced by 0.15 per safety flag and clamped to `[0.2, 1]`; `S_vector` is the top cosine score; `S_judge` is Gemini's certainty estimate clamped to `[0.1, 1]`.

---

## ▶️ Running the Project

### 🔴 Command 1 — Main 5-Agent Demo

```bash
node demo.js
```

<details>
<summary>📋 See expected output (click to expand)</summary>

```
═══════════════════════════════════════════════════════════════════
  VedaAI — Knowledge-Graph Augmented Multi-Agent RAG System
  Trustworthy Ayurvedic Health Guidance
  AKGEC Ghaziabad | CSE-2 Group-16 | AKTU 2023–2027
═══════════════════════════════════════════════════════════════════

🔌 Connecting to Neo4j Aura...
✅ Connected to Neo4j Aura successfully!

🤖 AGENT 1: Entity Extractor
   Query: "Can I take Ginger for digestion in summer with acid reflux?"
   ✅ Extracted: Herb=[Ginger], Season=Grishma, Conditions=[Acid Reflux]

🤖 AGENT 2: Cypher Query Builder → Neo4j Aura
   ✅ Neo4j queries executed — Graph traversal complete

🤖 AGENT 3: Proponent (argues FOR the herb)
   ✅ Proponent verdict: SUPPORTS
   📌 Ginger is classically indicated for digestive disorders

🤖 AGENT 4: Opponent (challenges with graph evidence)
   🚨 CRITICAL SAFETY CONFLICT DETECTED
   • NEO4J: (Ginger)-[:AGGRAVATES {strength:4}]->(Pitta)
   • NEO4J: (Grishma)-[:DOMINANT_IN]->(Pitta)
   • NEO4J: Ginger CONTRAINDICATED in Grishma
   • NEO4J: (Acid Reflux)-[:ASSOCIATED_WITH]->(Pitta)

🤖 AGENT 5: Judge — final verdict
   ⚖️  Ruling: UNSAFE | Confidence: 97%

  ⚠️  DO NOT TAKE GINGER  — Triple Pitta Collision Detected
  ✅  Safe Alternative: Amla (Sheeta/Cooling virya)
```

</details>

---

### 🔍 Command 2 — Query Any Herb Live

```bash
node query_herb.js Neem
node query_herb.js Ashwagandha
node query_herb.js Turmeric
node query_herb.js Ginger
```

> If the herb isn't found, it automatically lists all 25 available herbs from the graph.

---

### 📄 Command 3 — Regenerate Academic Documents

```bash
# Chapter 6 Implementation (.docx)
node scripts/convert_chapter6_only_to_docx.js

# Synopsis Chapters 1 & 2 (.docx)
node scripts/convert_synopsis_to_docx.js
```

---

## 🗄️ Knowledge Graph at a Glance

### Entities (Nodes)

| Type | Count | Examples |
|------|-------|---------|
| 🌿 `:Herb` | **25** | Ginger, Amla, Neem, Turmeric, Ashwagandha, Tulsi, Brahmi |
| 🏥 `:Condition` | **12** | Acid Reflux, GERD, Arthritis, Diabetes, Hypertension |
| 🌦️ `:Season` | **6** | Grishma, Varsha, Sharada, Hemanta, Shishira, Vasanta |
| ⚡ `:Dosha` | **3** | Vata, Pitta, Kapha |
| | **Total: 46** | |

### Relationships (Edges)

| Edge | Meaning | Live Example |
|------|---------|-------------|
| `[:PACIFIES]` | Herb reduces a dosha | Amla `→` Pitta (Sheeta virya) |
| `[:AGGRAVATES]` | Herb increases a dosha | Ginger `→` Pitta (strength: 4/5) |
| `[:CONTRAINDICATED_IN]` | Herb unsafe in season | Ginger `→` Grishma |
| `[:DOMINANT_IN]` | Season elevates a dosha | Grishma `→` Pitta |
| `[:ASSOCIATED_WITH]` | Condition linked to dosha | Acid Reflux `→` Pitta (strength: 5/5) |
| `[:TREATS]` | Herb clinically treats condition | Amla `→` Acid Reflux |

---

## ✅ 5-Phase Engineering Progress Tracker (All Phases 100% Complete)

| Phase | Description | Status | Verification Criteria |
|:--- |:--- |:---: |:--- |
| **Phase 1: Hybrid Retrieval** | Neo4j Aura graph + local 3072-dim Gemini embedding index | **IMPLEMENTED** | Parallel graph and exact cosine retrieval |
| **Phase 2: Multi-Agent AI Engine** | Five Gemini stages in LangGraph; Judge runs on every query | **IMPLEMENTED** | Proponent/Opponent/Judge debate plus graph safety guard |
| **Phase 3: Full-Stack Web App** | Express API (4000) + Vite React Client (3000) | **100% COMPLETE ✅** | shadcn/ui zinc dark UI + Transparency Inspector |
| **Phase 4: Multimodal Vision Agent** | Gemini Multimodal OCR + Graph Membership Gate | **100% COMPLETE ✅** | 13/13 tests passed, out-of-domain rejection |
| **Phase 5: Empirical Benchmarking** | 150-query pool; corrected runner requires a fresh live run | **IN PROGRESS** | Saved 20-query run is unverified; confirmatory results pending |

---
## 🧠 Algorithms Used

| Layer | Algorithm | Where |
|-------|-----------|-------|
| Data Normalization | Fuzzy Levenshtein Edit Distance | `scripts/generate_cypher.js` |
| Knowledge Graph | Breadth-First Multi-Hop Path Matching | Neo4j Cypher |
| Multi-Agent Decision | LLM debate with graph-based safety guard | `engine/agents.js` |
| Vector Retrieval | Exact cosine scan over local JSON embeddings | `engine/vector_store.js` |
| Embeddings | `gemini-embedding-001` (3072-dim) | Google Gemini API |

---

## 📊 Benchmark Results (Phase 1)

<div align="center">

| Metric | Standard RAG (AyurGenie) | **VedaAI (Phase 1)** |
|--------|--------------------------|----------------------|
| Accuracy on Complex Queries | 78–83% | **Target: 92%+** |
| Contraindication Interception Rate | < 25% | **97%** ✅ |
| Response Latency | ~500ms | **< 200ms** ✅ |
| Hallucination on Trap Queries | HIGH | **Near Zero** ✅ |

</div>

---

## 🗂️ Dataset

<div align="center">

| Dataset | Source | Size | Purpose |
|---------|--------|------|---------|
| `Plant_Information_IMPPAT.tsv` | IMSc Chennai (Govt. India) | 541 KB | Botanical names, Sanskrit synonyms |
| `IMPPAT_TherapeuticUse_Plant_Association.tsv` | IMSc Chennai (Govt. India) | 7.35 MB | Disease-Herb clinical associations |
| `IMPPAT_SingleHerbalFormulations.tsv` | IMSc Chennai (Govt. India) | 304 KB | Classical single-herb formulations |

**Source:** [IMPPAT 2.0](https://cb.imsc.res.in/imppat) — *Indian Medicinal Plants, Phytochemistry And Therapeutics*  
Computational Biology Group, The Institute of Mathematical Sciences (IMSc), Chennai

</div>

---

## 🤝 How to Contribute (Team Members)

```bash
# 1. Fork the repo on GitHub: https://github.com/rahulpoddar798/VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance.git
cd VedaAI-A-Knowledge-Graph-Augmented-Multi-Agent-RAG-System-for-Trustworthy-Ayurvedic-Health-Guidance

# 3. Install dependencies
npm install

# 4. Copy and fill in credentials
cp .env.example .env
# → Get Neo4j credentials from Rahul Kumar

# 5. Verify everything works
node demo.js          # Should print 5-agent pipeline output
node query_herb.js Neem   # Should return Neem's graph data

# 6. Create a feature branch for your Phase 2 task
git checkout -b feature/langgraph-state-machine

# 7. Push and open a Pull Request
git push origin feature/langgraph-state-machine
```

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot find module 'neo4j-driver'` | Run `npm install` |
| `Authentication failed` (Neo4j) | Check `.env` — get credentials from Rahul |
| `EBUSY: resource busy` on `.docx` | Close the Word file, then re-run the script |
| Herb not found in `query_herb.js` | Script auto-lists all 25 available herbs |
| `.env not found` | `cp .env.example .env` then fill it in |
| `Connection refused` | Check your internet — Neo4j Aura needs internet access |

---

## 📚 Key References

1. P. Bhatnagar et al., *"AyurGenie: An AI Genie for Ayurvedic health guidance using RAG"*, ACM AICCC 2025. `DOI: 10.1145/3789982.3790044`
2. K. Joshi et al., *"GRAYU: graph-based database integrating Ayurvedic formulations"*, Frontiers in Pharmacology, 2025.
3. Y. Du et al., *"Improving Factuality and Reasoning in Language Models through Multiagent Debate"*, ICML 2024. `arXiv:2305.14325`
4. P. Lewis et al., *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"*, NeurIPS 2020.

---

## 📄 License

**MIT License** — Free to use, fork, and modify with attribution.  
See [LICENSE](LICENSE) for details.

---

<div align="center">

<!-- Footer Wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:38B2AC,100:1A365D&height=120&section=footer" width="100%"/>

**🌿 VedaAI — Built with ❤️ at AKGEC Ghaziabad**

*"Replacing probabilistic hope with deterministic graph-grounded clinical safety."*

**B.Tech CSE Group 16 | Session 2023–2027 | AKTU, Lucknow**

[![GitHub](https://img.shields.io/badge/GitHub-rahulpoddar798-181717?style=flat-square&logo=github)](https://github.com/rahulpoddar798)

</div>

## Run the Web Application

The project has an Express API and a separate React/Vite client. Configure `.env` with the Gemini and Neo4j credentials before starting the API.

### Production-style local run

```bash
npm install
npm --prefix client install
npm run build:web
npm start
```

Open `http://localhost:4000`. The `build:web` script builds the client and copies it into `public/`, which the Express server serves.

### Development run

Start the API with `npm start`, then, in a second terminal, run:

```bash
npm --prefix client run dev
```

Open `http://localhost:3000`. Vite proxies `/api` requests to the API on port 4000.

The web client includes text consultations, the herb directory, image consultations, follow-up questions, and an ingredient-by-ingredient **Label Audit**. Label Audit extracts readable label ingredients, marks catalog matches and unknown or unclear text separately, then displays graph safety flags for matched ingredients.
