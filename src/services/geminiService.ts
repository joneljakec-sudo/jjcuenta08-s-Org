import { Recipe, UserPreferences } from "../types";
import { supabase } from "../lib/supabase";

let isQuotaExhausted = false;

export async function generateRecipeImage(prompt: string): Promise<string> {
  const searchTerms = encodeURIComponent(prompt.toLowerCase().replace(/recipe/g, '').trim());
  const fallbackUrl = `https://loremflickr.com/800/600/${searchTerms}/all`;

  if (isQuotaExhausted) {
    return fallbackUrl;
  }

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error('Image generation failed');
    const { data } = await response.json();
    return `data:image/png;base64,${data}`;
  } catch (error: any) {
    console.warn("Recipe image generation failed, using fallback:", error.message);
    return fallbackUrl;
  }
}

async function getCachedRecipes(preferences: UserPreferences): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('global_recipes')
      .select('recipe_data')
      .eq('diet', preferences.diet)
      .eq('budget', preferences.budget)
      .limit(12);

    if (error) {
      console.error("Error fetching cached recipes:", error);
      return [];
    }

    if (data && data.length > 0) {
      // Map to recipes and de-duplicate by ID
      const allRecipes = data.map(item => item.recipe_data as Recipe);
      const uniqueMap = new Map(allRecipes.map(r => [r.id, r]));
      const uniqueList = Array.from(uniqueMap.values());
      
      // Shuffle and pick 6
      const shuffled = [...uniqueList].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 6);
    }
  } catch (err) {
    console.error("Failed to fetch from cache:", err);
  }
  return [];
}

async function cacheRecipes(recipes: Recipe[], preferences: UserPreferences) {
  try {
    const records = recipes.map(recipe => ({
      diet: preferences.diet,
      budget: preferences.budget,
      recipe_data: recipe,
      title: recipe.title
    }));

    const { error } = await supabase
      .from('global_recipes')
      .upsert(records, { onConflict: 'title' });

    if (error) {
      console.error("Error caching recipes:", error);
    }
  } catch (err) {
    console.error("Failed to cache recipes:", err);
  }
}

export async function generateRecipes(preferences: UserPreferences, forceRefresh = false): Promise<Recipe[]> {
  let cached: Recipe[] = [];
  
  // 1. Try to get from cache first if not forcing refresh
  if (!forceRefresh) {
    cached = await getCachedRecipes(preferences);
    if (cached.length >= 6) {
      console.log("Using cached recipes from Supabase");
      return cached;
    }
  }

  try {
    const response = await fetch('/api/generate-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    });

    if (!response.ok) throw new Error('Recipe generation failed');
    const { text } = await response.json();
    
    let recipes: Recipe[] = JSON.parse(text) as Recipe[];
    
    // Ensure numeric fields are valid, instructions exist, and IDs are unique
    recipes = recipes.map((r, idx) => ({
      ...r,
      id: r.id || `ai-${Math.random().toString(36).substr(2, 9)}`,
      calories: Number(r.calories) || 0,
      estimatedCost: Number(r.estimatedCost) || 0,
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      tags: Array.isArray(r.tags) ? r.tags : [],
      nutrients: r.nutrients || { protein: '0g', carbs: '0g', fat: '0g' }
    }));
    
    // De-duplicate by ID just in case
    const uniqueRecipes = Array.from(new Map(recipes.map(r => [r.id, r])).values());
    
    // Parallelize image generation
    const recipesWithImages = await Promise.all(uniqueRecipes.map(async (recipe) => {
      const imageUrl = await generateRecipeImage(recipe.title);
      return {
        ...recipe,
        image: imageUrl
      };
    }));

    // Cache the new recipes
    await cacheRecipes(recipesWithImages, preferences);

    return recipesWithImages;
  } catch (error: any) {
    console.error("Error generating recipes:", error);
    return cached.length > 0 ? cached : [
      {
        id: 'fallback-1',
        title: 'Classic Filipino Adobo',
        description: 'A savory and tangy Filipino staple made with chicken or pork, soy sauce, and vinegar.',
        prepTime: '45 mins',
        calories: 450,
        budget: 'Moderate',
        estimatedCost: 120,
        difficulty: 'Easy',
        ingredients: ['500g Chicken', '1/2 cup Soy Sauce', '1/4 cup Vinegar', 'Garlic', 'Bay leaves'],
        instructions: ['Marinate chicken.', 'Sauté garlic.', 'Add chicken and brown.', 'Add marinade and simmer until tender.'],
        nutrients: { protein: '30g', carbs: '5g', fat: '25g' },
        tags: [preferences.diet, 'Filipino', 'Classic'],
        image: 'https://loremflickr.com/800/600/adobo/all'
      }
    ];
  }
}

export async function generateRecipeVideo(title: string): Promise<string | null> {
  // Video generation is expensive and complex, for now we return null or implement if needed
  return null;
}

