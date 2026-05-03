import { Recipe, UserPreferences } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

let isQuotaExhausted = false;
let quotaResetTime = 0;

const getAI = () => {
  // Priority 1: process.env (AI Studio preference)
  // Priority 2: VITE_ environment variable (Vercel/Vite preference)
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta.env?.VITE_GEMINI_API_KEY as string);
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORED_RECIPES: Recipe[] = [
  {
    id: 'static-1',
    title: 'Classic Chicken Adobo',
    description: 'The national dish of the Philippines, featuring chicken braised in soy sauce, vinegar, garlic, and peppercorns.',
    prepTime: '45 mins',
    calories: 420,
    budget: 'Moderate',
    estimatedCost: 150,
    difficulty: 'Easy',
    ingredients: ['500g chicken thighs', '1/2 cup soy sauce', '1/3 cup vinegar', '6 cloves garlic', '2 bay leaves', '1 tsp peppercorns'],
    instructions: [
      'Mix soy sauce, vinegar, garlic, and peppercorns in a bowl. Marinate chicken for at least 30 mins.',
      'In a pot, sear the chicken until browned on all sides.',
      'Pour in the marinade and add bay leaves. Bring to a boil.',
      'Lower heat and simmer for 30-40 minutes until chicken is tender and sauce is reduced.'
    ],
    nutrients: { protein: '35g', carbs: '4g', fat: '28g' },
    tags: ['Filipino', 'High Protein', 'Classic'],
    image: 'https://loremflickr.com/800/600/chicken,adobo/all'
  },
  {
    id: 'static-2',
    title: 'Quinoa Buddha Bowl',
    description: 'A nutrient-dense vegan bowl with roasted chickpeas, sweet potatoes, and a creamy tahini dressing.',
    prepTime: '25 mins',
    calories: 380,
    budget: 'Budget',
    estimatedCost: 80,
    difficulty: 'Easy',
    ingredients: ['1 cup cooked quinoa', '1 roasted sweet potato', '1/2 cup chickpeas', 'Kale', 'Tahini', 'Lemon'],
    instructions: [
      'Roast cubed sweet potatoes and chickpeas at 200°C for 20 mins.',
      'Assemble the bowl with a base of quinoa and kale.',
      'Top with roasted veggies and chickpeas.',
      'Drizzle with a mix of tahini, lemon juice, and water.'
    ],
    nutrients: { protein: '15g', carbs: '55g', fat: '12g' },
    tags: ['Vegan', 'Vegetarian', 'Healthy', 'Budget'],
    image: 'https://loremflickr.com/800/600/buddha,bowl/all'
  },
  {
    id: 'static-3',
    title: 'Ribeye Steak with Garlic Butter',
    description: 'A premium, high-fat keto-friendly meal featuring a perfectly seared ribeye steak.',
    prepTime: '15 mins',
    calories: 650,
    budget: 'Premium',
    estimatedCost: 450,
    difficulty: 'Medium',
    ingredients: ['300g Ribeye steak', '50g Butter', 'Garlic', 'Rosemary', 'Salt & Pepper'],
    instructions: [
      'Season steak generously with salt and pepper.',
      'Sear in a hot cast-iron skillet for 3-4 minutes per side.',
      'Add butter, garlic, and rosemary to the pan. Baste the steak for 2 minutes.',
      'Let the steak rest for 5 minutes before slicing.'
    ],
    nutrients: { protein: '45g', carbs: '0g', fat: '52g' },
    tags: ['Keto', 'Premium', 'High Protein'],
    image: 'https://loremflickr.com/800/600/ribeye,steak/all'
  },
  {
    id: 'static-4',
    title: 'Spiced Lentil Soup',
    description: 'Hearty and low-calorie soup filled with protein-rich lentils and middle-eastern spices.',
    prepTime: '35 mins',
    calories: 280,
    budget: 'Budget',
    estimatedCost: 60,
    difficulty: 'Easy',
    ingredients: ['1 cup Red lentils', '1 Onion', 'Cumin', 'Turmeric', 'Vegetable broth', 'Coriander'],
    instructions: [
      'Sauté chopped onion until translucent.',
      'Add spices, lentils, and broth.',
      'Simmer for 20-30 minutes until lentils are soft.',
      'Blend partially for a creamy texture if desired.'
    ],
    nutrients: { protein: '18g', carbs: '42g', fat: '2g' },
    tags: ['Vegetarian', 'Vegan', 'Budget', 'Low Calorie'],
    image: 'https://loremflickr.com/800/600/lentil,soup/all'
  },
  {
    id: 'static-5',
    title: 'Garlic Herb Chicken with Broccoli',
    description: 'A simple, healthy dinner with roasted chicken breast and steamed broccoli.',
    prepTime: '20 mins',
    calories: 320,
    budget: 'Budget',
    estimatedCost: 110,
    difficulty: 'Easy',
    ingredients: ['Chicken breast', 'Broccoli', 'Garlic', 'Olive oil', 'Herbs'],
    instructions: ['Season chicken.', 'Pan-fry until cooked.', 'Steam broccoli.', 'Mix together with garlic butter.'],
    nutrients: { protein: '38g', carbs: '8g', fat: '12g' },
    tags: ['High Protein', 'Healthy', 'Low Carbs'],
    image: 'https://loremflickr.com/800/600/roasted,chicken/all'
  },
  {
    id: 'static-6',
    title: 'Beef Tapsilog',
    description: 'Cured beef strips served with garlic fried rice and a fried egg.',
    prepTime: '25 mins',
    calories: 580,
    budget: 'Moderate',
    estimatedCost: 160,
    difficulty: 'Medium',
    ingredients: ['Beef tapa', 'Garlic rice', 'Fried egg'],
    instructions: ['Fry the marinated beef tapa.', 'Sauté garlic and rice.', 'Fry an egg sunny side up.', 'Serve hot.'],
    nutrients: { protein: '32g', carbs: '65g', fat: '24g' },
    tags: ['Filipino', 'Breakfast', 'High Protein'],
    image: 'https://loremflickr.com/800/600/tapsilog/all'
  }
];

// Simple cache to save quota
const cache = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(`savoria_cache_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`savoria_cache_${key}`);
        return null;
      }
      return parsed.value;
    } catch {
      return null;
    }
  },
  set: (key: string, value: any, ttlMs = 3600000) => { // Default 1 hour
    try {
      localStorage.setItem(`savoria_cache_${key}`, JSON.stringify({
        value,
        expiry: Date.now() + ttlMs
      }));
    } catch (e) {
      console.warn("Storage quota exceeded, could not cache recipes");
    }
  }
};

export async function generateRecipeImage(prompt: string): Promise<string> {
  const searchTerms = encodeURIComponent(prompt.toLowerCase().replace(/recipe/g, '').replace(/[\W_]+/g, ' ').trim());
  const fallbackUrl = `https://loremflickr.com/800/600/${searchTerms.replace(/\s+/g, ',')}/food`;
  
  // Skip AI image generation to save quota for recipes
  return fallbackUrl;
}

export async function generateRecipes(preferences: UserPreferences, forceRefresh = false): Promise<Recipe[]> {
  const ai = getAI();
  if (!ai) throw new Error('AI not configured');

  // Aggressive jitter to avoid synchronized 429s from parallel components
  await wait(Math.random() * 2000);

  // Check cache first if not forcing refresh
  const cacheKey = JSON.stringify({
    diet: preferences.diet,
    budget: preferences.budget,
    goal: preferences.calorieGoal,
    meal: preferences.mealType
  });

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("Returning cached recipes to save quota");
      return cached;
    }
  }

  // Check if we're in a global cooldown
  if (isQuotaExhausted && Date.now() < quotaResetTime) {
    console.warn("AI Quota exhausted, using fallback recipes");
    return getFallbackRecipes(preferences);
  }

  // If time's up, allow trying again
  if (isQuotaExhausted) {
    isQuotaExhausted = false;
  }

  try {
    const prompt = `Generate 6 unique recipe recommendations that STRICTLY align with the following user profile:
    
    CORE REQUIREMENTS:
    - Meal Type: ${preferences.mealType || "Any"}
    - Diet: ${preferences.diet}
    - Allergies/Restrictions: ${preferences.allergies?.join(", ") || "None"} (NEVER include these ingredients)
    - Budget Level: ${preferences.budget}
    - Calorie Target: Exactly ${preferences.calorieGoal || 500} kcal
    
    OUTPUT SPECIFICATIONS:
    1. Title: Very descriptive, appetizing, and specific.
    2. Estimated Cost: A numeric value in PHP. It MUST fall within the range for the ${preferences.budget} budget level.
    3. Calories: A numeric value that strictly respects the target of ${preferences.calorieGoal || 500} kcal.
    4. Tags: Include the diet type "${preferences.diet}", the specific cuisine name, "${preferences.mealType || "Any"}", and the budget level "${preferences.budget}".
    5. Nutrients: Provide realistic protein, carb, and fat values that sum up to the specified calorie count.
    6. imageSearchQuery: A short 2-3 word query for finding a food image of this dish.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              prepTime: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              budget: { type: Type.STRING },
              estimatedCost: { type: Type.NUMBER },
              difficulty: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              nutrients: {
                type: Type.OBJECT,
                properties: {
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fat: { type: Type.STRING }
                }
              },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              videoUrl: { type: Type.STRING },
              imageSearchQuery: { type: Type.STRING }
            },
            required: ["id", "title", "description", "prepTime", "calories", "budget", "estimatedCost", "difficulty", "ingredients", "instructions", "nutrients", "tags", "videoUrl", "imageSearchQuery"]
          }
        }
      }
    });

    let text = (response.text || "").trim();
    if (!text) throw new Error('No response from AI');
    
    let recipes: any[] = JSON.parse(text);
    
    const finalRecipes = recipes.map(recipe => ({
      ...recipe,
      id: recipe.id || `ai-${Math.random().toString(36).substr(2, 9)}`,
      image: `https://loremflickr.com/800/600/${encodeURIComponent(recipe.imageSearchQuery || recipe.title)},food/all`
    }));

    // Save to cache
    cache.set(cacheKey, finalRecipes);

    return finalRecipes;

  } catch (error: any) {
    console.error("Error generating recipes:", error);
    
    // Catch common rate limit indicators
    const isRateLimit = 
      error.status === 429 || 
      error.message?.includes('429') || 
      error.message?.toLowerCase().includes('quota') ||
      error.message?.toLowerCase().includes('exhausted') ||
      error.message?.toLowerCase().includes('limit');

    if (isRateLimit) {
      isQuotaExhausted = true;
      quotaResetTime = Date.now() + 60000 + (Math.random() * 60000); // 1-2 minute cooldown
      console.warn("Global cooldown triggered due to rate limit");
    }

    return getFallbackRecipes(preferences);
  }
}

function getFallbackRecipes(preferences: UserPreferences): Recipe[] {
  // Try to find stored recipes that match the diet
  let matches = STORED_RECIPES.filter(r => 
    r.tags.some(t => t.toLowerCase() === preferences.diet.toLowerCase()) ||
    r.budget === preferences.budget
  );

  if (matches.length === 0) matches = STORED_RECIPES.slice(0, 2);
  
  // Return a mix plus a generic greeting
  return matches.map(r => ({
    ...r,
    id: `fallback-${r.id}-${Date.now()}`
  }));
}

export async function generateRecipeVideo(title: string): Promise<string | null> {
  return null;
}
