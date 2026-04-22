import { GEMINI_API_KEY, MEDICAL_ANALYSIS_PROMPT } from '../config/gemini';
import { readAsStringAsync } from 'expo-file-system/legacy';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  API_BASE_URL: 'https://generativelanguage.googleapis.com/v1',
  TIMEOUT_MS: 60000, // 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_IMAGE_SIZE: 4 * 1024 * 1024, // 4MB max
  MODEL_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
};

// ============================================================================
// MODEL MANAGEMENT WITH CACHING
// ============================================================================

let cachedModels = null;
let modelCacheTime = 0;

const listAvailableModels = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached models if still valid
  if (!forceRefresh && cachedModels && (now - modelCacheTime) < CONFIG.MODEL_CACHE_TTL_MS) {
    return cachedModels;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
    
    const url = `${CONFIG.API_BASE_URL}/models?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.models) {
      cachedModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      modelCacheTime = now;
      console.log('📋 Available models:', cachedModels);
      return cachedModels;
    }
    
    return [];
  } catch (error) {
    console.error('Error listing models:', error.message);
    // Return cached models if available, even if expired
    return cachedModels || [];
  }
};

// Smart model selection with fallback priority
const getBestModel = async () => {
  const models = await listAvailableModels();
  
  // Priority order - start with most reliable/fastest models
  const priority = [
    // Gemini 2.5 (most reliable)
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    // Gemini 2.0 (backup)
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    // Gemini 1.5 (if available)
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    // Legacy
    'gemini-pro',
  ];
  
  for (const p of priority) {
    if (models.includes(p)) {
      return p;
    }
  }
  
  // Fallback to first available
  if (models.length > 0) {
    return models[0];
  }
  
  // Last resort default
  return 'gemini-2.5-flash';
};

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

const fileToBase64 = async (uri) => {
  try {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    
    // Determine MIME type from extension
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    
    const mimeType = mimeTypes[extension] || 'image/jpeg';
    
    // Check size (Gemini has limits)
    const sizeInBytes = Math.ceil(base64.length * 0.75); // Base64 is ~33% larger
    if (sizeInBytes > CONFIG.MAX_IMAGE_SIZE) {
      console.warn(`⚠️ Image size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended max`);
    }
    
    return { base64, mimeType, sizeInBytes };
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

// ============================================================================
// API CALL WITH RETRY & TIMEOUT
// ============================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiAPI = async (contents, preferredModel, retryCount = 0) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
  
  try {
    const url = `${CONFIG.API_BASE_URL}/models/${preferredModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryDelay = data?.error?.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay;
      const waitMs = retryDelay ? parseInt(retryDelay.replace('s', '')) * 1000 : CONFIG.RETRY_DELAY_MS * (retryCount + 1) * 2;
      
      console.log(`⏳ Rate limited. Waiting ${waitMs/1000}s before retry...`);
      
      if (retryCount < CONFIG.MAX_RETRIES) {
        await sleep(waitMs);
        return callGeminiAPI(contents, preferredModel, retryCount + 1);
      }
      
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitMs/1000)} seconds and try again.`);
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorMsg = data?.error?.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }
    
    // Extract text from response
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      // Check for safety blocking
      const safetyRatings = data?.candidates?.[0]?.safetyRatings;
      if (safetyRatings) {
        const blocked = safetyRatings.find(r => r.probability === 'HIGH');
        if (blocked) {
          throw new Error(`Image blocked by safety filter (${blocked.category}). Please try a different image.`);
        }
      }
      throw new Error('Empty response from AI. Please try again.');
    }
    
    const text = parts.map(p => p?.text || '').join('').trim();
    return text;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    throw error;
  }
};

// Try multiple models with fallback
const callWithFallback = async (contents) => {
  const models = await listAvailableModels();
  const preferredModel = await getBestModel();
  
  // Build list of models to try
  const modelsToTry = [preferredModel];
  for (const m of models) {
    if (!modelsToTry.includes(m)) {
      modelsToTry.push(m);
    }
  }
  
  let lastError = null;
  
  for (const model of modelsToTry) {
    try {
      console.log(`🔗 Trying model: ${model}`);
      const result = await callGeminiAPI(contents, model);
      console.log(`✅ Success with model: ${model}`);
      return result;
    } catch (error) {
      console.log(`❌ Model ${model} failed: ${error.message}`);
      lastError = error;
      
      // Don't try other models for certain errors
      if (error.message.includes('safety filter') || 
          error.message.includes('blocked') ||
          error.message.includes('invalid')) {
        throw error;
      }
      
      // Continue to next model for quota/rate limit errors
      continue;
    }
  }
  
  throw lastError || new Error('All models failed. Please try again later.');
};

// ============================================================================
// WOUND ANALYSIS
// ============================================================================

const getWoundAnalysisPrompt = (language = 'en') => {
  const prompts = {
    en: `You are a CLINICAL WOUND CARE SPECIALIST AI with expertise in wound management, pressure injury classification, and clinical triage. Analyze the image with the precision of a certified wound care nurse.

IMPORTANT OUTPUT REQUIREMENTS (follow EXACTLY)
1) Always start with this header (exact keys):
WOUND_PRESENT: YES/NO
URGENCY: CRITICAL/HIGH/MEDIUM/LOW
PRIMARY_REASON: <1 short sentence justifying the urgency>

2) If there is NO clinically significant wound (no break in skin integrity), set:
WOUND_PRESENT: NO
URGENCY: LOW
Then output this exact line and STOP:
No wound detected.

3) A rash/discoloration/sun damage/dermatoheliosis/dermatologic condition WITHOUT an open wound counts as WOUND_PRESENT: NO.

═══════════════════════════════════════════════════════════════════════════
CLINICAL IMAGE ANALYSIS PROTOCOL
═══════════════════════════════════════════════════════════════════════════

STEP 1: IMAGE QUALITY ASSESSMENT
• Lighting adequacy: Good/Fair/Poor
• Focus clarity: Sharp/Acceptable/Blurry
• Wound visibility: Full/Partial/Obscured
• Measurement reference: Present/Absent
• Photo angle: Optimal/Suboptimal

STEP 2: WOUND IDENTIFICATION
First, determine if image contains a clinically significant wound. ACCEPT if you see:
• Pressure injury (any stage)
• Diabetic foot ulcer
• Venous/arterial ulcer
• Surgical wound (healing or dehisced)
• Traumatic wound/laceration
• Burn injury (thermal/chemical/electrical)
• Skin tear (STAR classification)
• Moisture-associated skin damage (MASD)
• Medical device-related pressure injury
• Pyoderma gangrenosum
• Necrotic wound/gangrene
• Abscess or infected wound
• Any break in skin integrity with clinical significance

REJECT only if: Normal healthy skin OR completely unrelated image

═══════════════════════════════════════════════════════════════════════════
CLINICAL ASSESSMENT REPORT
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│ 🏥 CLINICAL CLASSIFICATION                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Wound Type: [Primary classification]                                     │
│ Etiology: [Underlying cause]                                            │
│ Anatomical Location: [Specific body region]                             │
│ Duration Estimate: [Acute <6wks / Chronic >6wks]                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 NPIAP STAGING (Pressure Injuries)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Stage 1: Non-blanchable erythema, intact skin                          │
│ Stage 2: Partial-thickness loss (dermis exposed)                        │
│ Stage 3: Full-thickness loss (subcutaneous fat visible)                │
│ Stage 4: Full-thickness loss (muscle/bone/tendon exposed)              │
│ Unstageable: Full-thickness, base obscured by slough/eschar            │
│ DTI: Deep tissue injury, intact skin with purple/maroon discoloration  │
│                                                                          │
│ If non-pressure injury, classify as:                                    │
│ • Superficial (epidermis only)                                          │
│ • Partial-thickness (into dermis)                                       │
│ • Full-thickness (through dermis)                                       │
│ • Deep/complex (involving structures)                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ � WOUND MEASUREMENTS (Estimate from image)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Length: ___ cm (head to toe direction)                                  │
│ Width: ___ cm (side to side)                                            │
│ Depth: ___ cm (deepest point)                                           │
│ Surface Area: ___ cm² (estimated)                                       │
│ Undermining: Present/None - Direction: ___                              │
│ Tunneling: Present/None - Depth: ___ cm - Direction: ___                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🔍 WOUND BED ASSESSMENT (PUSH Tool Components)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Tissue Type Percentage:                                                 │
│ □ Granulation (red beefy): ___%                                         │
│ □ Epithelial (pink/pearly): ___%                                        │
│ □ Slough (yellow/tan/gray): ___%                                        │
│ □ Eschar (black/brown necrotic): ___%                                   │
│ □ Exposed bone/tendon: Yes/No                                           │
│                                                                          │
│ Wound Bed Color: Red/Pink/Yellow/Black/Mixed/Variegated                 │
│ Wound Edges: Well-defined/Irregular/Undermined/Rolled/Attached          │
│ Peri-wound Skin: Normal/Macerated/Erythematous/Indurated/Calloused     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 💧 EXUDATE ASSESSMENT                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Amount: None/Scant/Small/Moderate/Large                                 │
│ Type: Serous/Serosanguineous/Sanguineous/Purulent/Seropurulent         │
│ Color: Clear/Pink/Red/Yellow/Green/Brown                                │
│ Odor: None/Faint/Moderate/Strong/Foul                                   │
│ Consistency: Thin/Viscous/Thick                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🦠 INFECTION INDICATORS (Clinical Signs)                               │
├─────────────────────────────────────────────────────────────────────────┤
│ LOCAL SIGNS:                                                             │
│ □ Increased pain (localized)                                            │
│ □ Erythema extending >2cm from wound edge                               │
│ □ Localized edema/induration                                            │
│ □ Increased warmth                                                      │
│ □ Purulent drainage                                                     │
│ □ Delayed healing                                                       │
│ □ Friable granulation tissue                                            │
│ □ Pocketing/bridging in wound bed                                       │
│ □ Discoloration of wound bed                                            │
│ □ Abnormal odor                                                         │
│                                                                          │
│ SYSTEMIC SIGNS (if visible/applicable):                                 │
│ □ Fever >38°C                                                           │
│ □ Lymphangitic streaking                                                │
│ □ Regional lymphadenopathy                                              │
│                                                                          │
│ INFECTION RISK: Low □ Medium □ High □                                   │
│ BIOFILM PRESENCE: Likely/Unlikely                                       │
│ IWDF RISK CLASSIFICATION (for diabetic foot): WIfI Grade ___            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 📈 HEALING TRAJECTORY                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Status: □ Acute inflammatory □ Proliferative □ Remodeling              │
│         □ Stalled □ Deteriorating □ At-risk for non-healing             │
│                                                                          │
│ Healing Indicators Present:                                             │
│ □ Healthy granulation □ Epithelial migration □ Wound contraction      │
│ □ Decreased exudate □ Reduced wound size                                │
│                                                                          │
│ Barriers to Healing:                                                    │
│ □ Infection □ Poor perfusion □ Malnutrition □ Pressure                 │
│ □ Moisture imbalance □ Biofilm □ Necrotic tissue □ Medication effects  │
│                                                                          │
│ Expected Healing Timeline: ___ weeks/months                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ � CLINICAL URGENCY CLASSIFICATION                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL - EMERGENCY (Call 911/112 immediately)                     │
│    • Signs of sepsis/septicemia                                        │
│    • Necrotizing fasciitis suspected                                    │
│    • Osteomyelitis suspected (exposed bone)                            │
│    • Limb-threatening ischemia                                         │
│    • Uncontrolled hemorrhage                                            │
│    • Gas gangrene signs                                                 │
│                                                                          │
│ 🟠 HIGH - URGENT (See physician within 24 hours)                       │
│    • Clinical infection present                                         │
│    • Stage 3-4 pressure injury                                          │
│    • Diabetic foot ulcer with infection signs                          │
│    • Rapidly deteriorating wound                                        │
│    • New onset tunneling/undermining                                   │
│                                                                          │
│ 🟡 MEDIUM - SEMI-URGENT (Physician visit within 1 week)               │
│    • Stage 2 pressure injury                                            │
│    • Non-healing wound >4 weeks                                         │
│    • Moderate exudate requiring advanced dressing                       │
│    • New onset skin changes around wound                                │
│                                                                          │
│ 🟢 LOW - ROUTINE (Continue current care, monitor)                      │
│    • Stage 1 pressure injury                                            │
│    • Healing wound with granulation                                     │
│    • Minor wound, no infection signs                                    │
│    • Stable chronic wound                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 💊 EVIDENCE-BASED TREATMENT RECOMMENDATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│ WOUND CLEANSING:                                                        │
│ • Solution: Normal saline / pH-balanced cleanser                       │
│ • Method: Gentle irrigation / Low-pressure wash                        │
│ • Frequency: At each dressing change                                    │
│                                                                          │
│ DEBRIDEMENT NEEDS:                                                      │
│ □ Not needed □ Sharp □ Enzymatic □ Autolytic □ Biosurgical           │
│                                                                          │
│ DRESSING SELECTION (based on wound characteristics):                   │
│ • Primary dressing: [Specific recommendation]                          │
│ • Secondary dressing: [Specific recommendation]                        │
│ • Change frequency: Daily/QOD/Twice weekly/Weekly                      │
│ • Rationale: [Why this dressing is appropriate]                        │
│                                                                          │
│ OFFLOADING/PRESSURE REDISTRIBUTION:                                    │
│ • Support surface recommendation                                       │
│ • Repositioning schedule: q2h/q4h                                       │
│ • Positioning devices needed                                            │
│                                                                          │
│ ADJUNCTIVE THERAPIES TO CONSIDER:                                      │
│ □ Negative pressure wound therapy □ Hyperbaric oxygen                  │
│ □ Electrical stimulation □ Growth factors □ Bioengineered skin        │
│                                                                          │
│ NUTRITION SUPPORT:                                                      │
│ • Protein requirement: 1.25-1.5 g/kg/day                               │
│ • Hydration: 30-35 mL/kg/day                                           │
│ • Specific supplements: Vitamin C, Zinc, Arginine if indicated         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🏥 REFERRAL RECOMMENDATIONS                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ IMMEDIATE REFERRAL:                                                    │
│ □ Emergency Department □ Wound Care Specialist □ Vascular Surgeon     │
│ □ Plastic Surgeon □ Infectious Disease □ Podiatrist                   │
│                                                                          │
│ REFERRAL REASONING: [Specific clinical indication]                     │
│                                                                          │
│ FOLLOW-UP TIMELINE:                                                    │
│ • Reassessment in: ___ days/weeks                                      │
│ • Photo documentation: Weekly/Bi-weekly                                │
│ • When to seek earlier evaluation: [Specific signs]                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ PATIENT EDUCATION POINTS                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Warning Signs to Report Immediately:                                    │
│ • Increased pain, swelling, or redness                                 │
│ • Foul odor or change in drainage                                      │
│ • Fever above 38°C (100.4°F)                                          │
│ • Red streaks extending from wound                                     │
│ • Black or darkening tissue                                            │
│ • Increased wound size or depth                                        │
│                                                                          │
│ Self-Care Instructions:                                                 │
│ • Keep wound clean and protected                                       │
│ • Maintain prescribed dressing regimen                                 │
│ • Avoid pressure on affected area                                      │
│ • Maintain adequate nutrition and hydration                           │
│ • Follow medication schedule as prescribed                            │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
⚠️ CLINICAL DISCLAIMER
═══════════════════════════════════════════════════════════════════════════
This AI-assisted analysis is for clinical decision support only and does NOT 
replace professional medical assessment. All findings should be validated by 
a qualified healthcare provider. Treatment decisions should be made in 
consultation with the patient's care team considering full clinical context.
═══════════════════════════════════════════════════════════════════════════`,

    fr: `Vous êtes un SPÉCIALISTE CLINIQUE EN SOINS DES PLAIES avec expertise en classification des escarres et triage clinique. Analysez l'image avec la précision d'un infirmier certifié en soins des plaies.

EXIGENCES DE SORTIE IMPORTANTES (suivez EXACTEMENT)
1) Commencez toujours par cet en-tête (clés exactes):
WOUND_PRESENT: YES/NO
URGENCY: CRITICAL/HIGH/MEDIUM/LOW
PRIMARY_REASON: <1 phrase courte justifiant l'urgence>

2) S'il n'y a PAS de plaie cliniquement significative (pas de rupture de l'intégrité cutanée), définissez:
WOUND_PRESENT: NO
URGENCY: LOW
Puis affichez cette ligne exacte et ARRÊTEZ:
No wound detected.

3) Une éruption/décoloration/dommage solaire/dermatohéliose/condition dermatologique SANS plaie ouverte compte comme WOUND_PRESENT: NO.

═══════════════════════════════════════════════════════════════
FORMAT D'ANALYSE - Utilisez cette structure EXACTE:
═══════════════════════════════════════════════════════════════

🔴 **NIVEAU D'URGENCE**: [CRITIQUE/ÉLEVÉ/MOYEN/FAIBLE]

CRITIQUE = 🚨 CHERCHEZ DES SOINS D'URGENCE IMMÉDIATEMENT
- Signes de septicémie (fièvre, rythme cardiaque rapide, confusion)
- Dommages tissulaires profonds avec muscle/os exposé
- Infection sévère se propageant rapidement
- Saignement incontrôlable
- Tissu nécrotique (noir) se propageant
- Patient en détresse sévère

ÉLEVÉ = ⚠️ CONSULTEZ UN MÉDECIN DANS 24 HEURES
- Signes d'infection active (pus, chaleur, rougeur s'étendant)
- Escarre de stade 3 ou 4
- Plaie ne guérissant pas après 2+ semaines
- Douleur ou gonflement croissant
- Diabétique avec ulcère du pied

MOYEN = 📋 PRENEZ RENDEZ-VOUS CETTE SEMAINE
- Escarre de stade 2
- Plaie à cicatrisation lente
- Drainage modéré
- Risque d'infection léger

FAIBLE = ✅ CONTINUEZ LES SOINS À DOMICILE
- Escarre de stade 1
- Plaie mineure cicatrisant bien
- Aucun signe d'infection

───────────────────────────────────────────────────────────────
📊 **STADE NPIAP** (pour les escarres):
Stade 1: Érythème non blanchissant de la peau intacte
Stade 2: Perte cutanée d'épaisseur partielle (ampoule ou ulcère superficiel)
Stade 3: Perte cutanée d'épaisseur totale (graisse visible)
Stade 4: Perte tissulaire d'épaisseur totale (muscle/os visible)
Non classable: Perte d'épaisseur totale avec lit de plaie obscurci
Lésion tissulaire profonde: Rouge/violet profond non blanchissant persistant

Si ce n'est pas une escarre, décrivez le type: [Chirurgical/Diabétique/Veineux/Brûlure/Traumatique/Autre]

───────────────────────────────────────────────────────────────
📝 **DESCRIPTION DÉTAILLÉE**:
- Localisation sur le corps:
- Taille approximative (estimation en cm):
- Apparence du lit de la plaie: [Granulation/Fibrine/Eschar/Mixte]
- Couleur: [Rouge/Rose/Jaune/Noir/Mixte]
- Profondeur: [Superficielle/Modérée/Profonde]
- Drainage: [Aucun/Séreux/Sérosanguinolent/Purulent/Abondant]
- Odeur: [Aucune/Légère/Fétide]
- Peau environnante: [Normale/Rouge/Chaude/Indurée/Macérée]

───────────────────────────────────────────────────────────────
🦠 **ÉVALUATION DE L'INFECTION**:
Niveau de risque: [Faible/Moyen/Élevé]
Signes observés:
□ Rougeur s'étendant □ Chaleur □ Gonflement □ Douleur □ Drainage purulent □ Odeur fétide □ Fièvre □ Traînées rouges

───────────────────────────────────────────────────────────────
📈 **ÉTAT DE CICATRISATION**: [En amélioration/Stable/En détérioration/À risque]
Indicateurs de progrès:
Préoccupations:

───────────────────────────────────────────────────────────────
💊 **RECOMMANDATIONS DE SOINS**:

1. Soins immédiats:
   - [Instructions spécifiques de nettoyage de la plaie]
   - [Recommandation de type de pansement]

2. Position et soulagement de la pression (si applicable):
   - [Calendrier de repositionnement]
   - [Surfaces de support nécessaires]

3. Nutrition et hydratation:
   - [Recommandations protéines/liquides]

4. Considérations médicamenteuses:
   - [Gestion de la douleur]
   - [Traitements topiques]

───────────────────────────────────────────────────────────────
🏥 **ATTENTION MÉDICALE REQUISE**: [OUI - URGENCE: X / NON]

Si OUI, incluez:
⚠️ APPELEZ VOTRE MÉDECIN IMMÉDIATEMENT si vous remarquez:
- [Signes d'avertissement spécifiques pour cette plaie]

🚨 ALLEZ AUX URGENCES si:
- [Indicateurs d'urgence]

📞 CONTACTS D'URGENCE:
- Services d'urgence: 112 (France/Europe) / 15 (SAMU)
- Votre médecin: [Contacter dans 24-48 heures]

═══════════════════════════════════════════════════════════════
⚠️ AVERTISSEMENT: Cette analyse IA est uniquement à des fins éducatives et ne remplace PAS le diagnostic médical professionnel. Consultez toujours un professionnel de santé pour un traitement approprié.
═══════════════════════════════════════════════════════════════`,

    ar: `أنت أخصائي سريري في رعاية الجروح مع خبرة في تصنيف قرح الضغط والتدريب الطبي. حلل الصورة بدقة ممرض معتمد في رعاية الجروح.

متطلبات الإخراج المهمة (اتبعها بالضبط)
1) ابدأ دائمًا بهذا العنوان (المفاتيح بالضبط):
WOUND_PRESENT: YES/NO
URGENCY: CRITICAL/HIGH/MEDIUM/LOW
PRIMARY_REASON: <جملة قصيرة واحدة تبرر الإلحاح>

2) إذا لم يكن هناك جرح مهم سريريًا (لا يوجد كسر في سلامة الجلد)، حدد:
WOUND_PRESENT: NO
URGENCY: LOW
ثم اطبع هذا السطر بالضبط وتوقف:
No wound detected.

3) الطفح/تغير اللون/ضرر الشمس/حالة جلدية بدون جرح مفتوح يعتبر WOUND_PRESENT: NO.

═══════════════════════════════════════════════════════════════
تنسيق التحليل - استخدم هذا الهيكل بالضبط:
═══════════════════════════════════════════════════════════════

🔴 **مستوى الإلحاح**: [حرج/عالي/متوسط/منخفض]

حرج = 🚨 اطلب رعاية طارئة فورًا
- علامات تسمم الدم (حمى، سرعة ضربات القلب، ارتباك)
- تلف عميق في الأنسجة مع عضلات/عظام مكشوفة
- عدوى شديدة تنتشر بسرعة
- نزيف غير متحكم فيه
- أنسجة نخرية (سوداء) تنتشر
- المريض في ضيق شديد

عالي = ⚠️ راجع الطبيب خلال 24 ساعة
- علامات عدوى نشطة (صديد، حرارة، احمرار ينتشر)
- قرحة ضغط من المرحلة 3 أو 4
- جرح لا يلتئم بعد أكثر من أسبوعين
- زيادة الألم أو التورم
- مريض سكري مع قرحة قدم

متوسط = 📋 حدد موعدًا هذا الأسبوع
- قرحة ضغط من المرحلة 2
- جرح يلتئم ببطء
- تصريف معتدل
- خطر عدوى خفيف

منخفض = ✅ استمر في الرعاية المنزلية
- قرحة ضغط من المرحلة 1
- جرح طفيف يلتئم جيدًا
- لا توجد علامات عدوى

───────────────────────────────────────────────────────────────
📊 **مرحلة NPIAP** (لإصابات الضغط):
المرحلة 1: احمرار لا يختفي عند الضغط مع جلد سليم
المرحلة 2: فقدان جزئي لسماكة الجلد (فقاعة أو قرحة سطحية)
المرحلة 3: فقدان كامل لسماكة الجلد (الدهون مرئية)
المرحلة 4: فقدان كامل لأنسجة (العضلات/العظام مرئية)
غير قابل للتصنيف: فقدان كامل السماكة مع سرير جرح غامض
إصابة أنسجة عميقة: أحمر/بنفسجي عميق لا يختفي عند الضغط

إذا لم تكن قرحة ضغط، صف النوع: [جراحي/سكري/وريدي/حرق/رضي/آخر]

───────────────────────────────────────────────────────────────
📝 **وصف تفصيلي**:
- الموقع على الجسم:
- الحجم التقريبي (تقدير بالسم):
- مظهر سرير الجرح: [تنظيم/نخر/خشارة/مختلط]
- اللون: [أحمر/وردي/أصفر/أسود/مختلط]
- العمق: [سطحي/متوسط/عميق]
- التصريف: [لا يوجد/مائي/مائي دموي/قيحي/غزير]
- الرائحة: [لا يوجد/خفيفة/كريهة]
- الجلد المحيط: [طبيعي/أحمر/دافئ/متصلب/متنخر]

───────────────────────────────────────────────────────────────
🦠 **تقييم العدوى**:
مستوى الخطر: [منخفض/متوسط/عالي]
العلامات الملاحظة:
□ احمرار ينتشر □ دفء □ تورم □ ألم □ تصريف قيحي □ رائحة كريهة □ حمى □ خطوط حمراء

───────────────────────────────────────────────────────────────
📈 **حالة الالتئام**: [يتحسن/مستقر/يتدهور/معرض للخطر]
مؤشرات التقدم:
المخاوف:

───────────────────────────────────────────────────────────────
💊 **توصيات الرعاية**:

1. الرعاية الفورية:
   - [تعليمات محددة لتنظيف الجرح]
   - [توصية نوع الضمادة]

2. الوضع وتخفيف الضغط (إذا ينطبق):
   - [جدول تغيير الوضع]
   - [أسطح الدعم المطلوبة]

3. التغذية والترطيب:
   - [توصيات البروتين/السوائل]

4. الاعتبارات الدوائية:
   - [إدارة الألم]
   - [العلاجات الموضعية]

───────────────────────────────────────────────────────────────
🏥 **يتطلب عناية طبية**: [نعم - الإلحاح: X / لا]

إذا نعم، أدرج:
⚠️ اتصل بطبيبك فورًا إذا لاحظت:
- [علامات تحذير محددة لهذا الجرح]

🚨 اذهب إلى قسم الطوارئ إذا:
- [مؤشرات الطوارئ]

📞 جهات اتصال الطوارئ:
- خدمات الطوارئ: 112 (أوروبا) / 911 (أمريكا)
- طبيبك: [اتصل خلال 24-48 ساعة]

═══════════════════════════════════════════════════════════════
⚠️ إخلاء المسؤولية: هذا التحليل بالذكاء الاصطناعي للأغراض التعليمية فقط ولا يحل محل التشخيص الطبي المهني. استشر دائمًا مقدم رعاية صحية للحصول على العلاج المناسب.
═══════════════════════════════════════════════════════════════`,

    es: `Eres un ESPECIALISTA CLÍNICO EN CUIDADO DE HERIDAS con experiencia en clasificación de úlceras por presión y triaje clínico. Analiza la imagen con la precisión de un enfermero certificado en cuidado de heridas.

REQUISITOS IMPORTANTES DE SALIDA (sigue EXACTAMENTE)
1) Siempre comienza con este encabezado (claves exactas):
WOUND_PRESENT: YES/NO
URGENCY: CRITICAL/HIGH/MEDIUM/LOW
PRIMARY_REASON: <1 frase corta justificando la urgencia>

2) Si NO hay una herida clínicamente significativa (sin ruptura de la integridad cutánea), establece:
WOUND_PRESENT: NO
URGENCY: LOW
Luego imprime esta línea exacta y DETENTE:
No wound detected.

3) Una erupción/descoloración/daño solar/dermatoqueliosis/condición dermatológica SIN herida abierta cuenta como WOUND_PRESENT: NO.

═══════════════════════════════════════════════════════════════
FORMATO DE ANÁLISIS - Usa esta estructura EXACTA:
═══════════════════════════════════════════════════════════════

🔴 **NIVEL DE URGENCIA**: [CRÍTICO/ALTO/MEDIO/BAJO]

CRÍTICO = 🚨 BUSQUE ATENCIÓN DE EMERGENCIA INMEDIATAMENTE
- Signos de sepsis (fiebre, ritmo cardíaco rápido, confusión)
- Daño tisular profundo con músculo/huesos expuestos
- Infección severa extendiéndose rápidamente
- Sangrado incontrolable
- Tejido necrótico (negro) extendiéndose
- Paciente en angustia severa

ALTO = ⚠️ CONSULTE A UN MÉDICO EN 24 HORAS
- Signos de infección activa (pus, calor, enrojecimiento extendiéndose)
- Úlcera por presión estadio 3 o 4
- Herida que no sana después de 2+ semanas
- Aumento del dolor o hinchazón
- Diabético con úlcera de pie

MEDIO = 📋 PROGRAME VISITA MÉDICA ESTA SEMANA
- Úlcera por presión estadio 2
- Herida de cicatrización lenta
- Drenaje moderado
- Riesgo de infección leve

BAJO = ✅ CONTINÚE CUIDADO EN CASA
- Úlcera por presión estadio 1
- Herida menor cicatrizando bien
- Sin signos de infección

───────────────────────────────────────────────────────────────
📊 **ESTADIO NPIAP** (para lesiones por presión):
Estadio 1: Eritema no blanqueable de piel intacta
Estadio 2: Pérdida cutánea de espesor parcial (ampolla o úlcera superficial)
Estadio 3: Pérdida cutánea de espesor total (grasa visible)
Estadio 4: Pérdida tisular de espesor total (músculo/hueso visible)
Inclasificable: Pérdida de espesor total con lecho de herida oscurecido
Lesión de tejido profundo: Rojo/violeta profundo no blanqueable persistente

Si no es una úlcera por presión, describa el tipo: [Quirúrgico/Diabético/Venoso/Quemadura/Traumático/Otro]

───────────────────────────────────────────────────────────────
📝 **DESCRIPCIÓN DETALLADA**:
- Localización en el cuerpo:
- Tamaño aproximado (estimación en cm):
- Apariencia del lecho de la herida: [Granulación/Esfacelo/Escarpa/Mixto]
- Color: [Rojo/Rosa/Amarillo/Negro/Mixto]
- Profundidad: [Superficial/Moderada/Profunda]
- Drenaje: [Ninguno/Seroso/Serosanguinolento/Purulento/Copioso]
- Olor: [Ninguno/Leve/Fétido]
- Piel circundante: [Normal/Roja/Caliente/Indurada/Macerada]

───────────────────────────────────────────────────────────────
🦠 **EVALUACIÓN DE INFECCIÓN**:
Nivel de riesgo: [Bajo/Medio/Alto]
Signos observados:
□ Enrojecimiento extendiéndose □ Calor □ Hinchazón □ Dolor □ Drenaje purulento □ Olor fétido □ Fiebre □ Estrías rojas

───────────────────────────────────────────────────────────────
📈 **ESTADO DE CICATRIZACIÓN**: [Mejorando/Estable/Deteriorando/En riesgo]
Indicadores de progreso:
Preocupaciones:

───────────────────────────────────────────────────────────────
💊 **RECOMENDACIONES DE CUIDADO**:

1. Cuidado inmediato:
   - [Instrucciones específicas de limpieza de herida]
   - [Recomendación de tipo de vendaje]

2. Posición y alivio de presión (si aplica):
   - [Horario de reposicionamiento]
   - [Superficies de soporte necesarias]

3. Nutrición e hidratación:
   - [Recomendaciones de proteína/líquidos]

4. Consideraciones de medicación:
   - [Manejo del dolor]
   - [Tratamientos tópicos]

───────────────────────────────────────────────────────────────
🏥 **ATENCIÓN MÉDICA REQUERIDA**: [SÍ - URGENCIA: X / NO]

Si SÍ, incluya:
⚠️ LLAME A SU MÉDICO INMEDIATAMENTE si nota:
- [Signos de advertencia específicos para esta herida]

🚨 VAYA A LA SALA DE EMERGENCIAS si:
- [Indicadores de emergencia]

📞 CONTACTOS DE EMERGENCIA:
- Servicios de emergencia: 112 (España/Europa) / 911 (EE.UU.)
- Su médico: [Contactar en 24-48 horas]

═══════════════════════════════════════════════════════════════
⚠️ DESCARGO DE RESPONSABILIDAD: Este análisis de IA es solo con fines educativos y NO reemplaza el diagnóstico médico profesional. Siempre consulte a un profesional de la salud para el tratamiento adecuado.
═══════════════════════════════════════════════════════════════`,
  };

  return prompts[language] || prompts.en;
};

const WOUND_ANALYSIS_PROMPT = getWoundAnalysisPrompt('en');

export const analyzeSkinImage = async (imageUri, patientInfo = {}, language = 'en') => {
  const startTime = Date.now();
  
  try {
    console.log('🔬 Starting wound analysis...');
    console.log('🌐 Analysis language:', language);
    
    // Validate inputs
    if (!imageUri) {
      throw new Error('No image provided');
    }
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      throw new Error('Gemini API key not configured. Please add your API key in Settings.');
    }
    
    // Process image
    const { base64, mimeType, sizeInBytes } = await fileToBase64(imageUri);
    console.log(`📷 Image processed: ${(sizeInBytes / 1024).toFixed(1)}KB, ${mimeType}`);
    
    // Get language-specific prompt
    const analysisPrompt = getWoundAnalysisPrompt(language);
    
    // Build patient context with language
    const patientContext = buildPatientContext(patientInfo, language);
    
    // Combine prompts
    const fullPrompt = `${analysisPrompt}\n\n${patientContext}`;
    
    // Create API payload
    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: fullPrompt },
        ],
      },
    ];
    
    console.log('📤 Sending to Gemini API...');
    
    // Call API with fallback
    const responseText = await callWithFallback(contents);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Analysis complete in ${duration}ms`);
    
    // Validate response
    if (!responseText || responseText.length < 10) {
      throw new Error('Received empty or invalid response from AI');
    }
    
    // Check for non-wound rejection
    const isRejection = responseText.includes("No wound detected") || 
                        responseText.includes("doesn't appear to be a wound") ||
                        responseText.includes("does not show any wound");
    
    return { 
      success: true, 
      analysis: responseText,
      isRejection,
      duration,
    };
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    
    // Categorize error for better UX
    let userMessage = error.message;
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      userMessage = 'AI service is busy. Please wait a moment and try again.';
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      userMessage = 'Network error. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('safety')) {
      userMessage = error.message; // Keep safety message as-is
    }
    
    return { 
      success: false, 
      error: userMessage,
      originalError: error.message,
    };
  }
};

const buildPatientContext = (patientInfo, language = 'en') => {
  const diseases = patientInfo?.diseases?.length 
    ? patientInfo.diseases.join(', ') 
    : language === 'fr' ? 'Aucune signalée' : 
      language === 'ar' ? 'لم يتم الإبلاغ عن أي' :
      language === 'es' ? 'Ninguna reportada' : 'None reported';
  
  const symptoms = [];
  if (patientInfo?.symptoms) {
    const symptomTranslations = {
      en: { redness: 'Redness', heat: 'Warmth/Heat', pus: 'Pus/Discharge', odor: 'Odor', fever: 'Fever' },
      fr: { redness: 'Rougeur', heat: 'Chaleur', pus: 'Pus/Écoulement', odor: 'Odeur', fever: 'Fièvre' },
      ar: { redness: 'احمرار', heat: 'حرارة', pus: 'صديد/إفرازات', odor: 'رائحة', fever: 'حمى' },
      es: { redness: 'Enrojecimiento', heat: 'Calor', pus: 'Pus/Secreción', odor: 'Olor', fever: 'Fiebre' },
    };
    const t = symptomTranslations[language] || symptomTranslations.en;
    if (patientInfo.symptoms.redness) symptoms.push(t.redness);
    if (patientInfo.symptoms.heat) symptoms.push(t.heat);
    if (patientInfo.symptoms.pus) symptoms.push(t.pus);
    if (patientInfo.symptoms.odor) symptoms.push(t.odor);
    if (patientInfo.symptoms.fever) symptoms.push(t.fever);
  }
  
  const labels = {
    en: {
      context: 'PATIENT CONTEXT',
      age: 'Age',
      conditions: 'Medical Conditions',
      location: 'Wound Location',
      duration: 'Duration',
      pain: 'Pain Level (1-10)',
      infection: 'Signs of Infection',
      notes: 'Additional Notes',
      none: 'None reported',
      notProvided: 'Not provided',
    },
    fr: {
      context: 'CONTEXTE PATIENT',
      age: 'Âge',
      conditions: 'Conditions Médicales',
      location: 'Localisation de la Plaie',
      duration: 'Durée',
      pain: 'Niveau de Douleur (1-10)',
      infection: 'Signes d\'Infection',
      notes: 'Notes Supplémentaires',
      none: 'Aucun signalé',
      notProvided: 'Non fourni',
    },
    ar: {
      context: 'سياق المريض',
      age: 'العمر',
      conditions: 'الحالات الطبية',
      location: 'موقع الجرح',
      duration: 'المدة',
      pain: 'مستوى الألم (1-10)',
      infection: 'علامات العدوى',
      notes: 'ملاحظات إضافية',
      none: 'لم يتم الإبلاغ عن أي',
      notProvided: 'غير متوفر',
    },
    es: {
      context: 'CONTEXTO DEL PACIENTE',
      age: 'Edad',
      conditions: 'Condiciones Médicas',
      location: 'Ubicación de la Herida',
      duration: 'Duración',
      pain: 'Nivel de Dolor (1-10)',
      infection: 'Signos de Infección',
      notes: 'Notas Adicionales',
      none: 'Ninguno reportado',
      notProvided: 'No proporcionado',
    },
  };
  
  const l = labels[language] || labels.en;
  
  return `
${l.context}:
- ${l.age}: ${patientInfo?.age || l.notProvided}
- ${l.conditions}: ${diseases}
- ${l.location}: ${patientInfo?.woundLocation || l.notProvided}
- ${l.duration}: ${patientInfo?.duration || l.notProvided}
- ${l.pain}: ${patientInfo?.painLevel || l.notProvided}
- ${l.infection}: ${symptoms.length ? symptoms.join(', ') : l.none}
- ${l.notes}: ${patientInfo?.additionalNotes || l.none}
  `.trim();
};

// ============================================================================
// CHAT ASSISTANT
// ============================================================================

const getChatPrompt = (language = 'en') => {
  const prompts = {
    en: `You are a wound care assistant. Answer questions about pressure ulcers, wound care, and prevention.

CRITICAL RULES:
1. Keep answers SHORT - maximum 2-3 sentences unless explaining a complex topic
2. Be DIRECT - answer the question immediately, no introductions
3. Use BULLET POINTS for lists (max 4 items)
4. No fluff, no "great question", no filler words
5. If asked about stages, give stage name + 1-line description only
6. End with brief disclaimer only if giving medical advice

Topics: pressure ulcer stages, wound care, dressings, prevention, infection signs, when to see a doctor.

Respond in English.`,

    fr: `Vous êtes un assistant en soins des plaies. Répondez aux questions sur les escarres, les soins des plaies et la prévention.

RÈGLES CRITIQUES:
1. Réponses COURTES - maximum 2-3 phrases
2. Soyez DIRECT - répondez immédiatement, sans introduction
3. Utilisez des PUCES pour les listes (max 4 éléments)
4. Pas de remplissage, pas de "bonne question"
5. Pour les stades: nom du stade + 1 ligne de description
6. Avertissement bref seulement si conseil médical

Répondez en français.`,

    ar: `أنت مساعد رعاية الجروح. أجب عن أسئلة قرح الضغط ورعاية الجروح والوقاية.

قواعد مهمة:
1. إجابات قصيرة - 2-3 جمل كحد أقصى
2. كن مباشر - أجب فورًا بدون مقدمة
3. استخدم نقاط للقوائم (4 كحد أقصى)
4. لا حشو، لا "سؤال جيد"
5. للمراحل: اسم المرحلة + سطر واحد
6. إخلاء مسؤولية قصير فقط إذا كان نصيحة طبية

أجب باللغة العربية.`,

    es: `Eres un asistente de cuidado de heridas. Responde preguntas sobre úlceras por presión, cuidado de heridas y prevención.

REGLAS CRÍTICAS:
1. Respuestas CORTAS - máximo 2-3 frases
2. Sé DIRECTO - responde inmediatamente, sin introducción
3. Usa VIÑETAS para listas (máx 4 elementos)
4. Sin relleno, sin "buena pregunta"
5. Para estadios: nombre + 1 línea de descripción
6. Descargo breve solo si das consejo médico

Responde en español.`,
  };

  return prompts[language] || prompts.en;
};

export const generateChatAnswer = async (userQuestion, language = 'en') => {
  try {
    if (!userQuestion?.trim()) {
      throw new Error('No question provided');
    }
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      throw new Error('Gemini API key not configured');
    }
    
    const chatPrompt = getChatPrompt(language);
    const model = await getBestModel();
    
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${chatPrompt}\n\nUser question: ${userQuestion}` }],
      },
    ];
    
    return await callWithFallback(contents);
    
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return language === 'fr' ? 'Le service IA est occupé. Veuillez patienter un moment et réessayer.' :
             language === 'ar' ? 'خدمة الذكاء الاصطناعي مشغولة. يرجى الانتظار لحظة والمحاولة مرة أخرى.' :
             language === 'es' ? 'El servicio de IA está ocupado. Espere un momento e intente de nuevo.' :
             'AI service is busy. Please wait a moment and try again.';
    }
    
    throw error;
  }
};

// ============================================================================
// RESPONSE PARSING
// ============================================================================

export const parseAnalysisResponse = (analysisText) => {
  const sections = {
    urgency: 'LOW',
    stage: '',
    description: '',
    woundType: '',
    etiology: '',
    location: '',
    measurements: '',
    woundBed: '',
    exudate: '',
    infectionRisk: '',
    infectionIndicators: '',
    healingStatus: '',
    healingTrajectory: '',
    recommendations: '',
    treatmentPlan: '',
    debridement: '',
    dressingSelection: '',
    offloading: '',
    nutrition: '',
    referralRecommendations: '',
    followUpTimeline: '',
    patientEducation: '',
    seekMedicalAttention: '',
    emergencySigns: '',
    disclaimer: '',
    needsDoctor: false,
    isEmergency: false,
    isRejection: false,
    imageQuality: '',
    biofilmPresence: '',
  };
  
  if (!analysisText) return sections;
  
  // Check for rejection message
  if (analysisText.includes("No wound detected") || 
      analysisText.includes("doesn't appear to be a wound") ||
      analysisText.includes("does not show any wound") ||
      analysisText.includes("Normal healthy skin") ||
      analysisText.includes("completely unrelated image")) {
    sections.isRejection = true;
    sections.description = analysisText;
    return sections;
  }

  // Check for structured header rejection
  const woundPresentMatch = analysisText.match(/\bWOUND_PRESENT\s*:\s*(YES|NO)\b/i);
  if (woundPresentMatch && woundPresentMatch[1].toUpperCase() === 'NO') {
    sections.isRejection = true;
    sections.description = 'No wound detected.';
    return sections;
  }
  
  try {
    // Extract image quality assessment
    const qualityMatch = analysisText.match(/IMAGE QUALITY ASSESSMENT\s*([\s\S]*?)(?=STEP 2|WOUND IDENTIFICATION)/i);
    if (qualityMatch) {
      sections.imageQuality = qualityMatch[1].trim();
    }
    
    // Extract urgency - multiple formats including clinical classification
    const urgencyPatterns = [
      /CLINICAL URGENCY CLASSIFICATION[\s\S]*?(🔴|🟠|🟡|🟢).*?(CRITICAL|HIGH|MEDIUM|LOW)/i,
      /\*\*URGENCY LEVEL\*\*:?\s*(CRITICAL|HIGH|MEDIUM|LOW)/i,
      /\*\*URGENCY\*\*:?\s*(CRITICAL|HIGH|MEDIUM|LOW)/i,
      /URGENCY:?\s*(CRITICAL|HIGH|MEDIUM|LOW)/i,
      /🔴.*?(CRITICAL|HIGH|MEDIUM|LOW)/i,
    ];
    
    for (const pattern of urgencyPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.urgency = match[match.length - 1].toUpperCase();
        break;
      }
    }
    
    // Determine if emergency (CRITICAL or HIGH urgency)
    sections.isEmergency = sections.urgency === 'CRITICAL' || sections.urgency === 'HIGH';
    
    // Extract wound type and clinical classification
    const woundTypeMatch = analysisText.match(/Wound Type:?\s*\[?([^\]\n]+)\]?/i);
    if (woundTypeMatch) sections.woundType = woundTypeMatch[1].trim();
    
    const etiologyMatch = analysisText.match(/Etiology:?\s*\[?([^\]\n]+)\]?/i);
    if (etiologyMatch) sections.etiology = etiologyMatch[1].trim();
    
    const locationMatch = analysisText.match(/Anatomical Location:?\s*\[?([^\]\n]+)\]?/i);
    if (locationMatch) sections.location = locationMatch[1].trim();
    
    // Extract stage (multiple formats)
    const stagePatterns = [
      /NPIAP STAGING[\s\S]*?Stage\s*(\d+|Unstageable|Deep Tissue)/i,
      /\*\*NPIAP STAGE\*\*:?\s*([\s\S]*?)(?=─|\*\*|📝|DETAILED|WOUND MEASUREMENT)/i,
      /\*\*STAGE\*\*:?\s*([^\n*]+)/i,
      /STAGE:?\s*(Stage\s*\d+|Unstageable|Deep Tissue)/i,
      /Stage\s*(\d+|Unstageable|Deep Tissue Injury)/i,
    ];
    
    for (const pattern of stagePatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.stage = match[1].trim();
        break;
      }
    }

    // Extract description (fallback for legacy outputs)
    const descPatterns = [
      /\*\*DETAILED DESCRIPTION\*\*:?\s*([\s\S]*?)(?=─|\*\*|🦠|INFECTION)/i,
      /\*\*DESCRIPTION\*\*:?\s*([\s\S]*?)(?=\*\*URGENCY|\*\*INFECTION|\*\*HEALING|\*\*RECOMMEND|\*\*SEEK|\*\*EMERGENCY|\*\*DISCLAIMER|$)/i,
      /PRIMARY_REASON\s*:\s*([^\n]+)/i,
    ];
    
    for (const pattern of descPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.description = match[1].trim();
        break;
      }
    }
    
    // Extract measurements
    const measurementsMatch = analysisText.match(/WOUND MEASUREMENTS[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=WOUND BED|┌─)/i);
    if (measurementsMatch) {
      sections.measurements = measurementsMatch[1].trim();
    }
    
    // Extract wound bed assessment
    const woundBedMatch = analysisText.match(/WOUND BED ASSESSMENT[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=EXUDATE|┌─)/i);
    if (woundBedMatch) {
      sections.woundBed = woundBedMatch[1].trim();
    }
    
    // Extract exudate
    const exudateMatch = analysisText.match(/EXUDATE ASSESSMENT[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=INFECTION|┌─)/i);
    if (exudateMatch) {
      sections.exudate = exudateMatch[1].trim();
    }
    
    // Extract infection indicators
    const infectionMatch = analysisText.match(/INFECTION INDICATORS[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=HEALING|┌─)/i);
    if (infectionMatch) {
      sections.infectionIndicators = infectionMatch[1].trim();
      // Extract risk level
      const riskMatch = sections.infectionIndicators.match(/INFECTION RISK:?\s*(Low|Medium|High)/i);
      if (riskMatch) {
        sections.infectionRisk = riskMatch[1].trim();
      }
      // Extract biofilm
      const biofilmMatch = sections.infectionIndicators.match(/BIOFILM PRESENCE:?\s*(Likely|Unlikely)/i);
      if (biofilmMatch) {
        sections.biofilmPresence = biofilmMatch[1].trim();
      }
    }
    
    // Fallback infection risk extraction
    if (!sections.infectionRisk) {
      const infectionPatterns = [
        /\*\*INFECTION ASSESSMENT\*\*:?\s*([\s\S]*?)(?=─|\*\*|📈|HEALING)/i,
        /\*\*INFECTION RISK\*\*:?\s*([\s\S]*?)(?=\*\*HEALING|\*\*RECOMMEND|\*\*SEEK|\*\*EMERGENCY|\*\*DISCLAIMER|$)/i,
        /Risk Level:?\s*(Low|Medium|High)/i,
      ];
      
      for (const pattern of infectionPatterns) {
        const match = analysisText.match(pattern);
        if (match) {
          if (match[1].match(/Low|Medium|High/i)) {
            sections.infectionRisk = match[1].trim();
          } else {
            sections.infectionIndicators = match[1].trim();
            const riskMatch = match[1].match(/Risk Level:?\s*(Low|Medium|High)/i);
            if (riskMatch) sections.infectionRisk = riskMatch[1].trim();
          }
          break;
        }
      }
    }
    
    // Extract healing trajectory
    const healingMatch = analysisText.match(/HEALING TRAJECTORY[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=CLINICAL URGENCY|┌─)/i);
    if (healingMatch) {
      sections.healingTrajectory = healingMatch[1].trim();
    }
    
    // Fallback healing status
    if (!sections.healingTrajectory) {
      const healingPatterns = [
        /\*\*HEALING STATUS\*\*:?\s*([\s\S]*?)(?=─|\*\*|💊|RECOMMEND)/i,
        /\*\*HEALING STATUS\*\*:?\s*([\s\S]*?)(?=\*\*RECOMMEND|\*\*SEEK|\*\*EMERGENCY|\*\*DISCLAIMER|$)/i,
      ];
      
      for (const pattern of healingPatterns) {
        const match = analysisText.match(pattern);
        if (match) {
          sections.healingStatus = match[1].trim();
          break;
        }
      }
    }
    
    // Extract treatment recommendations
    const treatmentMatch = analysisText.match(/EVIDENCE-BASED TREATMENT RECOMMENDATIONS[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=REFERRAL|┌─)/i);
    if (treatmentMatch) {
      sections.treatmentPlan = treatmentMatch[1].trim();
      
      // Extract specific components
      const debridementMatch = sections.treatmentPlan.match(/DEBRIDEMENT NEEDS:?\s*([\s\S]*?)(?=DRESSING|$)/i);
      if (debridementMatch) sections.debridement = debridementMatch[1].trim();
      
      const dressingMatch = sections.treatmentPlan.match(/DRESSING SELECTION[\s\S]*?Rationale:?\s*([^\n]+)/i);
      if (dressingMatch) sections.dressingSelection = sections.treatmentPlan.match(/DRESSING SELECTION[\s\S]*?└/i)?.[0] || '';
      
      const offloadingMatch = sections.treatmentPlan.match(/OFFLOADING[\s\S]*?(?=ADJUNCTIVE|NUTRITION|└)/i);
      if (offloadingMatch) sections.offloading = offloadingMatch[0].trim();
      
      const nutritionMatch = sections.treatmentPlan.match(/NUTRITION SUPPORT:?\s*([\s\S]*?)(?=└|$)/i);
      if (nutritionMatch) sections.nutrition = nutritionMatch[1].trim();
    }
    
    // Fallback recommendations
    if (!sections.treatmentPlan) {
      const recPatterns = [
        /\*\*CARE RECOMMENDATIONS\*\*:?\s*([\s\S]*?)(?=─|\*\*|🏥|MEDICAL ATTENTION)/i,
        /\*\*RECOMMENDATIONS\*\*:?\s*([\s\S]*?)(?=\*\*SEEK|\*\*EMERGENCY|\*\*DISCLAIMER|$)/i,
      ];
      
      for (const pattern of recPatterns) {
        const match = analysisText.match(pattern);
        if (match) {
          sections.recommendations = match[1].trim();
          break;
        }
      }
    }
    
    // Extract referral recommendations
    const referralMatch = analysisText.match(/REFERRAL RECOMMENDATIONS[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=PATIENT EDUCATION|┌─)/i);
    if (referralMatch) {
      sections.referralRecommendations = referralMatch[1].trim();
      
      const followUpMatch = sections.referralRecommendations.match(/FOLLOW-UP TIMELINE:?\s*([\s\S]*?)(?=└|$)/i);
      if (followUpMatch) sections.followUpTimeline = followUpMatch[1].trim();
    }
    
    // Extract patient education
    const educationMatch = analysisText.match(/PATIENT EDUCATION POINTS[\s\S]*?└─+─+┘\s*([\s\S]*?)(?=═|$)/i);
    if (educationMatch) {
      sections.patientEducation = educationMatch[1].trim();
    }
    
    // Extract medical attention
    const seekPatterns = [
      /\*\*MEDICAL ATTENTION REQUIRED\*\*:?\s*([\s\S]*?)(?=─|\*\*|⚠️|DISCLAIMER)/i,
      /\*\*SEEK MEDICAL ATTENTION\*\*:?\s*([\s\S]*?)(?=\*\*EMERGENCY|\*\*DISCLAIMER|$)/i,
    ];
    
    for (const pattern of seekPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.seekMedicalAttention = match[1].trim();
        break;
      }
    }
    
    // Extract emergency signs
    const emergencyPatterns = [
      /🚨.*?GO TO EMERGENCY ROOM if:?\s*([\s\S]*?)(?=📞|═|$)/i,
      /\*\*EMERGENCY SIGNS\*\*:?\s*([\s\S]*?)(?=\*\*DISCLAIMER|$)/i,
      /Warning Signs to Report Immediately:?\s*([\s\S]*?)(?=Self-Care|└)/i,
    ];
    
    for (const pattern of emergencyPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.emergencySigns = match[1].trim();
        break;
      }
    }
    
    // Extract disclaimer
    const disclaimerPatterns = [
      /CLINICAL DISCLAIMER[\s\S]*?═+\s*([\s\S]*?)$/i,
      /\*\*DISCLAIMER\*\*:?\s*([\s\S]*?)$/i,
      /⚠️ DISCLAIMER:?\s*([\s\S]*?)$/i,
    ];
    
    for (const pattern of disclaimerPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        sections.disclaimer = match[1].trim();
        break;
      }
    }
    
    // Determine if needs doctor
    const seekLower = sections.seekMedicalAttention.toLowerCase();
    sections.needsDoctor = seekLower.includes('yes') || 
                           sections.urgency === 'CRITICAL' || 
                           sections.urgency === 'HIGH';
    
  } catch (error) {
    console.error('Error parsing analysis:', error);
  }
  
  return sections;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Clear model cache (useful for testing)
export const clearModelCache = () => {
  cachedModels = null;
  modelCacheTime = 0;
};

// Get API status
export const getAPIStatus = async () => {
  try {
    const models = await listAvailableModels(true);
    return {
      available: true,
      models: models.length,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
};

export default {
  analyzeSkinImage,
  generateChatAnswer,
  parseAnalysisResponse,
  clearModelCache,
  getAPIStatus,
};
