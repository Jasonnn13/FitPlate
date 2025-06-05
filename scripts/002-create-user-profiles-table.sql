-- Create user profiles table for onboarding data
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    activity_level VARCHAR(50),
    goal VARCHAR(100),
    dietary_preferences TEXT[], -- Array of dietary preferences
    allergies TEXT[], -- Array of allergies
    meals_per_day INTEGER,
    daily_calorie_goal INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);
