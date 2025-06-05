-- Insert test users (passwords are hashed versions of 'password123')
INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES
('john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'John', 'Doe', true),
('jane.smith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Jane', 'Smith', true),
('test@fitplate.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Test', 'User', true)
ON CONFLICT (email) DO NOTHING;

-- Insert corresponding profiles
INSERT INTO user_profiles (user_id, age, weight, height, activity_level, goal, dietary_preferences, allergies, meals_per_day, daily_calorie_goal)
SELECT 
    u.id,
    28,
    70.5,
    175.0,
    'Moderately Active',
    'Maintain Weight',
    ARRAY['Vegetarian'],
    ARRAY['Nuts'],
    3,
    2200
FROM users u 
WHERE u.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;
