# VedaAI

VedaAI is an experimental Ayurvedic decision-support application. The active consultation workflow retrieves attributable records, records gaps in safety coverage, and computes its verdict in application code. An IMPPAT reported-use association describes a database entry. Clinical efficacy and patient-specific safety require additional evidence.

See [Evidence-first architecture and operating guide](EVIDENCE_ARCHITECTURE.md) for the workflow, API contract, schema migration, evaluation results and release limitations. Earlier phase reports, presentations, generated manuscripts and demo programs describe historical prototypes. Their clinical examples, confidence values and performance claims are illustrative or historical and have no standing as clinical validation of the current system.

## Run locally

Configure the variables from `.env.example` in a local `.env`. From the repository root on Windows run

```powershell
npm.cmd ci
npm.cmd --prefix client ci
npm.cmd run build:web
npm.cmd start
```

Open http://localhost:4000. A second terminal can run `npm.cmd --prefix client run dev` for the Vite development client. The server serves text and image consultations, evidence inspection, follow-ups, label extraction and the herb catalog. Screens explicitly labelled as demonstrations use sample data.

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

See [LICENSE](LICENSE) for the project license.
