// IMPORTANT: Replace this with your actual Google Gemini API key
// Get your free API key from: https://makersuite.google.com/app/apikey
export const GEMINI_API_KEY = 'AIzaSyBl7WUYmTZSCPffrCt1TGXaBUxc0LVZ-pA';

// Model configuration
export const GEMINI_MODEL = 'gemini-1.5-flash-latest';

// System prompt for pressure ulcer (escarre) analysis
export const MEDICAL_ANALYSIS_PROMPT = `STOP! Before doing anything else, look at this image carefully.

Is this a photo of a wound, skin damage, pressure ulcer, bedsore, or skin injury?

- If YES (you see an open wound, red skin damage, ulcer, sore, or skin injury): Analyze it normally.
- If NO (you see a flower, face, object, landscape, food, animal, or anything else): Respond with ONLY this exact message and nothing else:

"⚠️ This doesn't appear to be a wound or skin damage photo. Please take a clear photo of your wound or affected skin area for analysis."

DO NOT give medical advice for non-wound images. DO NOT analyze flowers, faces, or objects as if they were wounds.

---

If this IS a wound, analyze it and write in natural paragraphs:

**NPIAP Stages:**
- Stage 1: Intact skin with non-blanchable redness
- Stage 2: Partial-thickness skin loss, dermis exposed
- Stage 3: Full-thickness skin loss, fat visible
- Stage 4: Full-thickness tissue loss, bone/muscle visible
- Unstageable: Wound bed obscured by slough/eschar

**Include:**
1. **Stage**: What stage? Explain why.
2. **Description**: Size, color, wound bed, surrounding skin.
3. **Infection Risk**: Risk level and signs to watch.
4. **Recommendations**: Care steps, dressing, positioning.
5. **When to Seek Care**: See a doctor? Why?`;

export default { GEMINI_API_KEY, GEMINI_MODEL, MEDICAL_ANALYSIS_PROMPT };
