import type {
  AdminReviewItem,
  DrugHerbInteraction,
  HerbItem,
  KGEdge,
  KGNode,
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

export const HERBS_CATALOG: HerbItem[] = [
  {
    name: 'Ginger',
    botanical_name: 'Zingiber officinale',
    sanskrit_name: 'Shunthi/Adrak',
    rasa: 'Katu, Madhura',
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: 'Laghu, Snigdha',
    family: 'Zingiberaceae',
    system_of_medicine: 'Ayurveda, Homeopathy, Siddha, Unani',
    therapeutic_uses: 'digestive sluggishness, nausea, osteoarthritis stiffness, cold-induced congestion',
    synonyms: 'Adrak, Shunti, Sonth',
    pacifies: ['Vata', 'Kapha'],
    aggravates: ['Pitta'],
    contraindicated_seasons: ['Grishma (Summer)'],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'Avoid concentrated dry ginger in active acid reflux, peptic ulceration, or peak summer heat.',
    source: 'IMPPAT 2.0 + Charaka Samhita'
  },
  {
    name: 'Turmeric',
    botanical_name: 'Curcuma longa',
    sanskrit_name: 'Haridra',
    rasa: 'Tikta, Katu',
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: 'Laghu, Ruksha',
    family: 'Zingiberaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani, Sowa Rigpa',
    therapeutic_uses: 'inflammatory modulation, metabolic support, upper respiratory wellness, dermal recovery',
    synonyms: 'Haldi, Haridra',
    pacifies: ['Pitta', 'Kapha'],
    aggravates: ['Vata'],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'High-dose standardized curcuminoids with piperine warrant caution alongside anticoagulants.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Indian Ginseng',
    botanical_name: 'Withania somnifera',
    sanskrit_name: 'Ashwagandha',
    rasa: 'Madhura, Kashaya',
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: 'Guru, Snigdha',
    family: 'Solanaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani, Homeopathy',
    therapeutic_uses: 'stress resilience, sleep quality, neuromuscular strength, convalescence',
    synonyms: 'Ashwagandha, Asgandh, Winter Cherry',
    pacifies: ['Vata'],
    aggravates: ['Kapha'],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'Monitor thyroid function in patients on levothyroxine; avoid in pregnancy.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Indian Gooseberry',
    botanical_name: 'Emblica officinalis',
    sanskrit_name: 'Amalaki',
    rasa: 'Amla, Madhura, Kashaya, Tikta, Katu',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Laghu, Ruksha',
    family: 'Phyllanthaceae',
    system_of_medicine: 'Ayurveda',
    therapeutic_uses: 'antioxidant Rasayana, gastric hyperacidity relief, mucosal protection, daily immunity',
    synonyms: 'Amla, Amlaki, Amla Berry',
    pacifies: ['Pitta', 'Vata', 'Kapha'],
    aggravates: [],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'Tridoshic cooling Rasayana; monitor blood glucose if paired with antidiabetic therapy.',
    source: 'IMPPAT 2.0 + Charaka Samhita'
  },
  {
    name: 'Holy Basil',
    botanical_name: 'Ocimum tenuiflorum',
    sanskrit_name: 'Tulasi',
    rasa: 'Katu, Tikta',
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: 'Laghu, Ruksha',
    family: 'Lamiaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'respiratory comfort, adaptogenic stress support, seasonal fever recovery',
    synonyms: 'Tulsi, Tulasi',
    pacifies: ['Vata', 'Kapha'],
    aggravates: ['Pitta'],
    evidence_tier: 'Classical + Preclinical',
    safety_note: 'Heating potency may mildly elevate Pitta in sensitive individuals during hot seasons.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Licorice',
    botanical_name: 'Glycyrrhiza glabra',
    sanskrit_name: 'Yashtimadhu',
    rasa: 'Madhura',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Guru, Snigdha',
    family: 'Leguminosae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'mucosal soothing, throat irritation, gastric ulcer protection, Pitta calming',
    synonyms: 'Mulethi, Yashtimadhu',
    pacifies: ['Pitta', 'Vata'],
    aggravates: ['Kapha'],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'Glycyrrhizin can elevate blood pressure and deplete potassium; avoid chronic use in hypertension.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Water Hyssop',
    botanical_name: 'Bacopa monnieri',
    sanskrit_name: 'Brahmi',
    rasa: 'Tikta, Kashaya',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Laghu, Snigdha',
    family: 'Plantaginaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'cognitive retention, calm focus, nervous system nourishment, anxiety support',
    synonyms: 'Brahmi, Bacopa',
    pacifies: ['Vata', 'Pitta'],
    aggravates: [],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'May cause mild GI sensitivity on an empty stomach; assess sedation if combined with CNS depressants.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Neem',
    botanical_name: 'Azadirachta indica',
    sanskrit_name: 'Nimba',
    rasa: 'Tikta, Kashaya',
    virya: 'Sheeta',
    vipaka: 'Katu',
    guna: 'Laghu, Ruksha',
    family: 'Meliaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'cutaneous inflammation, blood purification, microbial balance, metabolic regulation',
    synonyms: 'Neem, Nimba, Margosa',
    pacifies: ['Pitta', 'Kapha'],
    aggravates: ['Vata'],
    evidence_tier: 'Classical + Preclinical',
    safety_note: 'Not recommended in pregnancy or fertility-seeking periods; monitor hypoglycemia with oral agents.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Giloy',
    botanical_name: 'Tinospora cordifolia',
    sanskrit_name: 'Guduchi',
    rasa: 'Tikta, Kashaya',
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: 'Guru, Snigdha',
    family: 'Menispermaceae',
    system_of_medicine: 'Ayurveda',
    therapeutic_uses: 'immunomodulation, febrile recovery, hepatic support, chronic inflammatory balance',
    synonyms: 'Giloy, Guduchi, Amrita',
    pacifies: ['Pitta', 'Kapha', 'Vata'],
    aggravates: [],
    evidence_tier: 'Classical + Preclinical',
    safety_note: 'Case reports warrant liver enzyme awareness in autoimmune predispositions or multi-herb concentrates.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Long Pepper',
    botanical_name: 'Piper longum',
    sanskrit_name: 'Pippali',
    rasa: 'Katu',
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: 'Laghu, Snigdha, Tikshna',
    family: 'Piperaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'bioavailability enhancement, Kapha respiratory clearing, sluggish Agni',
    synonyms: 'Pippali, Pipli',
    pacifies: ['Kapha', 'Vata'],
    aggravates: ['Pitta'],
    contraindicated_seasons: ['Grishma (Summer)'],
    evidence_tier: 'Traditional Textual Only',
    safety_note: 'Potent Ushna-Tikshna dravya; contraindicated in summer heat and active gastric hyperacidity.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Wild Asparagus',
    botanical_name: 'Asparagus racemosus',
    sanskrit_name: 'Shatavari',
    rasa: 'Madhura, Tikta',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Guru, Snigdha',
    family: 'Asparagaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'gastric mucosal soothing, reproductive nourishment, Pitta cooling, lactation support',
    synonyms: 'Shatavari, Satavar',
    pacifies: ['Pitta', 'Vata'],
    aggravates: ['Kapha'],
    evidence_tier: 'Classical + Preclinical',
    safety_note: 'Generally well tolerated; avoid in acute Kapha congestion or estrogen-sensitive conditions without oversight.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Spikenard',
    botanical_name: 'Nardostachys jatamansi',
    sanskrit_name: 'Jatamansi',
    rasa: 'Tikta, Kashaya, Madhura',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Laghu, Snigdha',
    family: 'Caprifoliaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'restorative sleep, autonomic calm, neuroprotective support, tension headaches',
    synonyms: 'Jatamansi, Musk Root',
    pacifies: ['Pitta', 'Vata', 'Kapha'],
    aggravates: [],
    evidence_tier: 'Traditional Textual Only',
    safety_note: 'Limited human PK data with prescription sedatives or SSRIs; evaluate additive drowsiness.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Fennel',
    botanical_name: 'Foeniculum vulgare',
    sanskrit_name: 'Shatapushpa',
    rasa: 'Madhura, Katu',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Laghu, Snigdha',
    family: 'Apiaceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'postprandial bloating, mild reflux relief, gentle carminative cooling',
    synonyms: 'Saunf, Shatapushpa',
    pacifies: ['Pitta', 'Vata'],
    aggravates: [],
    evidence_tier: 'Classical + Preclinical',
    safety_note: 'Gentle dietary spice; rare Apiaceae cross-reactivity in celery/mugwort allergy.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Indian Frankincense',
    botanical_name: 'Boswellia serrata',
    sanskrit_name: 'Shallaki',
    rasa: 'Tikta, Madhura',
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: 'Laghu, Ruksha',
    family: 'Burseraceae',
    system_of_medicine: 'Ayurveda, Siddha, Unani',
    therapeutic_uses: 'joint mobility, 5-LOX inflammatory pathway modulation, osteoarthritis comfort',
    synonyms: 'Shallaki, Boswellia',
    pacifies: ['Kapha', 'Pitta'],
    aggravates: ['Vata'],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'May cause mild epigastric discomfort if taken without food.',
    source: 'IMPPAT 2.0'
  },
  {
    name: 'Gotu Kola',
    botanical_name: 'Centella asiatica',
    sanskrit_name: 'Mandukparni',
    rasa: 'Tikta, Kashaya',
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: 'Laghu, Snigdha',
    family: 'Apiaceae',
    system_of_medicine: 'Ayurveda, Homeopathy, Siddha',
    therapeutic_uses: 'microcirculation, cognitive clarity, calming Pitta-type restlessness',
    synonyms: 'Mandukparni, Gotu Kola',
    pacifies: ['Pitta', 'Kapha'],
    aggravates: [],
    evidence_tier: 'Classical + Clinical Monograph',
    safety_note: 'Avoid prolonged continuous high dosing (>6 weeks) without hepatic check-in.',
    source: 'IMPPAT 2.0'
  }
];

export const DRUG_HERB_INTERACTIONS: DrugHerbInteraction[] = [
  {
    id: 'int-1',
    herb: 'Licorice (Yashtimadhu)',
    herbBotanical: 'Glycyrrhiza glabra',
    medication: 'Furosemide / Loop Diuretics',
    medicationClass: 'Diuretic / Antihypertensive',
    status: 'documented',
    severity: 'High',
    mechanism:
      'Glycyrrhizic acid inhibits 11-beta-hydroxysteroid dehydrogenase type 2, producing pseudoaldosteronism that compounds renal potassium wasting when combined with loop or thiazide diuretics.',
    clinicalGuidance:
      'Avoid unstandardized or glycyrrhizin-containing Licorice preparations with potassium-depleting diuretics. Monitor serum potassium and blood pressure; consider DGL (deglycyrrhizinated) only with clinician oversight.',
    graphPath: '(Licorice)-[:INTERACTS_WITH {severity:"High"}]->(Furosemide)',
    sources: ['Stockley’s Herbal Medicines Interactions', 'IMPPAT 2.0 Safety Annotations']
  },
  {
    id: 'int-2',
    herb: 'Ginger (Shunthi)',
    herbBotanical: 'Zingiber officinale',
    medication: 'Warfarin / Oral Anticoagulants',
    medicationClass: 'Vitamin K Antagonist / Anticoagulant',
    status: 'potential',
    severity: 'Moderate',
    mechanism:
      'Gingerols and shogaols demonstrate mild antiplatelet thromboxane-synthase inhibition in vitro; concentrated extracts may add bleeding risk alongside anticoagulation.',
    clinicalGuidance:
      'Culinary amounts are generally low-risk, but concentrated supplements (>1 g/day dried ginger) warrant INR monitoring and clinician review.',
    graphPath: '(Ginger)-[:INTERACTS_WITH {severity:"Moderate"}]->(Warfarin)',
    sources: ['NCCIH Clinical Herb-Drug Monograph', 'IMPPAT 2.0']
  },
  {
    id: 'int-3',
    herb: 'Indian Ginseng (Ashwagandha)',
    herbBotanical: 'Withania somnifera',
    medication: 'Levothyroxine',
    medicationClass: 'Thyroid Hormone Replacement',
    status: 'potential',
    severity: 'Moderate',
    mechanism:
      'Small clinical trials indicate Withania somnifera can stimulate endogenous T4/T3 conversion, potentially altering thyroid hormone requirements.',
    clinicalGuidance:
      'Monitor TSH and free T4 4–6 weeks after initiating or discontinuing Ashwagandha extracts.',
    graphPath: '(Indian Ginseng)-[:INTERACTS_WITH {severity:"Moderate"}]->(Levothyroxine)',
    sources: ['Journal of Alternative & Complementary Medicine (2018)', 'Clinical Monograph']
  },
  {
    id: 'int-4',
    herb: 'Fennel (Shatapushpa)',
    herbBotanical: 'Foeniculum vulgare',
    medication: 'Omeprazole 20 mg',
    medicationClass: 'Proton Pump Inhibitor (PPI)',
    status: 'no_known_interaction',
    severity: 'Low',
    mechanism:
      'No clinically significant CYP2C19 or gastric pH interference documented for standard dietary or tea-level Fennel seed intake.',
    clinicalGuidance:
      'No known interaction in reviewed monographs. Note: absence of documented interaction does not guarantee absence of risk at concentrated extract doses.',
    sources: ['European Medicines Agency (EMA) HMPC Assessment', 'IMPPAT 2.0'],
    missingEvidenceNote: 'Absence of a documented interaction is not proof of complete safety across all extract concentrations.'
  },
  {
    id: 'int-5',
    herb: 'Spikenard (Jatamansi)',
    herbBotanical: 'Nardostachys jatamansi',
    medication: 'Sertraline / SSRIs',
    medicationClass: 'Selective Serotonin Reuptake Inhibitor',
    status: 'insufficient_data',
    severity: 'Unknown',
    mechanism:
      'Preclinical GABAergic and monoamine modulation has been observed in animal models, but controlled human pharmacokinetic or serotonergic interaction trials with SSRIs are lacking.',
    clinicalGuidance:
      'Insufficient human clinical evidence to establish safety. Do not combine without prescribing psychiatrist/physician supervision; watch for additive sedation.',
    sources: ['IMPPAT 2.0 Preclinical Summary'],
    missingEvidenceNote: 'No human CYP450 or serotonergic interaction trials available in the current corpus.'
  }
];

export const KG_NODES: KGNode[] = [
  { id: 'h-ginger', label: 'Ginger', sublabel: 'Zingiber officinale', type: 'Herb', x: 240, y: 150, properties: { Sanskrit: 'Shunthi', Virya: 'Ushna', Rasa: 'Katu, Madhura', Source: 'IMPPAT 2.0' } },
  { id: 'h-amla', label: 'Amalaki', sublabel: 'Emblica officinalis', type: 'Herb', x: 240, y: 370, properties: { Sanskrit: 'Amalaki', Virya: 'Sheeta', Rasa: 'Pancha-Rasa (minus Lavana)', Source: 'IMPPAT 2.0' } },
  { id: 'h-ashwa', label: 'Ashwagandha', sublabel: 'Withania somnifera', type: 'Herb', x: 240, y: 260, properties: { Sanskrit: 'Ashwagandha', Virya: 'Ushna', Rasa: 'Madhura, Kashaya', Source: 'IMPPAT 2.0' } },
  { id: 'h-licorice', label: 'Licorice', sublabel: 'Glycyrrhiza glabra', type: 'Herb', x: 240, y: 470, properties: { Sanskrit: 'Yashtimadhu', Virya: 'Sheeta', Rasa: 'Madhura', Source: 'IMPPAT 2.0' } },
  { id: 'd-pitta', label: 'Pitta', sublabel: 'Fire & Water', type: 'Dosha', x: 520, y: 180, properties: { Qualities: 'Hot, Sharp, Light, Spreading', DominantSeason: 'Grishma, Sharada' } },
  { id: 'd-vata', label: 'Vata', sublabel: 'Air & Ether', type: 'Dosha', x: 520, y: 310, properties: { Qualities: 'Dry, Cold, Light, Mobile', DominantSeason: 'Varsha, Hemanta' } },
  { id: 'd-kapha', label: 'Kapha', sublabel: 'Earth & Water', type: 'Dosha', x: 520, y: 430, properties: { Qualities: 'Heavy, Slow, Cold, Unctuous', DominantSeason: 'Vasanta, Shishira' } },
  { id: 's-grishma', label: 'Grishma', sublabel: 'Summer (May–Jun)', type: 'Season', x: 770, y: 110, properties: { English: 'Summer', DominantDosha: 'Pitta' } },
  { id: 'c-reflux', label: 'Acid Reflux', sublabel: 'Clinical Condition', type: 'Condition', x: 770, y: 230, properties: { PrimaryDosha: 'Pitta (Strength 5)', Category: 'GI / Mucosal' } },
  { id: 'c-insomnia', label: 'Insomnia', sublabel: 'Clinical Condition', type: 'Condition', x: 770, y: 340, properties: { PrimaryDosha: 'Vata (Strength 5)', Category: 'Neuro-sleep' } },
  { id: 'm-furosemide', label: 'Furosemide', sublabel: 'Loop Diuretic', type: 'Drug', x: 520, y: 520, properties: { Class: 'Loop Diuretic', RiskNote: 'Hypokalemia synergy with Glycyrrhiza' } }
];

export const KG_EDGES: KGEdge[] = [
  { id: 'e1', source: 'h-ginger', target: 'd-pitta', type: 'AGGRAVATES', reason: 'Ushna virya stimulates Pitta', provenance: 'Charaka Samhita + Neo4j v2.4' },
  { id: 'e2', source: 'h-ginger', target: 'd-vata', type: 'PACIFIES', reason: 'Katu rasa & Ushna virya reduce Vata', provenance: 'IMPPAT 2.0' },
  { id: 'e3', source: 'h-ginger', target: 's-grishma', type: 'CONTRAINDICATED_IN', reason: 'Ushna virya amplified in summer heat aggravates Pitta severely', provenance: 'Seasonal Safety Rule #S-01' },
  { id: 'e4', source: 'h-amla', target: 'd-pitta', type: 'PACIFIES', reason: 'Sheeta virya & Madhura vipaka cool Pitta', provenance: 'Charaka Samhita' },
  { id: 'e5', source: 'h-amla', target: 'd-vata', type: 'PACIFIES', reason: 'Madhura vipaka balances Vata', provenance: 'IMPPAT 2.0' },
  { id: 'e6', source: 'h-ashwa', target: 'd-vata', type: 'PACIFIES', reason: 'Madhura rasa & Snigdha guna ground Vata', provenance: 'IMPPAT 2.0' },
  { id: 'e7', source: 'h-ashwa', target: 'd-kapha', type: 'AGGRAVATES', reason: 'Guru guna can increase Kapha', provenance: 'IMPPAT 2.0' },
  { id: 'e8', source: 'h-ashwa', target: 'c-insomnia', type: 'TREATS', reason: 'Indicated for dyssomnias & stress', provenance: 'IMPPAT 2.0 Therapeutic Association' },
  { id: 'e9', source: 's-grishma', target: 'd-pitta', type: 'DOMINANT_IN', reason: 'Summer peak heat elevates Pitta', provenance: 'Ritucharya Ontology' },
  { id: 'e10', source: 'c-reflux', target: 'd-pitta', type: 'ASSOCIATED_WITH', reason: 'Strength 5/5 Pitta association', provenance: 'Morbidity Mapping v2.1' },
  { id: 'e11', source: 'c-insomnia', target: 'd-vata', type: 'ASSOCIATED_WITH', reason: 'Strength 5/5 Vata association', provenance: 'Morbidity Mapping v2.1' },
  { id: 'e12', source: 'h-licorice', target: 'd-pitta', type: 'PACIFIES', reason: 'Madhura rasa & Sheeta virya soothe mucosa', provenance: 'IMPPAT 2.0' },
  { id: 'e13', source: 'h-licorice', target: 'm-furosemide', type: 'INTERACTS_WITH', reason: 'Glycyrrhizin compounds potassium depletion', provenance: 'Stockley Monograph' }
];

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
