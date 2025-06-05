import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function createRecipeTables() {
  try {
    console.log("Creating recipe-related tables...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create ingredients table
    console.log("Creating ingredients table...")
    await sql`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        calories DECIMAL(8,2),
        protein DECIMAL(8,2),
        carbs DECIMAL(8,2),
        fat DECIMAL(8,2),
        fiber DECIMAL(8,2),
        unit VARCHAR(50) DEFAULT '100g',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Ingredients table created")

    // Create recipes table
    console.log("Creating recipes table...")
    await sql`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        cooking_time INTEGER,
        servings INTEGER,
        calories_per_serving DECIMAL(8,2),
        protein DECIMAL(8,2),
        carbs DECIMAL(8,2),
        fat DECIMAL(8,2),
        image_url TEXT,
        is_favorite BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Recipes table created")

    // Create recipe_ingredients table (junction table)
    console.log("Creating recipe_ingredients table...")
    await sql`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        amount VARCHAR(100),
        unit VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Recipe_ingredients table created")

    // Create recipe_steps table
    console.log("Creating recipe_steps table...")
    await sql`
      CREATE TABLE IF NOT EXISTS recipe_steps (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        instruction TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Recipe_steps table created")

    // Create consumed_meals table
    console.log("Creating consumed_meals table...")
    await sql`
      CREATE TABLE IF NOT EXISTS consumed_meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
        meal_name VARCHAR(255) NOT NULL,
        meal_time VARCHAR(50),
        portion VARCHAR(100),
        notes TEXT,
        calories DECIMAL(8,2),
        consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Consumed_meals table created")

    // Create consumed_meal_ingredients table
    console.log("Creating consumed_meal_ingredients table...")
    await sql`
      CREATE TABLE IF NOT EXISTS consumed_meal_ingredients (
        id SERIAL PRIMARY KEY,
        consumed_meal_id INTEGER REFERENCES consumed_meals(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        amount VARCHAR(100),
        unit VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✅ Consumed_meal_ingredients table created")

    // Create indexes
    console.log("Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_consumed_meals_user_id ON consumed_meals(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_consumed_meals_recipe_id ON consumed_meals(recipe_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_consumed_meal_ingredients_consumed_meal_id ON consumed_meal_ingredients(consumed_meal_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_consumed_meal_ingredients_ingredient_id ON consumed_meal_ingredients(ingredient_id)`
    console.log("✅ Indexes created")

    // Insert sample ingredients
    console.log("Inserting sample ingredients...")
    await sql`
      INSERT INTO ingredients (name, category, calories, protein, carbs, fat, fiber, unit, image_url) VALUES
      ('Chicken Breast', 'Proteins', 165, 31.0, 0.0, 3.6, 0.0, '100g', '/placeholder.svg?height=80&width=80'),
      ('Brown Rice', 'Grains', 111, 2.6, 23.0, 0.9, 1.8, '100g', '/placeholder.svg?height=80&width=80'),
      ('Broccoli', 'Vegetables', 34, 2.8, 7.0, 0.4, 2.6, '100g', '/placeholder.svg?height=80&width=80'),
      ('Olive Oil', 'Oils & Fats', 884, 0.0, 0.0, 100.0, 0.0, '100g', '/placeholder.svg?height=80&width=80'),
      ('Tomato', 'Vegetables', 18, 0.9, 3.9, 0.2, 1.2, '100g', '/placeholder.svg?height=80&width=80'),
      ('Spinach', 'Vegetables', 23, 2.9, 3.6, 0.4, 2.2, '100g', '/placeholder.svg?height=80&width=80'),
      ('Avocado', 'Fruits', 160, 2.0, 8.5, 14.7, 6.7, '100g', '/placeholder.svg?height=80&width=80'),
      ('Fusilli', 'Grains', 131, 5.0, 25.0, 1.1, 1.8, '100g', '/placeholder.svg?height=80&width=80')
      ON CONFLICT DO NOTHING
    `
    console.log("✅ Sample ingredients inserted")

    // Insert sample recipes
    console.log("Inserting sample recipes...")

    // Get the first user ID
    const users = await sql`SELECT id FROM users LIMIT 1`
    if (users.length === 0) {
      throw new Error("No users found in the database")
    }
    const userId = users[0].id

    // Insert a recipe
    const recipeResult = await sql`
      INSERT INTO recipes (
        user_id, name, description, category, cooking_time, servings, 
        calories_per_serving, protein, carbs, fat, image_url, is_favorite
      ) VALUES (
        ${userId}, 
        'Chicken and Broccoli Stir Fry', 
        'A healthy and quick stir fry with chicken breast and broccoli',
        'Dinner',
        20,
        2,
        350,
        30,
        25,
        15,
        '/placeholder.svg?height=120&width=120',
        true
      ) RETURNING id
    `
    const recipeId = recipeResult[0].id
    console.log(`✅ Sample recipe created with ID: ${recipeId}`)

    // Get ingredient IDs
    const chickenResult = await sql`SELECT id FROM ingredients WHERE name = 'Chicken Breast'`
    const broccoliResult = await sql`SELECT id FROM ingredients WHERE name = 'Broccoli'`
    const riceResult = await sql`SELECT id FROM ingredients WHERE name = 'Brown Rice'`
    const oilResult = await sql`SELECT id FROM ingredients WHERE name = 'Olive Oil'`

    // Insert recipe ingredients
    if (chickenResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipeId}, ${chickenResult[0].id}, '200', 'g')
      `
    }

    if (broccoliResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipeId}, ${broccoliResult[0].id}, '150', 'g')
      `
    }

    if (riceResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipeId}, ${riceResult[0].id}, '100', 'g')
      `
    }

    if (oilResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipeId}, ${oilResult[0].id}, '1', 'tbsp')
      `
    }

    console.log("✅ Recipe ingredients added")

    // Insert recipe steps
    await sql`
      INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
      (${recipeId}, 1, 'Cook rice according to package instructions.'),
      (${recipeId}, 2, 'Cut chicken breast into bite-sized pieces.'),
      (${recipeId}, 3, 'Heat olive oil in a pan over medium-high heat.'),
      (${recipeId}, 4, 'Add chicken and cook until golden, about 5-6 minutes.'),
      (${recipeId}, 5, 'Add broccoli and stir-fry for another 3-4 minutes.'),
      (${recipeId}, 6, 'Season with salt and pepper to taste.'),
      (${recipeId}, 7, 'Serve over cooked brown rice.')
    `
    console.log("✅ Recipe steps added")

    // Insert a second recipe
    const recipe2Result = await sql`
      INSERT INTO recipes (
        user_id, name, description, category, cooking_time, servings, 
        calories_per_serving, protein, carbs, fat, image_url, is_favorite
      ) VALUES (
        ${userId}, 
        'Spinach and Avocado Salad', 
        'A refreshing salad with spinach, avocado, and tomatoes',
        'Lunch',
        10,
        1,
        250,
        5,
        15,
        20,
        '/placeholder.svg?height=120&width=120',
        false
      ) RETURNING id
    `
    const recipe2Id = recipe2Result[0].id
    console.log(`✅ Second sample recipe created with ID: ${recipe2Id}`)

    // Get ingredient IDs for second recipe
    const spinachResult = await sql`SELECT id FROM ingredients WHERE name = 'Spinach'`
    const avocadoResult = await sql`SELECT id FROM ingredients WHERE name = 'Avocado'`
    const tomatoResult = await sql`SELECT id FROM ingredients WHERE name = 'Tomato'`

    // Insert recipe ingredients for second recipe
    if (spinachResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipe2Id}, ${spinachResult[0].id}, '100', 'g')
      `
    }

    if (avocadoResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipe2Id}, ${avocadoResult[0].id}, '1', 'whole')
      `
    }

    if (tomatoResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipe2Id}, ${tomatoResult[0].id}, '1', 'medium')
      `
    }

    if (oilResult.length > 0) {
      await sql`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
        VALUES (${recipe2Id}, ${oilResult[0].id}, '1', 'tbsp')
      `
    }

    console.log("✅ Second recipe ingredients added")

    // Insert recipe steps for second recipe
    await sql`
      INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
      (${recipe2Id}, 1, 'Wash and dry spinach leaves.'),
      (${recipe2Id}, 2, 'Slice avocado and tomato.'),
      (${recipe2Id}, 3, 'Combine all ingredients in a bowl.'),
      (${recipe2Id}, 4, 'Drizzle with olive oil.'),
      (${recipe2Id}, 5, 'Season with salt and pepper to taste.')
    `
    console.log("✅ Second recipe steps added")

    console.log("✅ Recipe tables and sample data created successfully!")
  } catch (error) {
    console.error("❌ Error creating recipe tables:", error)
    process.exit(1)
  }
}

createRecipeTables()
