import { sql } from "./db"

export interface Ingredient {
  id: number
  name: string
  category: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  unit: string
  image_url: string
  amount?: string
}

export interface RecipeStep {
  id: number
  step_number: number
  instruction: string
}

export interface Recipe {
  id: number
  user_id: number
  name: string
  description: string
  category: string
  cooking_time: number
  servings: number
  calories_per_serving: number
  protein: number
  carbs: number
  fat: number
  image_url: string
  is_favorite: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  ingredients?: Ingredient[]
  steps?: RecipeStep[]
}

export async function getUserRecipes(userId: number): Promise<Recipe[]> {
  const recipes = await sql`
    SELECT * FROM recipes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return recipes
}

export async function getRecipeById(recipeId: number): Promise<Recipe | null> {
  const recipes = await sql`
    SELECT * FROM recipes
    WHERE id = ${recipeId}
  `

  if (recipes.length === 0) {
    return null
  }

  const recipe = recipes[0]

  // Get recipe ingredients
  const ingredients = await sql`
    SELECT ri.amount, ri.unit, i.*
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = ${recipeId}
    ORDER BY ri.id
  `

  // Get recipe steps
  const steps = await sql`
    SELECT * FROM recipe_steps
    WHERE recipe_id = ${recipeId}
    ORDER BY step_number
  `

  return {
    ...recipe,
    ingredients,
    steps,
  }
}

export async function getAllIngredients(): Promise<Ingredient[]> {
  const ingredients = await sql`
    SELECT * FROM ingredients
    ORDER BY name
  `
  return ingredients
}

export async function getIngredientById(ingredientId: number): Promise<Ingredient | null> {
  const ingredients = await sql`
    SELECT * FROM ingredients
    WHERE id = ${ingredientId}
  `

  return ingredients.length > 0 ? ingredients[0] : null
}

export async function addConsumedMeal(mealData: {
  user_id: number
  recipe_id?: number
  meal_name: string
  meal_time: string
  portion?: string
  notes?: string
  calories?: number
  consumed_at?: Date
  ingredients?: { id: number; amount?: string; unit?: string }[]
}): Promise<number> {
  // Insert consumed meal
  const result = await sql`
    INSERT INTO consumed_meals (
      user_id, recipe_id, meal_name, meal_time, portion, notes, calories, consumed_at
    ) VALUES (
      ${mealData.user_id},
      ${mealData.recipe_id || null},
      ${mealData.meal_name},
      ${mealData.meal_time},
      ${mealData.portion || null},
      ${mealData.notes || null},
      ${mealData.calories || null},
      ${mealData.consumed_at || new Date()}
    ) RETURNING id
  `

  const consumedMealId = result[0].id

  // Insert consumed meal ingredients if provided
  if (mealData.ingredients && mealData.ingredients.length > 0) {
    for (const ingredient of mealData.ingredients) {
      await sql`
        INSERT INTO consumed_meal_ingredients (
          consumed_meal_id, ingredient_id, amount, unit
        ) VALUES (
          ${consumedMealId},
          ${ingredient.id},
          ${ingredient.amount || null},
          ${ingredient.unit || null}
        )
      `
    }
  }

  return consumedMealId
}
