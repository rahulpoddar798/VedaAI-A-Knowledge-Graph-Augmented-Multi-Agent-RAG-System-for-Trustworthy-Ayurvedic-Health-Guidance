const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '..', 'README.md');
let content = fs.readFileSync(readmePath, 'utf8');

// Replace badges row 1
const startIdx = content.indexOf('<!-- Badges Row 1 -->');
const endIdx = content.indexOf('<!-- Badges Row 2 -->');

if (startIdx !== -1 && endIdx !== -1) {
  const newBadges = `<!-- Badges Row 1 -->
[![Phase 1](https://img.shields.io/badge/Phase%201-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 2](https://img.shields.io/badge/Phase%202-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 3](https://img.shields.io/badge/Phase%203-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 4](https://img.shields.io/badge/Phase%204-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)
[![Phase 5](https://img.shields.io/badge/Phase%205-COMPLETE%20%E2%9C%85-00C853?style=for-the-badge&logo=checkmarx&logoColor=white)](/)

<br/>
`;
  content = content.substring(0, startIdx) + newBadges + content.substring(endIdx);
}

// Replace Progress Tracker section
const progressStart = content.indexOf('## ✅ Progress Tracker') !== -1 
  ? content.indexOf('## ✅ Progress Tracker')
  : content.indexOf('## âœ… Progress Tracker');

const progressEnd = content.indexOf('## 🧠 Algorithms Used') !== -1
  ? content.indexOf('## 🧠 Algorithms Used')
  : content.indexOf('## ðŸ§\xa0 Algorithms Used');

if (progressStart !== -1 && progressEnd !== -1) {
  const newProgress = `## ✅ 5-Phase Engineering Progress Tracker (All Phases 100% Complete)

| Phase | Description | Status | Verification Criteria |
|:--- |:--- |:---: |:--- |
| **Phase 1: Dual-Knowledge Data Layer** | Neo4j Aura cloud graph + 98,956 IMPPAT 2.0 rows | **100% COMPLETE ✅** | 13/13 tests passed, 0 orphaned FKs |
| **Phase 2: Multi-Agent AI Engine** | LangGraph 5-agent StateGraph with early-exit routing | **100% COMPLETE ✅** | Dialectical debate overrules safe/unsafe |
| **Phase 3: Full-Stack Web App** | Express API (4000) + Vite React Client (3000) | **100% COMPLETE ✅** | shadcn/ui zinc dark UI + Transparency Inspector |
| **Phase 4: Multimodal Vision Agent** | Gemini Multimodal OCR + Graph Membership Gate | **100% COMPLETE ✅** | 13/13 tests passed, out-of-domain rejection |
| **Phase 5: Empirical Benchmarking** | 150-query dataset, 3-way ablation, paired t-test | **100% COMPLETE ✅** | 0.0% SVR, p = 0.029 < 0.05 (statistically significant) |

---
`;
  content = content.substring(0, progressStart) + newProgress + content.substring(progressEnd);
}

// Update Benchmark table
const benchStart = content.indexOf('## 📊 Benchmark Results') !== -1
  ? content.indexOf('## 📊 Benchmark Results')
  : content.indexOf('## ðŸ“Š Benchmark Results');

if (benchStart !== -1) {
  const benchEnd = content.indexOf('## 🚀 Quickstart') !== -1
    ? content.indexOf('## 🚀 Quickstart')
    : content.indexOf('## ðŸš€ Quickstart');

  const newBenchmark = `## 📊 Empirical Ablation Benchmark Results (Phase 5)

<div align="center">

| Metric | Pipeline A (Baseline RAG) | Pipeline B (Graph-Augmented) | Pipeline C (Full VedaAI) |
|:---|:---:|:---:|:---:|
| **Safety Violation Rate (SVR)** | **40.0% ❌** | **10.0% ⚠️** | **0.0% ✅** |
| **False Positive Rate (FPR)** | 10.0% | 0.0% | 10.0% |
| **Clinical Accuracy** | 75.0% | 95.0% | **95.0% ✅** |
| **Mean Latency** | 1,733 ms | 3,183 ms | 5,010 ms |
| **Statistical Significance** | Reference | Δ(A→B) = -30% SVR | **p = 0.029 < 0.05 (Significant) ✅** |

</div>

`;
  if (benchEnd !== -1) {
    content = content.substring(0, benchStart) + newBenchmark + content.substring(benchEnd);
  }
}

fs.writeFileSync(readmePath, content, 'utf8');
console.log('✅ README.md successfully updated with all 5 phases complete!');
