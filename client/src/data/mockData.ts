import type {
  AdminReviewItem,
  LabelAuditResult,
  PatientProfile
} from '../types/veda';

export const DEFAULT_PROFILE: PatientProfile = {
  fullName: '', ageGroup: '', biologicalSex: '', prakriti: '', vikriti: '', season: '',
  conditions: [], allergies: [], medications: [], dietaryPreference: '', avoidAlcoholExtracts: false, notes: ''
};

/**
 * Generates clean, high-contrast pharmaceutical label preview SVGs as data URIs
 * so OCR bounding-box annotations align cleanly with the printed label regions.
 */
function makeLabelSvgDataUri(opts: {
  title: string;
  subtitle: string;
  batch: string;
  lines: Array<{ text: string; muted?: boolean; smudged?: boolean }>;
  footer: string;
  variant: 'herbal' | 'tulsi' | 'electronics';
}): string {
  const accent =
    opts.variant === 'electronics'
      ? '#3B4252'
      : opts.variant === 'tulsi'
      ? '#164B45'
      : '#173D32';
  const bg = opts.variant === 'electronics' ? '#ECEFF4' : '#FAF8F2';

  const lineMarkup = opts.lines
    .map((line, idx) => {
      const y = 178 + idx * 34;
      const fill = line.smudged ? '#8C948E' : line.muted ? '#5C6660' : '#1E2924';
      const opacity = line.smudged ? '0.62' : '1';
      const style = line.smudged ? 'font-style="italic" letter-spacing="1.2"' : '';
      return `<text x="58" y="${y}" font-family="DM Sans, Arial, sans-serif" font-size="14" font-weight="${
        line.muted ? '400' : '600'
      }" fill="${fill}" opacity="${opacity}" ${style}>${line.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">
    <rect width="640" height="440" fill="#EAE6DC"/>
    <rect x="28" y="24" width="584" height="392" rx="14" fill="${bg}" stroke="#CDD5CE" stroke-width="2"/>
    <rect x="28" y="24" width="584" height="86" rx="14" fill="${accent}"/>
    <rect x="28" y="88" width="584" height="22" fill="${accent}"/>
    <text x="58" y="64" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#FFFFFF">${opts.title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</text>
    <text x="58" y="92" font-family="DM Sans, Arial, sans-serif" font-size="12" fill="#DCE6DE">${opts.subtitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</text>
    <text x="58" y="138" font-family="DM Sans, Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.4" fill="${accent}">COMPOSITION / SUPPLEMENT FACTS</text>
    <line x1="58" y1="148" x2="582" y2="148" stroke="#D5DDD6" stroke-width="1.5"/>
    ${lineMarkup}
    <line x1="58" y1="362" x2="582" y2="362" stroke="#D5DDD6" stroke-width="1.5"/>
    <text x="58" y="388" font-family="monospace" font-size="11" fill="#5C6660">${opts.batch
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</text>
    <text x="582" y="388" text-anchor="end" font-family="DM Sans, Arial, sans-serif" font-size="11" fill="#5C6660">${opts.footer
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SampleLabelPreset {
  id: 'trikatu-ashwagandha' | 'tulsi-cooling' | 'out-of-domain';
  label: string;
  subtitle: string;
  imageUrl: string;
  audit: LabelAuditResult;
}

export const SAMPLE_LABEL_AUDITS: SampleLabelPreset[] = [
  {
    id: 'trikatu-ashwagandha',
    label: 'Trikatu & Ashwagandha Churna',
    subtitle: 'Mixed flags, unverified & uncertain OCR',
    imageUrl: makeLabelSvgDataUri({
      title: 'Trikatu & Ashwagandha Digestive Blend',
      subtitle: 'Classical Ayurvedic Churna · 500 mg Botanical Extract Capsules',
      batch: 'BATCH #VD-2026-084 · MFG 04/2026',
      footer: 'Demonstration Label Mockup',
      variant: 'herbal',
      lines: [
        { text: '1. Shunthi (Zingiber officinale) Rhizome — 150 mg' },
        { text: '2. Pippali (Piper longum) Fruit Extract — 100 mg' },
        { text: '3. Ashwagandha (Withania somnifera) Root — 200 mg' },
        { text: '4. Amalaki (Emblica officinalis) Fruit — 100 mg' },
        { text: '5. Bioperine Standardized Carrier Complex — 25 mg', muted: true },
        { text: '6. [Smudged print: "...karra churna ext... 15 mg"]', smudged: true }
      ]
    }),
    audit: {
      isSampleData: true,
      sampleLabelTitle: 'Trikatu & Ashwagandha Digestive Blend (Demonstration Sample)',
      durationMs: 1420,
      extraction: {
        product_name: 'Trikatu & Ashwagandha Digestive Blend',
        manufacturer: 'AyurBotanical Formulations (Sample)',
        formulation_type: 'Capsule (Churna Extract)',
        visual_confidence: 0.89,
        is_supplement_label: true,
        summary:
          'Multi-herb digestive and adaptogenic formulation containing heating Trikatu components (Ginger, Long Pepper) paired with Ashwagandha and Amalaki, plus one uncataloged excipient and one partially smudged line.',
        extracted_ocr_text: `TRIKATU & ASHWAGANDHA DIGESTIVE BLEND
Classical Ayurvedic Churna · 500 mg Botanical Extract Capsules
COMPOSITION / SUPPLEMENT FACTS
1. Shunthi (Zingiber officinale) Rhizome — 150 mg
2. Pippali (Piper longum) Fruit Extract — 100 mg
3. Ashwagandha (Withania somnifera) Root — 200 mg
4. Amalaki (Emblica officinalis) Fruit — 100 mg
5. Bioperine Standardized Carrier Complex — 25 mg
6. [Smudged print: "...karra churna ext... 15 mg"]
BATCH #VD-2026-084 · MFG 04/2026`
      },
      ocrBoxes: [
        {
          id: 'box-product',
          label: 'Product Header (97% OCR)',
          category: 'product',
          x: 6,
          y: 8,
          width: 82,
          height: 16,
          confidence: 0.97
        },
        {
          id: 'box-ginger',
          label: 'Shunthi · Ginger (94% OCR)',
          category: 'flagged',
          x: 8,
          y: 37,
          width: 72,
          height: 6.5,
          ingredientRef: 'ing-ginger',
          confidence: 0.94
        },
        {
          id: 'box-pippali',
          label: 'Pippali · Long Pepper (92% OCR)',
          category: 'flagged',
          x: 8,
          y: 44.8,
          width: 70,
          height: 6.5,
          ingredientRef: 'ing-pippali',
          confidence: 0.92
        },
        {
          id: 'box-ashwa',
          label: 'Ashwagandha (95% OCR)',
          category: 'verified',
          x: 8,
          y: 52.5,
          width: 72,
          height: 6.5,
          ingredientRef: 'ing-ashwagandha',
          confidence: 0.95
        },
        {
          id: 'box-amla',
          label: 'Amalaki · Amla (93% OCR)',
          category: 'verified',
          x: 8,
          y: 60.2,
          width: 68,
          height: 6.5,
          ingredientRef: 'ing-amla',
          confidence: 0.93
        },
        {
          id: 'box-bioperine',
          label: 'Bioperine Carrier (88% OCR)',
          category: 'unverified',
          x: 8,
          y: 68,
          width: 76,
          height: 6.5,
          ingredientRef: 'ing-bioperine',
          confidence: 0.88
        },
        {
          id: 'box-smudged',
          label: 'Smudged OCR Region (41% OCR)',
          category: 'uncertain',
          x: 8,
          y: 75.7,
          width: 74,
          height: 6.5,
          ingredientRef: 'ing-uncertain',
          confidence: 0.41
        }
      ],
      ingredients: {
        verified: [
          {
            id: 'ing-ginger',
            printed_name: 'Shunthi (Zingiber officinale) Rhizome',
            common_name: 'Ginger',
            dosage_printed: '150 mg',
            status: 'verified',
            canonical_name: 'Ginger',
            botanical_name: 'Zingiber officinale',
            sanskrit_name: 'Shunthi/Adrak',
            virya: 'Ushna',
            rasa: 'Katu, Madhura',
            vipaka: 'Katu',
            provenance: 'IMPPAT 2.0 + Charaka Samhita Sutrasthana',
            ocrBoxId: 'box-ginger',
            safety: {
              verdict: 'FLAGGED',
              flags: [
                'SEASONAL_CONTRAINDICATION',
                'SEASONAL_DOSHA_CLASH',
                'CONDITION_CLASH',
                'CONSTITUTIONAL_CLASH'
              ],
              paths: [
                '(Ginger)-[:CONTRAINDICATED_IN]->(Grishma)',
                '(Ginger)-[:AGGRAVATES]->(Pitta)',
                '(Acid Reflux)-[:ASSOCIATED_WITH {strength: 5}]->(Pitta)'
              ],
              reasoning: [
                'Ginger has Ushna (heating) virya and is flagged as contraindicated during Grishma (Summer) when environmental Pitta peaks.',
                'Aggravates Pitta dosha, which conflicts with the patient’s Pitta-Vata constitution and declared Acid Reflux / Inflammation profile.'
              ]
            }
          },
          {
            id: 'ing-pippali',
            printed_name: 'Pippali (Piper longum) Fruit Extract',
            common_name: 'Long Pepper',
            dosage_printed: '100 mg',
            status: 'verified',
            canonical_name: 'Long Pepper',
            botanical_name: 'Piper longum',
            sanskrit_name: 'Pippali',
            virya: 'Ushna',
            rasa: 'Katu',
            vipaka: 'Madhura',
            provenance: 'IMPPAT 2.0 + Neo4j Aura Graph',
            ocrBoxId: 'box-pippali',
            safety: {
              verdict: 'FLAGGED',
              flags: ['SEASONAL_CONTRAINDICATION', 'CONSTITUTIONAL_CLASH'],
              paths: [
                '(Long Pepper)-[:CONTRAINDICATED_IN]->(Grishma)',
                '(Long Pepper)-[:AGGRAVATES]->(Pitta)'
              ],
              reasoning: [
                'Katu rasa combined with Ushna virya increases Pitta heat; contraindicated in peak summer (Grishma).',
                'Combined with Ginger in the same formulation, cumulative Ushna load warrants clinical caution for Acid Reflux.'
              ]
            }
          },
          {
            id: 'ing-ashwagandha',
            printed_name: 'Ashwagandha (Withania somnifera) Root',
            common_name: 'Indian Ginseng',
            dosage_printed: '200 mg',
            status: 'verified',
            canonical_name: 'Indian Ginseng',
            botanical_name: 'Withania somnifera',
            sanskrit_name: 'Ashwagandha',
            virya: 'Ushna',
            rasa: 'Madhura, Kashaya',
            vipaka: 'Madhura',
            provenance: 'IMPPAT 2.0 + Classical Monograph',
            ocrBoxId: 'box-ashwagandha',
            safety: {
              verdict: 'CAUTION',
              flags: ['MILD_USHNA_NOTE'],
              paths: [
                '(Indian Ginseng)-[:PACIFIES]->(Vata)',
                '(Indian Ginseng)-[:AGGRAVATES]->(Kapha)'
              ],
              reasoning: [
                'Pacifies Vata aspect of Pitta-Vata constitution; no direct Pitta aggravation edge recorded in Neo4j graph.',
                'Mildly heating (Ushna virya) — monitor gastric comfort when combined with heating Trikatu herbs.'
              ]
            }
          },
          {
            id: 'ing-amla',
            printed_name: 'Amalaki (Emblica officinalis) Fruit',
            common_name: 'Indian Gooseberry',
            dosage_printed: '100 mg',
            status: 'verified',
            canonical_name: 'Indian Gooseberry',
            botanical_name: 'Emblica officinalis',
            sanskrit_name: 'Amalaki',
            virya: 'Sheeta',
            rasa: 'Amla, Madhura, Kashaya, Tikta, Katu',
            vipaka: 'Madhura',
            provenance: 'IMPPAT 2.0 + Charaka Samhita',
            ocrBoxId: 'box-amla',
            safety: {
              verdict: 'SAFE',
              flags: [],
              paths: [
                '(Indian Gooseberry)-[:PACIFIES {strength: 5}]->(Pitta)',
                '(Indian Gooseberry)-[:PACIFIES {strength: 4}]->(Vata)'
              ],
              reasoning: [
                'Sheeta (cooling) virya pacifies Pitta and Vata without seasonal contraindications in Grishma.',
                'No graph contraindication edges found for declared profile; note that isolated ingredient safety does not offset flagged co-ingredients in this blend.'
              ]
            }
          }
        ],
        unverified: [
          {
            id: 'ing-bioperine',
            printed_name: 'Bioperine Standardized Carrier Complex',
            common_name: 'Proprietary Black Pepper Piperine Extract',
            dosage_printed: '25 mg',
            status: 'unverified',
            reason:
              'Not matched as an exact canonical entry in the 25-herb VedaAI Neo4j catalog. Cannot assert graph-verified safety or bioavailability interaction automatically.',
            ocrBoxId: 'box-bioperine',
            safety: {
              verdict: 'INSUFFICIENT_EVIDENCE',
              flags: ['NOT_IN_CATALOG'],
              paths: [],
              reasoning: [
                'Proprietary standardized piperine extract is absent from the verified herb catalog; concentrated piperine may alter co-administered drug metabolism.'
              ]
            }
          }
        ],
        uncertain: [
          {
            id: 'ing-uncertain',
            printed_name: '...karra churna ext... 15 mg',
            common_name: null,
            dosage_printed: '15 mg',
            uncertain: true,
            status: 'uncertain',
            reason:
              'Partially obscured label print (OCR legibility 41%). Cannot resolve canonical botanical species; manual label inspection required before use.',
            ocrBoxId: 'box-smudged',
            safety: {
              verdict: 'INSUFFICIENT_EVIDENCE',
              flags: ['ILLEGIBLE_OCR'],
              paths: [],
              reasoning: [
                'Optical text confidence is insufficient to identify this ingredient. Do not assume safety from partial text.'
              ]
            }
          }
        ]
      },
      auditedIngredients: [], // populated below
      summary: {
        totalExtracted: 6,
        verified: 4,
        unverified: 1,
        uncertain: 1,
        flagged: 2,
        safe: 1
      }
    }
  },
  {
    id: 'tulsi-cooling',
    label: 'Tulsi & Yashtimadhu Infusion',
    subtitle: 'Mostly safe with 1 mild caution',
    imageUrl: makeLabelSvgDataUri({
      title: 'Organic Tulsi & Yashtimadhu Herbal Tea',
      subtitle: 'Soothing Botanical Infusion · Caffeine-Free Loose Leaf Sachets',
      batch: 'BATCH #TL-2026-119 · EXP 11/2027',
      footer: 'Demonstration Label Mockup',
      variant: 'tulsi',
      lines: [
        { text: '1. Tulasi (Ocimum tenuiflorum) Leaf — 850 mg' },
        { text: '2. Yashtimadhu (Glycyrrhiza glabra) Root — 450 mg' },
        { text: '3. Shatapushpa (Foeniculum vulgare) Seed — 350 mg' },
        { text: '4. Dhanya (Coriandrum sativum) Seed — 250 mg' },
        { text: '5. Natural Cardamom Husk Aroma — q.s.', muted: true }
      ]
    }),
    audit: {
      isSampleData: true,
      sampleLabelTitle: 'Organic Tulsi & Yashtimadhu Herbal Tea (Demonstration Sample)',
      durationMs: 980,
      extraction: {
        product_name: 'Organic Tulsi & Yashtimadhu Herbal Tea',
        manufacturer: 'Vana Botanicals (Sample)',
        formulation_type: 'Infusion / Herbal Tea',
        visual_confidence: 0.94,
        is_supplement_label: true,
        summary:
          'Cooling digestive and respiratory infusion pairing Fennel, Coriander, and Licorice with Holy Basil.',
        extracted_ocr_text: `ORGANIC TULSI & YASHTIMADHU HERBAL TEA
Soothing Botanical Infusion · Caffeine-Free Loose Leaf Sachets
1. Tulasi (Ocimum tenuiflorum) Leaf — 850 mg
2. Yashtimadhu (Glycyrrhiza glabra) Root — 450 mg
3. Shatapushpa (Foeniculum vulgare) Seed — 350 mg
4. Dhanya (Coriandrum sativum) Seed — 250 mg
5. Natural Cardamom Husk Aroma — q.s.`
      },
      ocrBoxes: [
        {
          id: 'box-tulsi-prod',
          label: 'Product Title (98% OCR)',
          category: 'product',
          x: 6,
          y: 8,
          width: 82,
          height: 16,
          confidence: 0.98
        },
        {
          id: 'box-tulsi-1',
          label: 'Tulasi (95% OCR)',
          category: 'flagged',
          x: 8,
          y: 37,
          width: 72,
          height: 6.5,
          ingredientRef: 'ing-tulsi',
          confidence: 0.95
        },
        {
          id: 'box-licorice',
          label: 'Yashtimadhu · Licorice (96% OCR)',
          category: 'verified',
          x: 8,
          y: 44.8,
          width: 74,
          height: 6.5,
          ingredientRef: 'ing-licorice',
          confidence: 0.96
        },
        {
          id: 'box-fennel',
          label: 'Shatapushpa · Fennel (94% OCR)',
          category: 'verified',
          x: 8,
          y: 52.5,
          width: 74,
          height: 6.5,
          ingredientRef: 'ing-fennel',
          confidence: 0.94
        },
        {
          id: 'box-coriander',
          label: 'Dhanya · Coriander (93% OCR)',
          category: 'verified',
          x: 8,
          y: 60.2,
          width: 72,
          height: 6.5,
          ingredientRef: 'ing-coriander',
          confidence: 0.93
        },
        {
          id: 'box-cardamom',
          label: 'Cardamom Aroma (89% OCR)',
          category: 'unverified',
          x: 8,
          y: 68,
          width: 68,
          height: 6.5,
          ingredientRef: 'ing-cardamom',
          confidence: 0.89
        }
      ],
      ingredients: {
        verified: [
          {
            id: 'ing-tulsi',
            printed_name: 'Tulasi (Ocimum tenuiflorum) Leaf',
            common_name: 'Holy Basil',
            dosage_printed: '850 mg',
            status: 'verified',
            canonical_name: 'Holy Basil',
            botanical_name: 'Ocimum tenuiflorum',
            sanskrit_name: 'Tulasi',
            virya: 'Ushna',
            rasa: 'Katu, Tikta',
            provenance: 'IMPPAT 2.0',
            ocrBoxId: 'box-tulsi-1',
            safety: {
              verdict: 'CAUTION',
              flags: ['CONSTITUTIONAL_CLASH'],
              paths: ['(Holy Basil)-[:AGGRAVATES {strength: 3}]->(Pitta)'],
              reasoning: [
                'Holy Basil has Ushna virya and can stimulate Pitta when consumed in high daily doses during summer.'
              ]
            }
          },
          {
            id: 'ing-licorice',
            printed_name: 'Yashtimadhu (Glycyrrhiza glabra) Root',
            common_name: 'Licorice',
            dosage_printed: '450 mg',
            status: 'verified',
            canonical_name: 'Licorice',
            botanical_name: 'Glycyrrhiza glabra',
            sanskrit_name: 'Yashtimadhu',
            virya: 'Sheeta',
            rasa: 'Madhura',
            provenance: 'IMPPAT 2.0',
            ocrBoxId: 'box-licorice',
            safety: {
              verdict: 'SAFE',
              flags: [],
              paths: ['(Licorice)-[:PACIFIES {strength: 5}]->(Pitta)'],
              reasoning: [
                'Sheeta virya and Madhura rasa calm Pitta; note that prolonged high-dose licorice requires monitoring in hypertension.'
              ]
            }
          },
          {
            id: 'ing-fennel',
            printed_name: 'Shatapushpa (Foeniculum vulgare) Seed',
            common_name: 'Fennel',
            dosage_printed: '350 mg',
            status: 'verified',
            canonical_name: 'Fennel',
            botanical_name: 'Foeniculum vulgare',
            sanskrit_name: 'Shatapushpa',
            virya: 'Sheeta',
            rasa: 'Madhura, Katu',
            provenance: 'IMPPAT 2.0',
            ocrBoxId: 'box-fennel',
            safety: {
              verdict: 'SAFE',
              flags: [],
              paths: ['(Fennel)-[:PACIFIES {strength: 4}]->(Pitta)'],
              reasoning: ['Cooling digestive carminative aligned with Pitta-Vata balance.']
            }
          },
          {
            id: 'ing-coriander',
            printed_name: 'Dhanya (Coriandrum sativum) Seed',
            common_name: 'Coriander',
            dosage_printed: '250 mg',
            status: 'verified',
            canonical_name: 'Coriander',
            botanical_name: 'Coriandrum sativum',
            sanskrit_name: 'Dhanya',
            virya: 'Sheeta',
            rasa: 'Tikta, Katu',
            provenance: 'IMPPAT 2.0',
            ocrBoxId: 'box-coriander',
            safety: {
              verdict: 'SAFE',
              flags: [],
              paths: ['(Coriander)-[:TREATS]->(Diabetes)'],
              reasoning: ['Cooling botanical with no seasonal or Pitta-aggravation flags.']
            }
          }
        ],
        unverified: [
          {
            id: 'ing-cardamom',
            printed_name: 'Natural Cardamom Husk Aroma',
            common_name: 'Ela (Flavoring Excipient)',
            dosage_printed: 'q.s.',
            status: 'unverified',
            reason: 'Flavoring excipient is outside the 25-herb primary clinical catalog.',
            ocrBoxId: 'box-cardamom',
            safety: {
              verdict: 'INSUFFICIENT_EVIDENCE',
              flags: ['NOT_IN_CATALOG'],
              paths: [],
              reasoning: ['Not present in Neo4j clinical ontology; no automated graph check performed.']
            }
          }
        ],
        uncertain: []
      },
      auditedIngredients: [],
      summary: {
        totalExtracted: 5,
        verified: 4,
        unverified: 1,
        uncertain: 0,
        flagged: 0,
        safe: 3
      }
    }
  },
  {
    id: 'out-of-domain',
    label: 'Non-Herbal Item (Out-of-Domain)',
    subtitle: 'Tests multimodal domain gate',
    imageUrl: makeLabelSvgDataUri({
      title: 'AeroCharge 65W GaN Power Adapter',
      subtitle: 'Model AC-65PD · Class II Switching Power Supply',
      batch: 'INPUT: 100-240V ~ 50/60Hz 1.5A',
      footer: 'CE · UL · FCC Certified',
      variant: 'electronics',
      lines: [
        { text: 'USB-C1 Output: 5V=3A, 9V=3A, 15V=3A, 20V=3.25A' },
        { text: 'USB-A Output: 5V=2.4A Max (12W)' },
        { text: 'Thermal Cutoff Protection: 105°C' },
        { text: 'Caution: Indoor dry location use only', muted: true }
      ]
    }),
    audit: {
      isSampleData: true,
      sampleLabelTitle: 'Out-of-Domain Object Gate Test (Demonstration Sample)',
      durationMs: 410,
      extraction: {
        product_name: 'AeroCharge 65W GaN Power Adapter',
        formulation_type: 'Unknown',
        visual_confidence: 0.96,
        is_supplement_label: false,
        summary:
          'Uploaded image depicts an electronic power adapter specification label, not an Ayurvedic medicine, herbal supplement, or medicinal plant.',
        extracted_ocr_text: `AEROCHARGE 65W GAN POWER ADAPTER
Model AC-65PD · Class II Switching Power Supply
USB-C1 Output: 5V=3A, 9V=3A, 15V=3A, 20V=3.25A
Caution: Indoor dry location use only`
      },
      ocrBoxes: [
        {
          id: 'box-ood',
          label: 'Non-Ayurvedic Hardware Label (96% OCR)',
          category: 'unverified',
          x: 6,
          y: 8,
          width: 82,
          height: 20,
          confidence: 0.96
        }
      ],
      ingredients: { verified: [], unverified: [], uncertain: [] },
      auditedIngredients: [],
      summary: {
        totalExtracted: 0,
        verified: 0,
        unverified: 0,
        uncertain: 0,
        flagged: 0,
        safe: 0
      }
    }
  }
];

// Populate auditedIngredients cleanly
SAMPLE_LABEL_AUDITS.forEach(sample => {
  sample.audit.auditedIngredients = [...sample.audit.ingredients.verified];
});

export const ADMIN_REVIEW_QUEUE: AdminReviewItem[] = [
  {
    id: 'adm-104',
    title: 'Add CYP3A4 caution rule for Piperine standardized extracts',
    category: 'Safety Rule',
    status: 'Pending Review',
    submittedBy: 'Dr. Kavita Menon (BAMS, Clinical Reviewer)',
    submittedAt: '2026-11-24 18:20 IST',
    version: 'v2.4.1-rc',
    detail:
      'Label Audit logs show frequent proprietary "Bioperine" carrier entries returning Unverified. Proposal adds canonical piperine node with bioavailability caution metadata.',
    cypherImpact: 'MERGE (:Herb {name:"Black Pepper"})-[:CONTAINS]->(:Compound {name:"Piperine"})'
  },
  {
    id: 'adm-103',
    title: 'Clinician discrepancy flag on Licorice + Hypertension threshold',
    category: 'Clinician Feedback',
    status: 'Pending Review',
    submittedBy: 'Dr. R. Deshmukh (MD Ayurveda)',
    submittedAt: '2026-11-22 11:05 IST',
    version: 'v2.4.0',
    detail:
      'Requested stricter flagging when Yashtimadhu appears alongside Hypertension in patient conditions, distinguishing whole root from DGL extracts.'
  },
  {
    id: 'adm-101',
    title: 'IMPPAT 2.0 Plant_Information_IMPPAT.tsv synonym refresh',
    category: 'Source Verification',
    status: 'Approved',
    submittedBy: 'Ontology Sync Pipeline',
    submittedAt: '2026-11-18 09:30 IST',
    version: 'v2.4.0',
    detail: 'Verified 25 classical herb nodes, 3 doshas, 6 seasons, 12 conditions, and 179 active graph relationships.'
  }
];
