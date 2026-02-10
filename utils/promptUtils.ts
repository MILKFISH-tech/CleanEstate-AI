
// --- PROMPT UTILITIES ---
// Centralized location for all AI Prompt Engineering logic.
// Editing this file changes HOW the AI behaves, without breaking the UI.

export const SPACE_OPTIONS = [
    { label: "--- 請選擇空間類型 (必選) ---", value: "" }, // Default empty for validation
    { label: "🛋️ 客廳 Living Room", value: "Living Room" },
    { label: "🍽️ 餐廳 Dining Room", value: "Dining Room" },
    { label: "🍳 廚房 Kitchen", value: "Kitchen" },
    { label: "🛏️ 臥室 Bedroom", value: "Bedroom" },
    { label: "🛁 衛浴 Bathroom", value: "Bathroom" },
    { label: "🪵 陽台/露台 Balcony/Patio", value: "Balcony or Patio" },
    { label: "📚 書房/辦公室 Study/Office", value: "Study Room" },
    { label: "🚪 玄關 Entryway/Foyer", value: "Entryway" },
    { label: "📦 空房 Empty Room", value: "Empty Room" },
    // Composite Spaces
    { label: "🛋️🍽️ 客廳+餐廳 Living & Dining", value: "Open Plan Living and Dining Room" },
    { label: "🍳🍽️ 廚房+餐廳 Kitchen & Dining", value: "Open Plan Kitchen and Dining Area" },
    { label: "🛏️📚 臥室+書房 Bedroom & Study", value: "Bedroom with Study Area" },
    { label: "🚪🛋️ 玄關+客廳 Entryway & Living", value: "Open Plan Entryway and Living Room" },
    { label: "🏢 開放式套房 Studio / Loft", value: "Open Plan Studio Apartment" },
    { label: "❓ 其他/未知 General/Unknown", value: "Indoor Interior Space" },
];

export const STYLE_PRESETS = [
  {
    id: 'cream',
    label: "法式奶油",
    desc: "CREAM / SOFT MINIMAL",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Creamy Soft Minimalist / Korean Butter Style. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to light warm herringbone wood or creamy carpet. REPAINT walls in warm off-white, butter-cream, or milk-white tones. NO cold grey.\n3. FURNISH: Add curved, rounded furniture (bouclé fabric sofas, round edges), soft textures, fluffy rugs, minimalist warm lighting.\n4. QUALITY: Soft dreamy lighting, cozy atmosphere, pastel warm tones, high fidelity."
  },
  {
    id: 'minimalist',
    label: "極簡黑白",
    desc: "MODERN MINIMALIST",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Modern Minimalist / Black & White. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to polished concrete or grey oak. REPAINT walls in crisp white or matte light grey. High contrast details.\n3. FURNISH: Add sleek low-profile furniture, black metal accents, abstract art, track lighting. Eliminate clutter.\n4. QUALITY: Cool lighting, sharp lines, high contrast, clean and airy."
  },
  {
    id: 'modern',
    label: "現代輕奢",
    desc: "CONTEMPORARY LUXURY",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: High-End Contemporary Luxury. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to polished large-format marble or rich warm oak. REPAINT walls in 'Greige' (Warm Grey) or crisp white with wainscoting details.\n3. FURNISH: Add high-end Italian style furniture, brass or gold metal accents, velvet textures, marble coffee tables, statement lighting.\n4. QUALITY: Hotel-like lighting, sharp contrast, expensive look, photorealistic 8k."
  },
  {
    id: 'wabisabi',
    label: "寂詫美學",
    desc: "WABI-SABI / ORGANIC",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Wabi-Sabi / Organic Modern. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to micro-cement or distressed wood. REPAINT walls in lime wash plaster (textured beige/grey).\n3. FURNISH: Add raw wood furniture, linen fabrics, dried branches, irregular shapes, stone accents, warm low lighting.\n4. QUALITY: Earthy tones, textured shadows, calm and imperfect beauty."
  },
  {
    id: 'tropical',
    label: "熱帶度假",
    desc: "TROPICAL RESORT / BALI",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Tropical Resort / Bali Villa Style. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to teak wood decking or natural stone. Walls in textured plaster or white.\n3. FURNISH: Add Rattan/Wicker furniture, linen fabrics, light wood, hanging egg chairs, and LARGE tropical indoor plants (Monstera, Palm trees). Airy and breezy feel.\n4. QUALITY: Natural sunlight, relaxing atmosphere, holiday vibes, vibrant greens."
  },
  {
    id: 'nordic',
    label: "北歐風格",
    desc: "SCANDINAVIAN",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Scandinavian / Nordic. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to light warm oak wood. REPAINT walls in clean white or soft light grey.\n3. FURNISH: Add {{SPACE_TYPE}} furniture in soft grey tones, geometric rugs, minimal wood tables, and indoor plants.\n4. QUALITY: Soft daylight, clean lines, sharp details, no noise."
  },
  {
    id: 'muji',
    label: "日系無印",
    desc: "JAPANDI / MUJI",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Japanese Muji / Japandi. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to natural light ash/pine wood. REPAINT walls to creamy warm white or beige.\n3. FURNISH: Add low-height wooden {{SPACE_TYPE}} furniture, linen fabrics, paper lanterns, minimalist wood slats.\n4. QUALITY: Warm color temperature, soft shadows, zen atmosphere, no noise."
  },
  {
    id: 'farmhouse',
    label: "現代農莊",
    desc: "MODERN FARMHOUSE",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Modern Farmhouse. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to rustic wide-plank oak. REPAINT walls in white (shiplap texture preferred) or soft sage green.\n3. FURNISH: Add slipcovered sofas, reclaimed wood tables, black matte hardware, industrial-style pendants, cozy throws.\n4. QUALITY: Bright, welcoming, rustic yet refined, high detail."
  },
  {
    id: 'mcm',
    label: "摩登復古",
    desc: "MID-CENTURY MODERN",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Mid-Century Modern (1950s style). \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to dark walnut wood. Walls in white with perhaps one accent wall (olive green or burnt orange).\n3. FURNISH: Add iconic furniture with tapered wooden legs, leather armchairs, geometric patterns, sunburst clocks, organic curves.\n4. QUALITY: Nostalgic but clean, cinematic lighting, high detail."
  },
  {
    id: 'boho',
    label: "波希米亞",
    desc: "BOHEMIAN ECLECTIC",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Modern Bohemian. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to wood with layered rugs. Walls in warm earth tones (terracotta, beige) or white.\n3. FURNISH: Add rattan furniture, macramé wall hangings, many pillows with ethnic patterns, leather poufs, and an abundance of hanging plants.\n4. QUALITY: Warm, cluttered but cozy, artistic, earthy tones."
  },
  {
    id: 'industrial',
    label: "工業風格",
    desc: "MODERN INDUSTRIAL",
    prompt: "TASK: Virtual Renovation of a {{SPACE_TYPE}}. STYLE: Modern Industrial Lofts. \n1. GEOMETRY: STRICTLY MAINTAIN original perspective. For open plans, ensure cohesive design flow across zones.\n2. SURFACES: CHANGE flooring to polished concrete or dark distressed wood. REPAINT walls to exposed brick texture or concrete finish.\n3. FURNISH: Add leather chesterfield sofas, black metal pipe shelves, raw wood tables, edison bulb lighting.\n4. QUALITY: Moody lighting, masculine vibe, high texture detail."
  }
];

export const FURNITURE_SUGGESTIONS = [
    // Living Room
    { label: "L型沙發 L-Sofa", value: "a modern grey fabric L-shaped sofa" },
    { label: "單人沙發 Armchair", value: "a stylish accent armchair (leather or velvet)" },
    { label: "咖啡桌 Coffee Table", value: "a minimalist coffee table (marble or wood)" },
    { label: "電視櫃 TV Stand", value: "a low-profile modern wooden TV stand" },
    { label: "地毯 Rug", value: "a textured geometric area rug" },
    { label: "立燈 Floor Lamp", value: "a modern arched floor lamp" },
    
    // Dining / Kitchen
    { label: "餐桌組 Dining Table", value: "a wooden dining table with 4 modern chairs" },
    { label: "吧台椅 Bar Stool", value: "modern counter height bar stools" },
    { label: "中島 Kitchen Island", value: "a kitchen island with marble countertop" },
    
    // Bedroom
    { label: "雙人床 Double Bed", value: "a modern comfortable double bed with white hotel-style linens" },
    { label: "床頭櫃 Nightstand", value: "a wooden nightstand with a lamp" },
    { label: "衣櫃 Wardrobe", value: "a built-in modern wardrobe with sliding doors" },
    { label: "化妝台 Vanity", value: "a makeup vanity table with a mirror" },
    
    // Decor / Misc
    { label: "書櫃 Bookshelf", value: "a tall wooden bookshelf filled with books" },
    { label: "盆栽 Indoor Plant", value: "a large indoor potted plant (monstera or fiddle leaf fig)" },
    { label: "掛畫 Wall Art", value: "a modern abstract framed wall art" },
    { label: "吊燈 Pendant Light", value: "a modern stylish pendant light fixture" },
    { label: "辦公桌 Desk", value: "a modern work desk with an ergonomic chair" },
    { label: "窗簾 Curtains", value: "floor-to-ceiling sheer white curtains" },
    { label: "全身鏡 Mirror", value: "a large leaning full-length mirror with metal frame" },
    { label: "懶骨頭 Bean Bag", value: "a cozy bean bag chair" },
    { label: "鞋櫃 Shoe Cabinet", value: "a sleek entryway shoe cabinet" }
];

/**
 * Generates the final prompt for the Item Insertion / Staging mode.
 */
export const generateItemPrompt = (spaceType: string, itemDescription: string): string => {
    return `TASK: Object Insertion / Inpainting. 
CONTEXT: This is a ${spaceType}. 
ACTION: Insert [ ${itemDescription} ] into the masked magenta area. 
CONSTRAINT: The object must match the room's perspective, lighting direction, and shadows strictly. 
QUALITY: Photorealistic, high details, seamless blending.`;
};

/**
 * Generates the final prompt for the Eraser mode.
 */
export const generateEraserPrompt = (userDescription?: string): string => {
    if (!userDescription || userDescription.trim() === "") {
        return "Remove the masked objects completely. Fill the area naturally with the background texture (floor, wall, etc). Remove shadows and reflections of the object. Clean, high quality.";
    }
    return `Remove object: ${userDescription}. Fill naturally.`;
};
