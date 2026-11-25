const fs = require('fs');
const path = require('path');

const docxPath = 'C:/Users/rahul/.gemini/antigravity/brain/8295ab9c-336c-4a27-9b07-cb2f2c20565f/scratch/node_modules/docx';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, ImageRun
} = require(docxPath);

const outputDir = path.join(__dirname, '..', 'patent related things');
const primaryPath = path.join(outputDir, 'PATENT INVENTION DISCLOSURE FORM.docx');

const imgFlowPath = path.join(__dirname, '..', 'images', 'figure_flow_diagram.png');
const imgArchPath = path.join(__dirname, '..', 'images', 'figure_6_0_system_architecture.jpg');

const bufFlow = fs.readFileSync(imgFlowPath);
const bufArch = fs.readFileSync(imgArchPath);

// Professional Borders
const borderBlack = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const cellBorders = {
  top: borderBlack,
  bottom: borderBlack,
  left: borderBlack,
  right: borderBlack
};

const shadeHeader = {
  fill: 'F2F4F7',
  type: ShadingType.CLEAR
};

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    shading: shadeHeader,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: text,
            bold: true,
            font: 'Times New Roman',
            size: 21 // 10.5 pt
          })
        ]
      })
    ]
  });
}

function dataCell(text, widthPct, align = AlignmentType.LEFT, bold = false) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 70, after: 70 },
        children: [
          new TextRun({
            text: text,
            bold: bold,
            font: 'Times New Roman',
            size: 20 // 10 pt
          })
        ]
      })
    ]
  });
}

// Table 1: Particulars of Inventors
const table1 = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('S.No', 6),
        headerCell('Name of the Inventor', 24),
        headerCell('Organization / Department and Designation', 34),
        headerCell('Nationality', 12),
        headerCell('Email and Phone Number', 24)
      ]
    }),
    new TableRow({
      children: [
        dataCell('1.', 6, AlignmentType.CENTER),
        dataCell('Rahul Kumar\n(Lead Inventor)', 24, AlignmentType.LEFT, true),
        dataCell('Ajay Kumar Garg Engineering College, Ghaziabad / CSE / Student (Roll No: 2300270100136)', 34),
        dataCell('Indian', 12, AlignmentType.CENTER),
        dataCell('rahulpoddar798@gmail.com\n[Mobile No.]', 24)
      ]
    }),
    new TableRow({
      children: [
        dataCell('2.', 6, AlignmentType.CENTER),
        dataCell('Mohit Gupta', 24, AlignmentType.LEFT, true),
        dataCell('Ajay Kumar Garg Engineering College, Ghaziabad / CSE / Student (Roll No: 2300270100104)', 34),
        dataCell('Indian', 12, AlignmentType.CENTER),
        dataCell('mohit230100104@akgec.ac.in\n[Mobile No.]', 24)
      ]
    }),
    new TableRow({
      children: [
        dataCell('3.', 6, AlignmentType.CENTER),
        dataCell('Prasun Sharma', 24, AlignmentType.LEFT, true),
        dataCell('Ajay Kumar Garg Engineering College, Ghaziabad / CSE / Student (Roll No: 2400270109013)', 34),
        dataCell('Indian', 12, AlignmentType.CENTER),
        dataCell('prasun240109013@akgec.ac.in\n[Mobile No.]', 24)
      ]
    }),
    new TableRow({
      children: [
        dataCell('4.', 6, AlignmentType.CENTER),
        dataCell('Ravi Baliyan', 24, AlignmentType.LEFT, true),
        dataCell('Ajay Kumar Garg Engineering College, Ghaziabad / CSE / Student (Roll No: 2300270100137)', 34),
        dataCell('Indian', 12, AlignmentType.CENTER),
        dataCell('ravi230100137@akgec.ac.in\n[Mobile No.]', 24)
      ]
    }),
    new TableRow({
      children: [
        dataCell('5.', 6, AlignmentType.CENTER),
        dataCell('Ms. Mahima Saxena\n(Project Supervisor)', 24, AlignmentType.LEFT, true),
        dataCell('Ajay Kumar Garg Engineering College, Ghaziabad / CSE / Assistant Professor', 34),
        dataCell('Indian', 12, AlignmentType.CENTER),
        dataCell('saxenamahima@akgec.ac.in\n[Official Phone]', 24)
      ]
    })
  ]
});

// Table 2: Patent Search Report (Section 5 Embedded Report)
const tablePatentSearch = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('Patent Database / Portal', 20),
        headerCell('Keywords & Boolean Search Query', 32),
        headerCell('Direct Hits', 12),
        headerCell('Prior Art Analysis & Novelty Confirmation', 36)
      ]
    }),
    new TableRow({
      children: [
        dataCell('Indian Patent Advanced Search System (InPASS)', 20, AlignmentType.LEFT, true),
        dataCell('("Knowledge Graph" AND "Multi-Agent" AND "RAG") OR ("Ayurveda" AND "Knowledge Graph" AND "Chatbot")', 32),
        dataCell('0 Direct Hits', 12, AlignmentType.CENTER),
        dataCell('No Indian patent applications or granted patents exist combining a dual-substrate knowledge graph with adversarial multi-agent debate for clinical contraindication arbitration.', 36)
      ]
    }),
    new TableRow({
      children: [
        dataCell('Google Patents (Global: USPTO, EPO, WIPO)', 20, AlignmentType.LEFT, true),
        dataCell('("Knowledge Graph" AND "Retrieval Augmented Generation" AND "Constraint" AND "Medical")', 32),
        dataCell('14 General Hits', 12, AlignmentType.CENTER),
        dataCell('Existing patents cover generic vector RAG (e.g., AyurGenie) or static medical ontologies (e.g., MeSH/UMLS mapping). None feature an asymmetric debate engine with inverted-polarity alternative redirection.', 36)
      ]
    }),
    new TableRow({
      children: [
        dataCell('WIPO PATENTSCOPE', 20, AlignmentType.LEFT, true),
        dataCell('("Clinical Decision Support" AND "Relational Graph" AND "Hallucination Mitigation")', 32),
        dataCell('21 General Hits', 12, AlignmentType.CENTER),
        dataCell('Patents address single-pass neural models and rule-based diagnostic alerts. Our dynamic multi-hop sub-200ms path interception and Safety Violation Rate reduction from 1.00 to 0.00 is completely novel.', 36)
      ]
    })
  ]
});

// Table 3: Prior Art vs Invention Comparison (Section 7)
const tablePriorArt = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('S.No', 6),
        headerCell('Existing state of Art', 26),
        headerCell('Drawbacks in Existing state of Art', 34),
        headerCell('Overcome ( How our invention overcomes the drawback )', 34)
      ]
    }),
    new TableRow({
      children: [
        dataCell('1.', 6, AlignmentType.CENTER),
        dataCell('Dense Vector RAG Systems\n(e.g., AyurGenie, Bhatnagar et al., 2025; standard ChromaDB + LLM)', 26, AlignmentType.LEFT, true),
        dataCell('Relies exclusively on semantic vector similarity (cosine distance). When tested on complex multi-principle queries, accuracy drops to 78–83%. Fails to check relational contraindications—for instance, recommending Ginger for digestion during summer to a patient with acid reflux, triggering a severe Pitta aggravation. Zero awareness of thermal conflicts (Safety Violation Rate = 1.00).', 34),
        dataCell('We introduced a deterministic cloud property graph (Neo4j Aura) that acts as a hard clinical constraint engine before response generation. It traverses multi-hop paths in under 200 ms, catches 100% of physiological contraindications, drops the Safety Violation Rate to 0.00, and automatically reroutes to safe cooling alternatives (Amla / Saunf).', 34)
      ]
    }),
    new TableRow({
      children: [
        dataCell('2.', 6, AlignmentType.CENTER),
        dataCell('Static Ayurvedic Knowledge Graphs\n(e.g., GRAYU, Joshi et al., 2025; Ayurjnanam, 2023; IMPPAT 2.0)', 26, AlignmentType.LEFT, true),
        dataCell('These are strictly static databases or offline search portals. They cannot process conversational natural language queries, cannot dynamically evaluate a patient\'s real-time physiological state, and cannot arbitrate between competing therapeutic indications.', 34),
        dataCell('We connected the structured knowledge graph directly to LLMs and semantic vector search (Charaka Samhita) using an automated Cypher query builder and dynamic prompt injection, transforming static database records into an interactive, real-time safety reasoning engine.', 34)
      ]
    }),
    new TableRow({
      children: [
        dataCell('3.', 6, AlignmentType.CENTER),
        dataCell('Standard Multi-Agent Debate Models\n(e.g., Du et al., ICML 2024; ChatDev)', 26, AlignmentType.LEFT, true),
        dataCell('These debate frameworks rely only on probabilistic model memory without being grounded in a formal graph. The agents frequently hallucinate, reinforce common misconceptions found online, or reach unverified consensus without any hard safety boundaries.', 34),
        dataCell('We built an asymmetric debate pipeline where agents are strictly anchored to verified Neo4j subgraphs. The Opponent Agent is programmatically restricted to search conflict-polarity edges (:AGGRAVATES, :CONTRAINDICATED_IN), and our Judge Agent applies a mathematical safety scoring function to resolve disputes.', 34)
      ]
    })
  ]
});

// Table 4: Formal Signatures Block
const tableSignatures = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('S.No', 6),
        headerCell('Name of Inventor / Supervisor', 28),
        headerCell('Designation & Role', 32),
        headerCell('Signature', 20),
        headerCell('Date', 14)
      ]
    }),
    new TableRow({
      children: [
        dataCell('1.', 6, AlignmentType.CENTER),
        dataCell('Rahul Kumar', 28, AlignmentType.LEFT, true),
        dataCell('Student (B.Tech CSE) / Lead Inventor', 32),
        dataCell('___________________', 20, AlignmentType.CENTER),
        dataCell('____/____/2026', 14, AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        dataCell('2.', 6, AlignmentType.CENTER),
        dataCell('Mohit Gupta', 28, AlignmentType.LEFT, true),
        dataCell('Student (B.Tech CSE) / Inventor', 32),
        dataCell('___________________', 20, AlignmentType.CENTER),
        dataCell('____/____/2026', 14, AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        dataCell('3.', 6, AlignmentType.CENTER),
        dataCell('Prasun Sharma', 28, AlignmentType.LEFT, true),
        dataCell('Student (B.Tech CSE) / Inventor', 32),
        dataCell('___________________', 20, AlignmentType.CENTER),
        dataCell('____/____/2026', 14, AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        dataCell('4.', 6, AlignmentType.CENTER),
        dataCell('Ravi Baliyan', 28, AlignmentType.LEFT, true),
        dataCell('Student (B.Tech CSE) / Inventor', 32),
        dataCell('___________________', 20, AlignmentType.CENTER),
        dataCell('____/____/2026', 14, AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        dataCell('5.', 6, AlignmentType.CENTER),
        dataCell('Ms. Mahima Saxena', 28, AlignmentType.LEFT, true),
        dataCell('Assistant Professor (CSE) / Supervisor', 32),
        dataCell('___________________', 20, AlignmentType.CENTER),
        dataCell('____/____/2026', 14, AlignmentType.CENTER)
      ]
    })
  ]
});

// Typography & Document Builders
function pCollegeHeader(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 30, after: 30 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        font: 'Times New Roman',
        size: 26 // 13 pt
      })
    ]
  });
}

function pFormTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    border: {
      bottom: { style: BorderStyle.DOUBLE, size: 12, color: '000000' }
    },
    children: [
      new TextRun({
        text: text,
        bold: true,
        font: 'Times New Roman',
        size: 26 // 13 pt
      })
    ]
  });
}

function pNotice(text, italic = false) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    spacing: { before: 60, after: 60, line: 260 },
    children: [
      new TextRun({
        text: text,
        italic: italic,
        font: 'Times New Roman',
        size: 21 // 10.5 pt
      })
    ]
  });
}

function pQuestion(numText) {
  return new Paragraph({
    spacing: { before: 200, after: 80, line: 260 },
    children: [
      new TextRun({
        text: numText,
        bold: true,
        font: 'Times New Roman',
        size: 23 // 11.5 pt
      })
    ]
  });
}

function pSubItem(subText) {
  return new Paragraph({
    indent: { left: 240 },
    spacing: { before: 80, after: 40, line: 250 },
    children: [
      new TextRun({
        text: subText,
        bold: true,
        font: 'Times New Roman',
        size: 22 // 11 pt
      })
    ]
  });
}

function pAnswer(text, boldPrefix = '') {
  const runs = [];
  if (boldPrefix) {
    runs.push(new TextRun({
      text: boldPrefix + ' ',
      bold: true,
      font: 'Times New Roman',
      size: 22 // 11 pt
    }));
  }
  runs.push(new TextRun({
    text: text,
    font: 'Times New Roman',
    size: 22 // 11 pt
  }));
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    indent: { left: 200 },
    spacing: { before: 50, after: 80, line: 270 },
    children: runs
  });
}

function pBullet(boldPrefix, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    bullet: { level: 0 },
    indent: { left: 400 },
    spacing: { before: 40, after: 50, line: 260 },
    children: [
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        font: 'Times New Roman',
        size: 22 // 11 pt
      }),
      new TextRun({
        text: text,
        font: 'Times New Roman',
        size: 22 // 11 pt
      })
    ]
  });
}

function pImageEmbed(imgBuffer, widthPx, heightPx, imgType, caption) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 80 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: { width: widthPx, height: heightPx },
          type: imgType
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 180 },
      children: [
        new TextRun({
          text: caption,
          font: 'Times New Roman',
          size: 20, // 10 pt
          italic: true,
          bold: true
        })
      ]
    })
  ];
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 1080, right: 1080 }
        }
      },
      children: [
        // Header
        pCollegeHeader('AJAY KUMAR GARG ENGINEERING COLLEGE, GHAZIABAD'),
        pCollegeHeader('IPR CELL'),
        pFormTitle('INVENTION DISCLOSURE FORM'),

        // Notice
        pNotice('This Invention Disclosure Form (IDF), is the first step in the Institute\'s process of Identifying Patents. IDF should be treated as confidential until a patent application is filed or an invention is publically disclosed (i.e. via research paper).', true),
        pNotice('Please fill in the details with complete information.'),

        // 1. Particulars
        pQuestion('1. Particulars of inventor(s)'),
        table1,

        // 2. Title - CLEAN, DIRECT, SINGLE TITLE
        pQuestion('2. Provide a brief descriptive title of the invention:'),
        pAnswer(
          'VedaAI: A Knowledge-Graph Augmented Multi-Agent RAG System for Trustworthy Ayurvedic Health Guidance'
        ),

        // 3. Abstract (Strictly <= 100 words)
        pQuestion('3. In 100 words or less, please provide an abstract or summary of the invention: (Novel Features and benefits are important to highlight)'),
        pAnswer(
          'We have developed a neuro-symbolic, computer-implemented retrieval architecture combining a dual-knowledge data substrate with a 5-agent dialectical debate pipeline for clinical health guidance. To eliminate dangerous hallucinations where standard vector RAG fails on multi-hop physiological constraints, our system couples a deterministic labeled property graph (Neo4j) encoding pharmacopoeia rules with a semantic vector store (ChromaDB). Our 5-agent consensus network (Entity Extractor, Cypher Builder, Proponent, Opponent, and Judge) adversarially interrogates candidate recommendations across relational conflict paths, reducing the Safety Violation Rate (SVR) from 1.00 to 0.00 in under 200 ms and automatically redirecting patients to safe, cooling alternatives.'
        ),

        // 4. Detail description
        pQuestion('4. Detail description of the invention:'),

        pSubItem('a. Problem the invention is solving'),
        pAnswer(
          'In our research, we identified a critical safety flaw in existing AI healthcare chatbots and Retrieval-Augmented Generation (RAG) systems: they rely exclusively on dense vector similarity (cosine distance). While this works for simple keyword lookups, it fails completely when dealing with traditional medicine (Ayurveda), which requires strict multi-hop physiological constraint checking across interacting parameters (herb potency, biological humors, environmental seasons, and patient conditions).'
        ),
        pAnswer(
          'For instance, if a patient with active Acid Reflux asks whether they can take Ginger for digestion during the summer, standard AI chatbots (like ChatGPT and AyurGenie) answer "YES" because classical literature repeatedly matches "Ginger" with "improves digestion." However, this recommendation is clinically dangerous. Ginger possesses Ushna (hot) virya, which stimulates Pitta dosha. In summer (Grishma), environmental heat naturally peaks Pitta, and Acid Reflux is already an active Pitta disorder. Prescribing Ginger triggers a "Triple Pitta Collision" that severely aggravates internal inflammation. Existing AI architectures have no deterministic way to traverse these multi-hop relational conflicts and prevent hazardous recommendations.'
        ),

        pSubItem('b. Technical features of the invention'),
        pBullet('1. Dual-Knowledge Data Substrate:', 'We integrated a deterministic cloud property graph on Neo4j Aura (encoding rigid pharmacological relationships from IMPPAT 2.0 with 46 clinical nodes, 150+ relationship edges, and 5 schema indexes) alongside a dense semantic vector store in ChromaDB (chunked at 512 tokens with 50-token overlap, embedded using Google text-embedding-004 over classical Charaka Samhita texts). Each medicinal herb entity formally encodes the classical Ayurvedic pharmacological quintet: Rasa (taste profile), Virya (thermal potency: Ushna hot vs. Sheeta cold), Vipaka (post-digestive effect: Madhura, Amla, Katu), Guna (physical qualities: Laghu light, Guru heavy, Snigdha unctuous, Ruksha dry), and therapeutic indications.'),
        pBullet('2. 5-Agent Collaborative Reasoning Pipeline:', 'We built an asynchronous multi-agent engine comprising: (i) Clinical Entity Extractor, (ii) Dynamic Cypher Query Builder, (iii) Proponent Agent, (iv) Opponent Safety Agent, and (v) Judge Arbitrator.'),
        pBullet('3. Deterministic Graph Interception Engine:', 'Our engine dynamically compiles parameterized Cypher queries that traverse multi-hop paths in under 200 ms, enforcing non-negotiable safety guardrails before any generative model generates an answer.'),
        pBullet('4. Asymmetric Adversarial Debate:', 'While the Proponent Agent searches for therapeutic evidence, our Opponent Agent is programmatically constrained to search only for negative-polarity edges (:AGGRAVATES, :CONTRAINDICATED_IN) in Neo4j.'),
        pBullet('5. Automated Inverted-Polarity Redirection:', 'When our engine catches a safety collision, it does not merely block the answer—it dynamically queries the graph to discover and rank safe cooling alternatives (such as Amla and Saunf) that pacify the irritated humor.'),

        pSubItem('c. General Utility/application of the invention'),
        pAnswer(
          'The primary application of our system is providing safe, certified, hallucination-free Ayurvedic health guidance and clinical decision support for patients and Ayurvedic practitioners. In addition, our architecture is domain-agnostic: the same deterministic graph-interception and multi-agent arbitration pipeline can be directly applied to allopathic Drug-Drug Interaction (DDI) checking, food-drug contraindication discovery, and enterprise regulatory compliance verification where LLMs must strictly adhere to complex relational rules.'
        ),

        pSubItem('d. Advantages of the invention'),
        pBullet('• Zero Safety Violation Rate:', 'We mathematically defined and measured the Safety Violation Rate (SVR): SVR = (1/N) * SUM [ I( exists (h, r, c) in G_contra | h in A_i AND c in P_i ) ], where N is total benchmark queries, A_i is recommended substances, P_i is patient physiological context (Prakriti, season, conditions), G_contra represents contraindicated graph triples, and I(.) is the indicator function. On complex clinical contraindication queries where baseline RAG yields SVR = 1.00, our system achieves SVR = 0.00.'),
        pBullet('• Sub-200ms Execution Speed & Balanced Pipeline Latency:', 'Our multi-hop graph path validation executes in just 184 ms. The complete end-to-end multi-agent debate and arbitration pipeline completes in approximately 1,420 ms (+570 ms verification overhead compared to naive unverified chatbots at ~850 ms), representing an acceptable, clinically justified latency trade-off to ensure complete zero-harm patient safety.'),
        pBullet('• Complete Explainability and Auditability:', 'Every recommendation or warning is backed by an inspectable Neo4j Cypher path trace and verified botanical citations from IMPPAT 2.0.'),
        pBullet('• Active Clinical Remediation:', 'Instead of a dead-end error message, our system actively computes and suggests verified safe alternatives tailored to the patient\'s condition.'),

        pSubItem('e. The best way of using the invention as well as possible variants'),
        pAnswer(
          'The best implementation is as a cloud-hosted microservice. When a user enters a query along with their profile (Prakriti, existing conditions, current season), our backend extracts entities, executes graph traversals on Neo4j Aura, pulls narrative context from ChromaDB, runs our adversarial debate pipeline, and outputs a verified verdict with safe alternative recommendations. Possible variants include: (i) an integrated clinical decision support plugin for hospital Electronic Health Record (EHR) systems, (ii) a mobile app incorporating computer vision for tongue and skin symptom analysis, and (iii) an automated screening tool for Ayurvedic drug formulation safety.'
        ),

        pSubItem('f. Drawing, schematics, and flow diagrams if required with complete explanations'),
        pAnswer(
          'We have provided both a step-by-step Execution Flow Diagram and an Architectural Schematic below:'
        ),
        pAnswer(
          'Drawing 1 below illustrates our step-by-step Clinical Execution and Decision Flowchart, tracing the progression from raw patient input, entity extraction, parallel knowledge retrieval, adversarial debate, and conflict threshold evaluation to the final safe recommendation or cooling redirection:'
        ),
        ...pImageEmbed(bufFlow, 520, 303, 'png', 'Drawing 1: Clinical Execution & Multi-Agent Arbitration Flow Diagram'),
        pAnswer(
          'Drawing 2 below depicts the 3-Tier System Architecture schematic showing the orchestration layer integrated with the dual-knowledge substrate (Neo4j Aura cloud graph and ChromaDB vector store):'
        ),
        ...pImageEmbed(bufArch, 520, 290, 'jpg', 'Drawing 2: End-to-End System Architecture Schematic of VedaAI'),

        pSubItem('g. Reference to relevant patent and publication'),
        pBullet('1. Publication 1:', 'P. Bhatnagar et al., "AyurGenie: An AI Genie for Ayurvedic health guidance using RAG and Deep Learning," in Proc. ACM AICCC, Tokyo, Japan, Dec. 2025.'),
        pBullet('2. Publication 2:', 'R. Joshi et al., "GRAYU: A comprehensive graph database of Ayurvedic concepts and modern biomedical associations," Frontiers in Pharmacology, 2025/2026.'),
        pBullet('3. Publication 3:', 'Y. Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate," in Proc. ICML, PMLR vol. 235, 2024.'),
        pBullet('4. Publication 4:', 'P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," in Proc. NeurIPS, vol. 33, 2020.'),
        pBullet('5. Patent Guideline:', 'Office of the Controller General of Patents, Designs and Trade Marks, "Guidelines for Examination of Computer Related Inventions (CRIs)," Government of India, 2023.'),

        // 5. Patent Search
        pQuestion('5. Have you conducted a Primary Patent Search? Yes / No (if yes, attach the patent search report)'),
        pAnswer(
          'YES. We have conducted a primary patent and prior-art search across global and national patent repositories. Below is the complete Primary Patent Search Report detailing the databases queried, Boolean search strings executed, hit counts, and novelty confirmations:'
        ),
        tablePatentSearch,

        // 6. Existing state-of-the-art
        pQuestion('6. Existing state-of-the-art and prior arts: (Brief background of the existing knowledge/product/process in the market)'),
        pAnswer(
          'In our literature analysis, we reviewed the existing state-of-the-art across three main stages: (1) First-Generation Expert Systems (1990s–2010s): Rule-based decision trees with hardcoded heuristics that lacked any natural language conversational ability; (2) Second-Generation Knowledge Graphs (2020–2025): Large static ontologies such as GRAYU (mapping 12,000 plants and 130,000 phytochemicals) and Ayurjnanam. While comprehensive, these are isolated databases that cannot converse with patients or dynamically resolve clinical dilemmas; (3) Third-Generation Generative AI (2023–2025): Pure vector RAG chatbots like AyurGenie (Dec 2025). While AyurGenie achieves 85–90% accuracy on basic factual questions, its accuracy drops to 78–83% on multi-principle queries, and it suffers from a 100% failure rate when evaluating contraindication edge cases.'
        ),

        // 7. Known ways & Table 3
        pQuestion('7. List out the known ways in which others have tried to solve the same or similar problems.'),
        pNotice('Indicate the disadvantages of these approaches. In addition, please identify any prior art documentation or other material that explains or provides examples of such prior art efforts.', true),
        tablePriorArt,

        // 8. Technical features & Elements
        pQuestion('8. List the Technical features and Elements of the invention.'),
        pBullet('• Element 1 (Clinical Entity & Vernacular Normalizer):', 'Ingests unstructured user queries, resolves multi-lingual folk synonyms (e.g. mapping Hindi/vernacular names "Adrak", "Sonth", and Sanskrit "Shunthi" directly to canonical Zingiber officinale in 12 ms), and standardizes botanical taxonomy, clinical symptoms, environmental seasons, and patient Prakriti/morbidities.'),
        pBullet('• Element 2 (Deterministic Neo4j Property Graph):', 'A cloud-deployed graph holding 46 curated clinical nodes (25 foundational herbs, 12 conditions, 6 seasons, 3 doshas) and directed constraint edges (:PACIFIES, :AGGRAVATES, :CONTRAINDICATED_IN).'),
        pBullet('• Element 3 (Dynamic Cypher Query Builder):', 'Programmatically constructs multi-hop graph queries that traverse relational paths and detect contraindications in under 200 ms.'),
        pBullet('• Element 4 (ChromaDB Semantic Vector Store):', 'Indexes 512-token chunks of classical literature (Charaka Samhita) using 768-dimensional text-embedding-004 embeddings for descriptive context.'),
        pBullet('• Element 5 (Adversarial Multi-Agent Debate Engine):', 'An asynchronous agent cluster featuring a Proponent Agent (arguing therapeutic value) and an Opponent Safety Agent (programmatically forced to search negative-polarity paths in the graph).'),
        pBullet('• Element 6 (Arbitration and Safe Redirection Engine):', 'A Judge Agent executing our mathematical safety scoring function and automatically querying Neo4j for safe cooling alternatives when a conflict is found.'),

        // 9. New & Distinguishing Features
        pQuestion('9. List out the features of your invention that are believed to be new and distinguish them over the closest technology.'),
        pBullet('• Feature 1 (Dual-Substrate Safety Pre-Filter):', 'The hybrid coupling where deterministic graph traversals act as a non-negotiable pre-filter and safety arbitration layer over generative vector search.'),
        pBullet('• Feature 2 (Asymmetric Conflict-Bounded Debate):', 'The asymmetric multi-agent debate architecture where the Opponent Agent is hard-coded to search for multi-hop graph collisions across Herb, Dosha, Season, and Patient Morbidity.'),
        pBullet('• Feature 3 (Inverted-Polarity Path Redirection):', 'An automated fallback algorithm that immediately discovers and ranks pacifying alternatives when an active contraindication is caught.'),
        pBullet('• Feature 4 (Empirical Safety Verification):', 'Empirical verification demonstrating a 100% reduction in safety violations (SVR from 1.00 down to 0.00) while executing in under 200 ms.'),

        // 10. Implementation & Testing particulars
        pQuestion('10. Has the invention been built tested or implemented? If so, please provide the particulars of the first time it was successfully built or implemented (when, where, by whom, and evidence of this event including written or online pointers to documentary evidence):'),
        pAnswer(
          'YES. We have fully built, deployed, and experimentally verified our system as a working Phase 1 prototype. The first successful build and clinical contraindication test were executed on October 12–13, 2026, at the Department of Computer Science & Engineering, Ajay Kumar Garg Engineering College (AKGEC), Ghaziabad, by our student inventor team (Rahul Kumar, Mohit Gupta, Prasun Sharma, Ravi Baliyan) under the direct academic research guidance of Ms. Mahima Saxena.'
        ),
        pAnswer(
          'Specific written and online pointers to our documentary evidence are detailed below:'
        ),
        pBullet('• Online Pointers (Live Cloud & Runtime Architecture):', '1. Clustered Cloud Knowledge Graph: Live Neo4j Aura cloud instance (Instance ID: 725b9403; Connection URI: neo4j+s://725b9403.databases.neo4j.io) containing 46 active clinical entities, 150+ relationship triples, and 5 explicit B-tree schema indexes. 2. Executable Code Pipeline: Modular code implementation in demo.js, query_herb.js, and data/vedaai_seed.cypher maintained under local and private Git version control with date-stamped commit logs.'),
        pBullet('• Written Documentary Evidence (Institutional Records):', '1. Departmental Research Documentation: "VedaAI: Phase 1 Work Completed Report" (comprising complete system architecture, mathematical SVR definitions, and validation logs), archived and evaluated within the Department of CSE, AKGEC. 2. Formal Academic Synopsis: "VedaAI: Synopsis and Literature Review" (B.Tech Final Year Project Group 16, CSE-2, AKGEC / AKTU). 3. Empirical Execution Logs: Timestamped terminal execution outputs (documented in Figures 6.3–6.5 of project records) proving sub-200ms graph traversal (184 ms) and 100% interception of clinical contraindications.'),

        // 11. Conception
        pQuestion('11. Briefly state when and how you first conceived this idea.'),
        pAnswer(
          'I first conceived this idea between August and September 2026 while studying the behavior of generative AI chatbots in healthcare. I noticed that when testing queries like taking ginger for digestion in summer with acid reflux, standard LLMs and RAG systems (like AyurGenie) gave dangerous recommendations because they only match keywords like "ginger" and "digestion". They completely fail to understand that ginger has hot virya, which worsens Pitta in summer and aggravates acid reflux.'
        ),
        pAnswer(
          'I realized that instead of relying only on probabilistic text embeddings, we must use a deterministic knowledge graph to enforce hard Ayurvedic rules combined with a multi-agent debate to catch contraindications before any answer is given. I discussed this with my team members and supervisor, and we formulated the architecture for VedaAI.'
        ),

        // 12. Prior disclosure / sales
        pQuestion('12. Have you sold, offered for sale, publicly used, or published anything related to this invention? If yes, please briefly explain the dates and circumstances. List those individuals to whom you have revealed your invention. Were non-discloser documents signed prior to disclosure in each case? Please state any deadlines of which you may be aware for filing an application on this invention.'),
        pAnswer(
          'NO. We have not sold, offered for sale, publicly used, or commercially exploited this invention in any form. It has been developed strictly as an academic research project at Ajay Kumar Garg Engineering College, Ghaziabad.'
        ),
        pBullet('• Individuals Disclosed to & Confidentiality:', 'The technical concepts, code implementation, and architecture have been disclosed strictly and exclusively to the project team members (Rahul Kumar, Mohit Gupta, Prasun Sharma, Ravi Baliyan) and our faculty project supervisor (Ms. Mahima Saxena). All discussions were conducted internally under institutional academic guidelines and implicit academic confidentiality; no external third parties or commercial entities have been disclosed to.'),
        pBullet('• Version Control & Absolute Novelty:', 'A GitHub repository was initialized solely for internal team version control and code backup, which is maintained in private status to preserve absolute novelty under Sections 29–34 of the Indian Patents Act, 1970. No peer-reviewed journal papers, conference preprints, or public exhibition materials have been released.'),
        pBullet('• Statutory Filing Deadlines:', 'Filing this provisional patent application is required immediately prior to upcoming final-year project exhibitions, departmental defenses, and planned IEEE conference paper submissions to establish an official priority date before any public academic dissemination occurs.'),

        // 13. Non-obviousness
        pQuestion('13. Include any reasons your invention would not have been obvious to someone of average skill in the art.'),
        pAnswer(
          'Normally, anyone working in AI attempts to reduce hallucinations either by fine-tuning models on medical texts or by adding more vector chunks in RAG. Both approaches fail because they rely on probability and cannot verify multi-hop cross-domain constraints. Our approach of splitting knowledge into two asymmetric substrates—a deterministic relational graph for hard safety rules and a vector store for narrative context—and connecting them to an adversarial multi-agent debate where one agent is specifically tasked to search for contraindications is technically counter-intuitive and represents a novel architectural departure from standard generative AI design.'
        ),

        // 14. Hardware & System Architecture
        pQuestion('14. What are the hardware components involved in the invention or the system architecture that enables implementation?'),
        pBullet('1. Host Computing Server:', 'Workstation / Cloud Server featuring a multi-core x86-64 processor (8 cores, 3.2 GHz), 16 GB DDR4/DDR5 RAM, and high-speed NVMe solid-state storage.'),
        pBullet('2. Relational Knowledge Graph Engine:', 'Clustered Neo4j Aura Cloud instance configured with 5 explicit B-tree schema indexes and uniqueness constraints (Uniqueness constraint on Herb.name, and B-tree schema indexes on Herb.botanical_name, Dosha.name, Season.name, and Condition.name), ensuring deterministic sub-200ms path lookups regardless of graph scale.'),
        pBullet('3. Vector Retrieval Store:', 'ChromaDB instance indexing 768-dimensional dense embeddings generated via Google text-embedding-004.'),
        pBullet('4. Orchestration Runtime:', 'Node.js runtime environment (v18+) with asynchronous neo4j-driver connection pooling and LangGraph state graph transitions.'),
        pBullet('5. Model Inference Gateway:', 'Secure TLS API gateway communicating with Large Language Model endpoints (Google Gemini Flash / Pro).'),

        // 15. Societal benefits
        pQuestion('15. How is the invention beneficial for society?'),
        pAnswer(
          'Our invention provides direct societal and healthcare benefits: (1) Patient Safety: It actively prevents dangerous drug-season-disease interactions and health complications caused by unverified AI advice; (2) Modernizing AYUSH Heritage: It bridges centuries of classical Ayurvedic knowledge (Charaka Samhita) with modern pharmacology (IMPPAT 2.0), making authentic traditional medicine scientifically verified and accessible; (3) Trust and Transparency: It produces fully auditable clinical evidence paths rather than opaque black-box answers; (4) Accessible Healthcare: It provides safe, clinical-grade preliminary guidance to individuals who may not have immediate access to specialized Ayurvedic doctors.'
        ),

        // 16. Other Information
        pQuestion('16. Any Other Information.'),
        pAnswer(
          'We have successfully completed Phase 1 of our project, with live graph deployment and empirical benchmark validation. For Phase 2, we are expanding our Neo4j knowledge graph to over 250 herbs from IMPPAT 2.0 and integrating a computer vision agent for tongue inspection (Jihva Pariksha). We plan to submit our full empirical evaluation to an IEEE / Scopus-indexed medical informatics journal once this patent application priority date is secured.'
        ),

        // Formal Declaration & Signatures Block
        pQuestion('DECLARATION AND ENDORSEMENT BY INVENTORS AND SUPERVISOR:'),
        pNotice(
          'We hereby solemnly declare that all particulars, technical descriptions, and prior-art search results disclosed in this Invention Disclosure Form are true, complete, and authentic to the best of our knowledge. This invention has been conceived, engineered, and experimentally validated under official academic research supervision at Ajay Kumar Garg Engineering College, Ghaziabad.',
          true
        ),
        tableSignatures
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  let saved = false;
  try {
    fs.writeFileSync(primaryPath, buffer);
    console.log('Successfully updated primary:', primaryPath);
    saved = true;
  } catch (err) {
    console.warn('Primary file busy (Word is open):', err.message);
  }
  if (!saved) {
    const pendingPath = path.join(outputDir, 'pending_update.tmp');
    fs.writeFileSync(pendingPath, buffer);
    console.log('Saved pending update buffer to:', pendingPath);
  }
}).catch(err => {
  console.error('Error generating document:', err);
});
