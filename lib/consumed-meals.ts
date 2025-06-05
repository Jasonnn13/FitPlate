import { sql } from "./db"

export interface ConsumedMeal {
  id: number
  user_id: number
  recipe_id?: number
  meal_name: string
  meal_time: string
  portion?: string
  notes?: string
  calories: number
  consumed_at: string
  created_at: string
  updated_at: string
}

export interface DailyNutritionStats {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  mealsConsumed: number
  dailyGoal: number
  remaining: number
  weeklyAverage: number
}

export async function getUserDailyStats(userId: number, date?: Date): Promise<DailyNutritionStats> {
  const targetDate = date || new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Get today's consumed meals
  const todaysMeals = await sql`
    SELECT 
      cm.*,
      COALESCE(cm.calories, 0) as meal_calories
    FROM consumed_meals cm
    WHERE cm.user_id = ${userId}
    AND cm.consumed_at >= ${startOfDay.toISOString()}
    AND cm.consumed_at <= ${endOfDay.toISOString()}
    ORDER BY cm.consumed_at DESC
  `

  // Calculate calories from ingredients if meal calories not set
  const mealsWithCalculatedCalories = await Promise.all(
    todaysMeals.map(async (meal) => {
      if (meal.meal_calories > 0) {
        return { ...meal, calculatedCalories: meal.meal_calories }
      }

      // Calculate from ingredients
      const ingredients = await sql`
        SELECT 
          cmi.*,
          i.calories as ingredient_calories,
          i.unit as ingredient_unit
        FROM consumed_meal_ingredients cmi
        JOIN ingredients i ON cmi.ingredient_id = i.id
        WHERE cmi.consumed_meal_id = ${meal.id}
      `

      let calculatedCalories = 0
      for (const ingredient of ingredients) {
        // Simple calculation - assume amounts are in grams or use default portion
        const amount = Number.parseFloat(ingredient.amount) || 100
        const caloriesPer100g = ingredient.ingredient_calories || 0
        calculatedCalories += (caloriesPer100g * amount) / 100
      }

      return { ...meal, calculatedCalories }
    }),
  )

  const totalCalories = mealsWithCalculatedCalories.reduce((sum, meal) => sum + (meal.calculatedCalories || 0), 0)

  // Get user's daily calorie goal
  const userProfile = await sql`
    SELECT daily_calorie_goal 
    FROM user_profiles 
    WHERE user_id = ${userId}
  `

  const dailyGoal = userProfile[0]?.daily_calorie_goal || 2000

  // Calculate weekly average
  const weekAgo = new Date(targetDate)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const weeklyMeals = await sql`
    SELECT 
      DATE(consumed_at) as meal_date,
      SUM(COALESCE(calories, 0)) as daily_calories
    FROM consumed_meals
    WHERE user_id = ${userId}
    AND consumed_at >= ${weekAgo.toISOString()}
    AND consumed_at < ${startOfDay.toISOString()}
    GROUP BY DATE(consumed_at)
    ORDER BY meal_date DESC
    LIMIT 7
  `

  const weeklyAverage =
    weeklyMeals.length > 0
      ? weeklyMeals.reduce((sum, day) => sum + (day.daily_calories || 0), 0) / weeklyMeals.length
      : 0

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: 0, // TODO: Calculate from ingredients
    totalCarbs: 0, // TODO: Calculate from ingredients
    totalFat: 0, // TODO: Calculate from ingredients
    mealsConsumed: todaysMeals.length,
    dailyGoal,
    remaining: Math.max(0, dailyGoal - totalCalories),
    weeklyAverage: Math.round(weeklyAverage),
  }
}

export async function getUserConsumedMeals(userId: number, limit = 10, date?: Date): Promise<ConsumedMeal[]> {
  let query = sql`
    SELECT * FROM consumed_meals
    WHERE user_id = ${userId}
  `

  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    query = sql`
      SELECT * FROM consumed_meals
      WHERE user_id = ${userId}
      AND consumed_at >= ${startOfDay.toISOString()}
      AND consumed_at <= ${endOfDay.toISOString()}
    `
  }

  const meals = await sql`
    ${query}
    ORDER BY consumed_at DESC
    LIMIT ${limit}
  `

  return meals
}

export async function addConsumedMealWithCalories(mealData: {
  user_id: number
  recipe_id?: number
  meal_name: string
  meal_time: string
  portion?: string
  notes?: string
  consumed_at?: Date
  ingredients?: { id: number; amount?: string; unit?: string }[]
}): Promise<{ consumedMealId: number; calculatedCalories: number }> {
  // Calculate calories from ingredients
  let calculatedCalories = 0

  if (mealData.ingredients && mealData.ingredients.length > 0) {
    for (const ingredient of mealData.ingredients) {
      const ingredientData = await sql`
        SELECT calories, unit FROM ingredients WHERE id = ${ingredient.id}
      `

      if (ingredientData.length > 0) {
        const amount = Number.parseFloat(ingredient.amount || "100") || 100
        const caloriesPer100g = ingredientData[0].calories || 0
        calculatedCalories += (caloriesPer100g * amount) / 100
      }
    }
  }

  // Insert consumed meal with calculated calories
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
      ${Math.round(calculatedCalories)},
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

  return { consumedMealId, calculatedCalories: Math.round(calculatedCalories) }
}

export async function deleteConsumedMeal(userId: number, mealId: number): Promise<boolean> {
  try {
    // Verify the meal belongs to the user
    const meal = await sql`
      SELECT id FROM consumed_meals 
      WHERE id = ${mealId} AND user_id = ${userId}
    `

    if (meal.length === 0) {
      return false
    }

    // Delete the meal (ingredients will be deleted by CASCADE)
    await sql`
      DELETE FROM consumed_meals 
      WHERE id = ${mealId} AND user_id = ${userId}
    `

    return true
  } catch (error) {
    console.error("Error deleting consumed meal:", error)
    return false
  }
}
