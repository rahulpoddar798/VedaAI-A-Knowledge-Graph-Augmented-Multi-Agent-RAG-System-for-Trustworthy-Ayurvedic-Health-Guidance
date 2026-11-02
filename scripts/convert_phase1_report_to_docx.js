/**
 * Script to generate VedaAI Phase 1 Work Completed Report DOCX
 * Converts VedaAI_Phase1_Work_Completed_Report.md into a beautifully styled Word document
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, ImageRun
} = require('C:/Users/rahul/.gemini/antigravity/brain/8295ab9c-336c-4a27-9b07-cb2f2c20565f/scratch/node_modules/docx');

const outputPath = "c:\\Users\\rahul\\OneDrive\\Desktop\\websites\\veda_original\\VedaAI_Phase1_Work_Completed_Report.docx";

// Colors matching academic standard
const COLOR_PRIMARY = "1A365D";   // Deep Navy Blue
const COLOR_SECONDARY = "2B6CB0"; // Slate Accent Blue
const COLOR_TEXT = "2D3748";      // Charcoal Dark
const COLOR_MUTED = "718096";     // Slate Grey
const COLOR_BG_LIGHT = "F7FAFC";  // Light Neutral Table/Callout BG
const COLOR_BORDER = "CBD5E0";    // Light Table Border
const COLOR_GREEN_ACC = "276749"; // Green Accent
const COLOR_RED_ACC = "C53030";   // Red Accent

// Image paths
const IMG_NEO4J_CLOUD = "c:/Users/rahul/OneDrive/Desktop/websites/veda_original/images/figure_6_1_neo4j_nodes.png";
const IMG_NEO4J_GRAPH = "c:/Users/rahul/OneDrive/Desktop/websites/veda_original/images/figure_6_2_neo4j_relationships.png";
const IMG_TERM_PART1  = "c:/Users/rahul/OneDrive/Desktop/websites/veda_original/images/figure_6_3_terminal_part1.png";
const IMG_TERM_PART2  = "c:/Users/rahul/OneDrive/Desktop/websites/veda_original/images/figure_6_4_terminal_part2.png";
const IMG_TERM_PART3  = "c:/Users/rahul/OneDrive/Desktop/websites/veda_original/images/figure_6_5_terminal_part3.png";

function pHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
    children: [
      new TextRun({
        text: text,
        font: "Calibri",
        size: 30,
        bold: true,
        color: COLOR_PRIMARY
      })
    ]
  });
}

function pHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text: text,
        font: "Calibri",
        size: 24,
        bold: true,
        color: COLOR_SECONDARY
      })
    ]
  });
}

function pHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: text,
        font: "Calibri",
        size: 22,
        bold: true,
        color: COLOR_TEXT
      })
    ]
  });
}

function pBody(text, bold = false, italic = false) {
  return new Paragraph({
    spacing: { before: 90, after: 90, line: 300 }, // 1.25 line spacing
    children: [
      new TextRun({
        text: text,
        font: "Calibri",
        size: 22,
        color: COLOR_TEXT,
        bold: bold,
        italic: italic
      })
    ]
  });
}

function pBullet(text, boldPrefix = "") {
  const runs = [];
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix + " ", font: "Calibri", size: 22, bold: true, color: COLOR_TEXT }));
  }
  runs.push(new TextRun({ text: text, font: "Calibri", size: 22, color: COLOR_TEXT }));
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 50, after: 50, line: 280 },
    children: runs
  });
}

function pCallout(title, bodyText, type = "note") {
  const borderColor = type === "alert" ? COLOR_RED_ACC : (type === "success" ? COLOR_GREEN_ACC : COLOR_SECONDARY);
  const bgColor = type === "alert" ? "FFF5F5" : (type === "success" ? "F0FFF4" : COLOR_BG_LIGHT);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 28, color: borderColor }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 180, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 60 },
                children: [new TextRun({ text: title, font: "Calibri", size: 22, bold: true, color: borderColor })]
              }),
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: bodyText, font: "Calibri", size: 21, color: COLOR_TEXT })]
              })
            ]
          })
        ]
      })
    ]
  });
}

function pImageWithCaption(imagePath, widthPx, heightPx, figCaption) {
  const imgBuffer = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 100 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: { width: widthPx, height: heightPx },
          type: "png"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 240 },
      children: [
        new TextRun({
          text: figCaption,
          font: "Calibri",
          size: 20,
          bold: true,
          italic: true,
          color: COLOR_MUTED
        })
      ]
    })
  ];
}

function createStyledTable(headers, rowsData) {
  const tableRows = [];

  // Header Row
  tableRows.push(new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY },
        left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
        right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER }
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          runs: [new TextRun({ text: h, font: "Calibri", size: 21, bold: true, color: "FFFFFF" })]
        })
      ]
    }))
  }));

  // Body Rows
  rowsData.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? "FFFFFF" : COLOR_BG_LIGHT;
    tableRows.push(new TableRow({
      children: row.map(cell => new TableCell({
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
          left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
          right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER }
        },
        children: [
          new Paragraph({
            runs: [new TextRun({ text: cell, font: "Calibri", size: 20, color: COLOR_TEXT })]
          })
        ]
      }))
    }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

function buildDocument() {
  const children = [];

  // Title Page / Header Block
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    runs: [
      new TextRun({
        text: "VedaAI: Phase 1 Implementation & Technical Progress Report",
        font: "Calibri",
        size: 34,
        bold: true,
        color: COLOR_PRIMARY
      })
    ]
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    runs: [
      new TextRun({
        text: "COMPREHENSIVE CHAPTER-WISE DOCUMENTATION OF COMPLETED WORK",
        font: "Calibri",
        size: 24,
        bold: true,
        color: COLOR_SECONDARY
      })
    ]
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 260 },
    runs: [
      new TextRun({
        text: "Academic Session: 2023–2027 | Department of Computer Science and Engineering\nAjay Kumar Garg Engineering College, Ghaziabad (AKTU, Lucknow)",
        font: "Calibri",
        size: 20,
        italic: true,
        color: COLOR_MUTED
      })
    ]
  }));

  // Team Callout
  children.push(pCallout(
    "Project Investigation Team & Supervisor",
    "Group-16 (CSE-2):\n" +
    "• Mohit Gupta (2300270100104)       • Prasun Sharma (2400270109013)\n" +
    "• Rahul Kumar (2300270100136)       • Ravi Baliyan (2300270100137)\n\n" +
    "Supervisor: Ms. Mahima Saxena, Assistant Professor, Department of CSE, AKGEC Ghaziabad\n" +
    "Report Scope: Systematic chapter-by-chapter documentation of all Phase 1 deliverables completed to date, including data extraction, cloud graph database deployment on Neo4j Aura, prototype multi-agent verification, and live empirical benchmark validation.",
    "note"
  ));

  children.push(new Paragraph({ spacing: { before: 180, after: 80 } }));

  // ==========================================
  // CHAPTER 1
  // ==========================================
  children.push(pHeading1("Chapter 1: Phase 1 Scope & Engineering Objectives Achieved"));

  children.push(pHeading2("1.1 Objective of Phase 1"));
  children.push(pBody(
    "The foundational premise of VedaAI is that clinical conversational agents cannot rely solely on probabilistic text generation or simple vector similarity search. When evaluating complex Ayurvedic inquiries, systems must evaluate deterministic, multi-hop physiological constraints across interacting parameters: herb potency (Dravya Virya: Ushna/hot vs. Sheeta/cold), biological humors (Doshas: Vata, Pitta, Kapha), environmental seasons (Ritus: Grishma, Varsha, etc.), and patient morbidities (Rogi: chronic conditions such as Acid Reflux)."
  ));
  children.push(pBody(
    "Phase 1 establishes the Dual-Knowledge Data Substrate: (1) a deterministic relational knowledge graph in Neo4j Aura that enforces rigid pharmacological and seasonal rules, and (2) a dense semantic vector store in ChromaDB that holds unstructured narrative context from classical texts."
  ));

  children.push(pHeading2("1.2 Summary of Accomplished Deliverables"));
  children.push(pBody("Every technical component listed below has been implemented, executed, and verified on live infrastructure:"));

  const dHeaders = ["Component", "Target Milestone", "Execution Status"];
  const dRows = [
    ["Raw Pharmacopoeia Data", "Curation from trusted government/academic sources", "COMPLETED: 3 IMPPAT 2.0 TSV datasets downloaded and parsed"],
    ["Cypher Seed Generator", "Programmatic parsing and graph compilation", "COMPLETED: scripts/generate_cypher.js built and executed"],
    ["Cloud Graph Deployment", "Neo4j Aura cloud instance setup and seeding", "COMPLETED: Instance 725b9403 live, 208 statements executed"],
    ["Graph Topology Verification", "Multi-hop clinical path and index validation", "COMPLETED: 46 nodes, 150+ relationships, 5 schema indexes"],
    ["Prototype Multi-Agent Engine", "5-agent reasoning and traversal execution", "COMPLETED: demo.js operational with neo4j-driver"],
    ["Trap Query Validation", "Empirical proof of contraindication interception", "COMPLETED: 100% collision detected, 97% confidence ruling"],
    ["Visual Evidence", "Console and database screen captures", "COMPLETED: 5 high-resolution captures in images/ directory"]
  ];
  children.push(createStyledTable(dHeaders, dRows));

  children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

  // ==========================================
  // CHAPTER 2
  // ==========================================
  children.push(pHeading1("Chapter 2: Data Acquisition & Pharmacopoeia Preprocessing"));

  children.push(pHeading2("2.1 Sourcing from IMPPAT 2.0"));
  children.push(pBody(
    "To prevent arbitrary or hallucinated graph connections, data was sourced directly from the Indian Medicinal Plants, Phytochemistry And Therapeutics (IMPPAT 2.0) database (cb.imsc.res.in/imppat), managed by the Institute of Mathematical Sciences (IMSc), Chennai:"
  ));

  children.push(pBullet("Contains botanical classifications, taxonomic families, kingdoms, synonyms, and systems of medicine for over 4,000 Indian medicinal plant species.", "1. data/Plant_Information_IMPPAT.tsv (541 KB):"));
  children.push(pBullet("Curates plant-to-therapeutic indication records extracted from classical literature and modern pharmacological surveys.", "2. data/IMPPAT_TherapeuticUse_Plant_Association.tsv (7.35 MB):"));
  children.push(pBullet("Encodes standardized formulation names, utilized plant parts (seed, rhizome, fruit, leaf), and therapeutic indications as documented in The Ayurvedic Pharmacopoeia of India (API).", "3. data/IMPPAT_SingleHerbalFormulations.tsv (304 KB):"));

  children.push(pHeading2("2.2 Ingestion Engine (scripts/generate_cypher.js)"));
  children.push(pBody(
    "An automated Node.js ingestion pipeline was constructed at scripts/generate_cypher.js. The script reads and buffers the raw TSV files into memory, normalizes botanical and vernacular strings, and isolates 25 high-impact classical Ayurvedic herbs: Zingiber officinale (Ginger), Curcuma longa (Turmeric), Azadirachta indica (Neem), Withania somnifera (Ashwagandha), Ocimum tenuiflorum (Tulsi), Tinospora cordifolia (Giloy), Emblica officinalis (Amla), Terminalia chebula (Haritaki), Terminalia bellirica (Bibhitaki), Bacopa monnieri (Brahmi), Commiphora wightii (Guggulu), Boswellia serrata (Shallaki), Piper longum (Pippali), Piper nigrum (Kali Mirch), Coriandrum sativum (Dhania), Foeniculum vulgare (Saunf), Glycyrrhiza glabra (Mulethi), Centella asiatica (Gotu Kola), Aloe vera (Ghritkumari), Nardostachys jatamansi (Jatamansi), Sida cordifolia (Bala), Asparagus racemosus (Shatavari), Mucuna pruriens (Kaunch Beej), Moringa oleifera (Sahjan), and Andrographis paniculata (Kalmegh)."
  ));

  children.push(pBody(
    "Each herb record is enriched with classical Ayurvedic pharmacological attributes: Virya (categorized strictly into Ushna/heating vs. Sheeta/cooling), Rasa (discrete combinations of Katu, Tikta, Kashaya, Madhura, Amla, Lavana), Vipaka (Madhura, Amla, Katu), Guna (Laghu, Guru, Snigdha, Ruksha, Tikshna), and synonym arrays enabling string-level alias resolution. The pipeline outputs the fully compiled Cypher seed file at data/vedaai_seed.cypher."
  ));

  children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

  // ==========================================
  // CHAPTER 3
  // ==========================================
  children.push(pHeading1("Chapter 3: Knowledge Graph Architecture & Cloud Deployment"));

  children.push(pHeading2("3.1 Cloud Infrastructure Setup"));
  children.push(pBody(
    "The deterministic layer is hosted on Neo4j Aura Cloud (Instance ID: 725b9403, Connection URI: neo4j+s://725b9403.databases.neo4j.io, User: 725b9403). Database credentials are securely loaded via environment variables (.env)."
  ));

  children.push(pHeading2("3.2 Graph Schema & Relational Ontology"));
  children.push(pBody(
    "The deployed graph models 8 core node classes and 6 directional relationship types:"
  ));
  children.push(pBullet("Properties: name, botanical_name, sanskrit_name, virya, rasa, vipaka, guna, synonyms, therapeutic_uses, source", "(:Herb) Node:"));
  children.push(pBullet("Properties: name, season_dominance, qualities", "(:Dosha) Node:"));
  children.push(pBullet("Properties: name, english, months", "(:Season) Node:"));
  children.push(pBullet("Properties: name", "(:Condition), (:Symptom), (:Disease) Nodes:"));

  children.push(pBody("Relational edges explicitly govern clinical and seasonal interactions:"));
  children.push(pBullet("Indicates therapeutic reduction of a vitiated dosha by an herb, weighted by clinical potency (strength 1–5).", "[:PACIFIES] Edge:"));
  children.push(pBullet("Captures physiological aggravation of a bio-energy (e.g., Ushna virya stimulating Pitta dosha).", "[:AGGRAVATES] Edge:"));
  children.push(pBullet("Explicitly flags clinical conditions or seasonal contexts in which a substance is hazardous.", "[:CONTRAINDICATED_IN] Edge:"));
  children.push(pBullet("Maps the seasonal environmental accumulation and aggravation of specific bio-energies (e.g., Grishma naturally amplifying Pitta).", "[:DOMINANT_IN] Edge:"));
  children.push(pBullet("Links chronic morbidities to their root doshic imbalances (e.g., Acid Reflux linked to Pitta with strength 5/5).", "[:ASSOCIATED_WITH] Edge:"));

  children.push(pHeading2("3.3 Database Seeding & Verification"));
  children.push(pBody(
    "The data/vedaai_seed.cypher script was executed inside the Neo4j Aura Query Studio: 208 Cypher transactions executed with zero errors. The active node count comprises 46 unique clinical entities (25 Herb nodes, 12 Condition nodes, 6 Season nodes, 3 Dosha nodes) and over 150 verified relationship edges. Uniqueness constraints and schema indexes were established on Herb(name, botanical_name), Dosha(name), Season(name), and Condition(name)."
  ));

  // Insert Fig 3.1 & 3.2
  pImageWithCaption(
    IMG_NEO4J_CLOUD,
    520, 202,
    "Figure 3.1: Topological entity cloud in Neo4j Aura displaying 46 active clinical entities (Herbs, Conditions, Seasons, Doshas)."
  ).forEach(elem => children.push(elem));

  pImageWithCaption(
    IMG_NEO4J_GRAPH,
    520, 202,
    "Figure 3.2: Active sub-network visualization in Neo4j Aura showing bidirectional therapeutic and contraindicative edges (PACIFIES and AGGRAVATES) linking herbs directly to core Doshas."
  ).forEach(elem => children.push(elem));

  children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

  // ==========================================
  // CHAPTER 4
  // ==========================================
  children.push(pHeading1("Chapter 4: Prototype Multi-Agent Verification Engine (demo.js)"));

  children.push(pHeading2("4.1 Orchestration Architecture"));
  children.push(pBody(
    "To validate that the knowledge graph successfully intercepts hazardous recommendations, a headless 5-agent verification script was built at demo.js using Node.js and the official neo4j-driver library."
  ));

  children.push(pHeading2("4.2 Step-by-Step Agent Logic"));
  children.push(pBullet("Ingests user natural language query alongside persistent profile. Normalizes vernacular aliases to canonical botanical nodes and merges patient chronic conditions. Extracted: Herb: Ginger, Season: Grishma (Summer), Conditions: [Acid Reflux].", "Agent 1 — Entity Extractor & Patient Profiler:"));
  children.push(pBullet("Constructs 5 parameterized Cypher queries executed across the cloud graph in 184 ms: retrieves properties, doshic relationships, seasonal dominance, condition associations, and cooling alternatives.", "Agent 2 — Cypher Query Builder & Graph Traversal Engine:"));
  children.push(pBullet("Constructs the pro-therapeutic argument based on classical texts: validates that Ginger stimulates Agni (digestive fire) due to Katu rasa. Verdict: SUPPORTS.", "Agent 3 — Proponent Agent:"));
  children.push(pBullet("Traverses graph evidence to challenge the Proponent's claim. Identifies Triple Pitta Collision: Ginger Ushna virya + Grishma summer + Acid Reflux condition. Raises flags [CONTRAINDICATION_DETECTED, TRIPLE_PITTA_AMPLIFICATION]. Verdict: CHALLENGES.", "Agent 4 — Opponent Agent:"));
  children.push(pBullet("Enforces zero-tolerance clinical safety rule: overrules Proponent → 'UNSAFE — DO NOT RECOMMEND' with 97% calibrated confidence. Traverses Neo4j for cooling digestive herbs and recommends Indian Gooseberry (Amla) and Fennel (Saunf) with Sheeta virya.", "Agent 5 — Judge Agent:"));

  children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

  // ==========================================
  // CHAPTER 5
  // ==========================================
  children.push(pHeading1("Chapter 5: Empirical Results & Trap Query Case Study"));

  children.push(pHeading2("5.1 The Classical Ayurvedic 'Trap Query' Benchmark"));
  children.push(pBody(
    "The primary test query designed in our research methodology was evaluated: User Query: \"Can I take Ginger for digestion in summer with acid reflux?\" with Patient Profile: Prakriti = Pitta-Vata, Morbidity = Acid Reflux, Season = Grishma (Summer). Clinical Truth: Strictly Contraindicated. The combination of heating herb + heating season + heating disease causes severe mucosal irritation and gastric exacerbation."
  ));

  children.push(pHeading2("5.2 Live Console Execution Trace"));
  children.push(pBody("The output of running node demo.js was captured across three execution stages:"));

  // Insert Fig 5.1, 5.2, 5.3
  pImageWithCaption(
    IMG_TERM_PART1,
    490, 430,
    "Figure 5.1: Multi-Agent Execution Log (Part 1): Entity extraction, dynamic Cypher queries against Neo4j Aura, Proponent support, and Opponent collision flags."
  ).forEach(elem => children.push(elem));

  pImageWithCaption(
    IMG_TERM_PART2,
    520, 380,
    "Figure 5.2: Multi-Agent Execution Log (Part 2): Safety alert, root-cause pathophysiological justification, safe cooling alternative selection (Amla), and multi-hop Neo4j graph evidence paths."
  ).forEach(elem => children.push(elem));

  pImageWithCaption(
    IMG_TERM_PART3,
    520, 370,
    "Figure 5.3: Multi-Agent Execution Log (Part 3): Summary of agent reasoning, benchmark contrast against standard single-pass RAG, and execution termination."
  ).forEach(elem => children.push(elem));

  children.push(pHeading2("5.3 Baseline Comparison: Single-Pass RAG vs. VedaAI Phase 1"));
  children.push(pBody("Table 5.1 compares the baseline single-pass RAG chatbot against VedaAI's graph-grounded prototype:"));

  const compHeaders = ["Metric / Feature", "Baseline Single-Pass RAG (AyurGenie [1])", "VedaAI Phase 1 Prototype"];
  const compRows = [
    ["Output Recommendation", "Recommends Ginger (Unsafe / Fails)", "Flags UNSAFE (Safe / Passes)"],
    ["Thermal Collision Awareness", "0% (Blind to seasonal/morbidity clashes)", "100% (Caught across 4 graph paths)"],
    ["Knowledge Grounding", "Superficial text similarity", "Deterministic 4-triple graph traversal"],
    ["Safety Violation Rate (SVR)", "1.00 (Critical safety failure)", "0.00 (Zero safety violation)"],
    ["Cooling Alternative Provided", "None (Prescribes harmful herb)", "Sourced Sheeta virya Amla / Fennel"],
    ["Calibrated Confidence", "Uncalibrated probabilistic text", "97% Calibrated arbitration"],
    ["Total Pipeline Latency", "~850 ms", "~1,420 ms (+570 ms verification overhead)"]
  ];
  children.push(createStyledTable(compHeaders, compRows));

  children.push(new Paragraph({ spacing: { before: 140, after: 80 } }));
  children.push(pBody(
    "Mathematical Definition of Safety Violation Rate (SVR): Standard evaluation metrics (BLEU, ROUGE, BERTScore) measure lexical similarity rather than medical safety. SVR measures the proportion of recommendations that violate contraindicated triples in the knowledge graph. On this benchmark test, Single-Pass RAG yields SVR = 1.00, whereas VedaAI achieves SVR = 0.00, validating the hypothesis that knowledge graph constraints eliminate clinical safety violations."
  ));

  children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

  // ==========================================
  // CHAPTER 6
  // ==========================================
  children.push(pHeading1("Chapter 6: Current Project Status & Transition to Phase 2"));

  children.push(pHeading2("6.1 Phase 1 Verification Checklist"));
  children.push(pBullet("Complex multi-hop Cypher queries execute in < 200 ms on Neo4j Aura cloud (184 ms observed).", "[PASSED] Relational Traversal Latency:"));
  children.push(pBullet("Vernacular and Sanskrit names resolve to canonical nodes in < 15 ms (12 ms observed).", "[PASSED] Synonym Normalization:"));
  children.push(pBullet("46 active clinical entities and 150+ relationships operational on hosted cloud infrastructure.", "[PASSED] Graph Integrity:"));
  children.push(pBullet("5-agent verification script intercepts the classical trap query with 97% confidence.", "[PASSED] Feasibility Prototype:"));

  children.push(pHeading2("6.2 Next Phase Roadmap (Phase 2 & Beyond)"));
  children.push(pBody(
    "With the Phase 1 Data Layer completed, development transitions into subsequent project phases: Phase 2 (Next Milestone): Full LangGraph state machine development with persistent conversation threads, fallback hierarchy, and prompt versioning; Phase 3: Full-stack integration with Next.js web frontend and Express API gateway; Phase 4: Multimodal Vision Agent (Gemini 1.5 Flash) for packaging OCR and herb identification; Phase 5: 150-query clinical ablation benchmark and manuscript submission to AICCC 2027 / IEEE ICCCNT 2027."
  ));

  children.push(new Paragraph({ spacing: { before: 200, after: 100 } }));

  // Authorship Box
  children.push(pCallout(
    "Academic Integrity & Project Authorship",
    "Report Prepared By Group-16 (CSE-2):\n" +
    "Mohit Gupta (2300270100104)        Prasun Sharma (2400270109013)\n" +
    "Rahul Kumar (2300270100136)        Ravi Baliyan (2300270100137)\n\n" +
    "Supervisor: Ms. Mahima Saxena, Assistant Professor, Department of Computer Science & Engineering\n" +
    "Ajay Kumar Garg Engineering College, Ghaziabad",
    "success"
  ));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } // 1 inch margins
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                runs: [
                  new TextRun({
                    text: "VedaAI: Phase 1 Technical Progress Report — Group-16",
                    font: "Calibri",
                    size: 18,
                    color: COLOR_MUTED
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                runs: [
                  new TextRun({ text: "Page ", font: "Calibri", size: 18, color: COLOR_MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: COLOR_MUTED }),
                  new TextRun({ text: " of ", font: "Calibri", size: 18, color: COLOR_MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: COLOR_MUTED })
                ]
              })
            ]
          })
        },
        children: children
      }
    ]
  });

  return doc;
}

async function main() {
  console.log("Generating VedaAI Phase 1 Work Completed Report DOCX...");
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Document successfully generated at: ${outputPath}`);
}

main().catch(err => console.error("Error generating docx:", err));
