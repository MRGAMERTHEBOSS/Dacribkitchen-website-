import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { entrees, alfredos, salads, premiumCombos, wingFlavors, sides } from "./src/data.js"; // note: resolving with .js or importing directly is fine under tsx/esbuild

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Lazy-initialization of Gemini client for server-side recommendations
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// Menu reference helper
const ALL_MENU_ITEMS = [
  ...entrees.map(e => ({ ...e, type: "Entree" })),
  ...alfredos.map(a => ({ ...a, type: "Alfredo" })),
  ...salads.map(s => ({ ...s, type: "Salad" })),
  ...premiumCombos.map(c => ({ ...c, type: "Promo Combo", calories: "1400 kcal" }))
];

// Heuristic fallback matching generator if Gemini is not configured
function generateHeuristicRecommendation(craving: string, protein: string, hunger: string, spice: string) {
  // Let's filter some items based on matching criteria
  const pLower = protein.toLowerCase();
  const cLower = craving.toLowerCase();
  
  // Scoring weights
  const itemsWithScores = ALL_MENU_ITEMS.map((item) => {
    let score = 50; // base score
    
    // Check protein match
    if (pLower !== "any" && pLower !== "" && pLower !== "surprise me") {
      if (item.name.toLowerCase().includes(pLower) || item.desc.toLowerCase().includes(pLower)) {
        score += 30;
      }
    }
    
    // Check craving style match
    if (cLower.includes("creamy") && (item.name.toLowerCase().includes("alfredo") || item.desc.toLowerCase().includes("creamy"))) {
      score += 25;
    } else if (cLower.includes("spicy") && (item.desc.toLowerCase().includes("cajun") || item.desc.toLowerCase().includes("spices") || item.name.toLowerCase().includes("blackened"))) {
      score += 25;
    } else if (cLower.includes("fresh") && item.type === "Salad") {
      score += 30;
    }
    
    // Hunger level size matches
    if (hunger === "feast" && item.type === "Promo Combo") {
      score += 25;
    } else if (hunger === "light" && item.type === "Salad") {
      score += 20;
    } else if (hunger === "platter" && item.type === "Entree") {
      score += 20;
    }
    
    return { item, score };
  });
  
  // Sort descending by score
  const sorted = itemsWithScores.sort((a, b) => b.score - a.score);
  
  // Map back to output schema
  const recommendations = sorted.slice(0, 3).map((wrapped, idx) => {
    const item = wrapped.item;
    let explanation = `This item fits your ${craving} craving with customized options! `;
    let badge = "CHEF RECOMMENDATION";
    
    if (idx === 0) {
      explanation = `Our #1 match for you! The executive chef selected ${item.name} because it perfectly honors your preference for ${protein || "premium food"} with a ${spice || "custom"} spice flare. Heavy West Philly portions guaranted!`;
      badge = "PREMIER HARMONY 🌟";
    } else if (idx === 1) {
      explanation = `An absolute classic. Combining succulent tastes, this ${item.name} is a high-demand favorite. It hits key notes of your ${craving} craving style!`;
      badge = "POPULAR CHOICE 🔥";
    } else {
      explanation = `Add complete comfort to your meal! Ideal portion balance with premium seasoning so you feel completely satisfied.`;
      badge = "CRAVING SATISFACTION 🎯";
    }
    
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      desc: explanation,
      matchPercentage: Math.floor(88 + (2 - idx) * 5),
      accentBadge: badge
    };
  });
  
  return recommendations;
}

// POST endpoint for Gemini Recommendations
app.post("/api/gemini/recommend", async (req, res) => {
  const { craving, protein, hunger, spice } = req.body;
  
  const selectedCraving = craving || "creamy & velvety";
  const selectedProtein = protein || "any";
  const selectedHunger = hunger || "platter";
  const selectedSpice = spice || "mild";
  
  const ai = getGeminiClient();
  
  if (!ai) {
    console.log("⚠️ No GEMINI_API_KEY set on server. Resorting to premium heuristic match router.");
    const fallbackResults = generateHeuristicRecommendation(selectedCraving, selectedProtein, selectedHunger, selectedSpice);
    return res.json({
      success: true,
      recommendations: fallbackResults,
      isFallback: true
    });
  }
  
  try {
    const serializedMenu = ALL_MENU_ITEMS.map(i => {
      return `- ID: "${i.id}", Name: "${i.name}", Price: $${i.price}, Desc: "${i.desc}", Type: "${i.type}"`;
    }).join("\n");
    
    const prompt = `You are the culinary soul food guru AI chef at "Da Crib Kitchen", Philadelphia's elite digital soul-food platter spot.
Your job is to recommend exactly 2-3 genuine menu items to a customer based on these specific options chosen:
- Craving Mode/Style: "${selectedCraving}"
- Preferred protein meat/fish: "${selectedProtein}"
- Hunger Intake Scale: "${selectedHunger}"
- Spice level preference: "${selectedSpice}"

Here is our exact current menu of entrees, creamy alfredos, chilled pasta/seafood salads, and supreme combos:
${serializedMenu}

If none of our exact individual menu items are a perfect fit, you may suggest one custom soul platter item but its "id" must start with "custom_combo_" (e.g., custom_combo_lamb_steak). Ensure any item you select from the existing menu uses its exact current ID.

Generate an array of exactly 2 or 3 items that fits these preferences perfectly.
Each recommendation object must contain:
1. "id" (string): the exact ID from the menu, or a "custom_combo_xxxx" ID.
2. "name" (string): the item name or specialized platter combination name.
3. "price" (integer): the price of the item (if custom combo, estimate price reasonably, e.g. 35-45).
4. "desc" (string): a mouth-watering, juicy, West Philly soul description customized precisely to how this hits their craving, spice, and protein combination. Highlight the rich flavors, the generous helping size, and why this particular plate is a total knockout. Be warm, buttery, and incredibly enthusiastic!
5. "matchPercentage" (integer): a score between 85 and 99 representing how close this dish is to their desired options.
6. "accentBadge" (string): a short, sharp, premium badge (e.g. "PERFECT CHAT!", "BLACKENED MAGIC", "CHEFS SIGNATURE", "CREAMY SUPREME").

Return ONLY a raw, valid JSON array conforming to this structure:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The menu item ID or custom_combo_xxx ID" },
              name: { type: Type.STRING, description: "Name of the option" },
              price: { type: Type.INTEGER, description: "Numeric cost of the item" },
              desc: { type: Type.STRING, description: "Mouth-watering customer tailored justification" },
              matchPercentage: { type: Type.INTEGER, description: "Value from 85 to 99" },
              accentBadge: { type: Type.STRING, description: "Short visual tag e.g. GOLD MEDAL" }
            },
            required: ["id", "name", "price", "desc", "matchPercentage", "accentBadge"]
          }
        }
      }
    });

    const textOutput = response.text?.trim() || "[]";
    const recommendedArray = JSON.parse(textOutput);
    
    res.json({
      success: true,
      recommendations: recommendedArray,
      isFallback: false
    });
    
  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    // Graceful fallback to prevent user crash
    const backupResults = generateHeuristicRecommendation(selectedCraving, selectedProtein, selectedHunger, selectedSpice);
    res.json({
      success: true,
      recommendations: backupResults,
      isFallback: true,
      errorMessage: err.message
    });
  }
});


// Configure dev server or client serving depending on NODE_ENV
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("⚡ Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 Production static assets mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Full-stack server running securely on port ${PORT}`);
  });
}

startServer();
