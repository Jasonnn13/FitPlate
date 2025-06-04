"use client"

import { ChevronLeft, Plus, Minus, Camera, Home, Book, Upload, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, ChangeEvent, useCallback } from "react"

// Define the structure for ingredients more clearly if possible
// This should align with what onNavigateToIngredients provides and what the backend expects
interface Ingredient {
  id: string; // Unique ID from your database
  name: string;
  amount: string; // e.g., "1 cup", "100g"
  image?: string;
  category?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

interface AddRecipePageProps {
  onNavigateBack?: () => void;
  onNavigateToHome: () => void;
  onNavigateToRecipes: () => void;
  onNavigateToIngredients: () => void; // This should bring back Ingredient[]
  prefilledData?: {
    mealName: string;
    portion: string; // Could map to servings
    notes: string;
    mealTime: string;
    selectedIngredients: Ingredient[]; // Use the Ingredient type
    imageUrl?: string; // If a pre-filled meal has an image
  } | null;
  selectedIngredients: Ingredient[]; // Use the Ingredient type
  onUpdateIngredients: (ingredients: Ingredient[]) => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL)
                      || "http://localhost:5000";

export default function AddRecipePage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  onNavigateToIngredients,
  prefilledData,
  selectedIngredients,
  onUpdateIngredients,
}: AddRecipePageProps) {
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [cookingTime, setCookingTime] = useState("") // In minutes
  const [selectedCategory, setSelectedCategory] = useState("")
  const [steps, setSteps] = useState([""])
  const [servings, setServings] = useState("1")
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null)
  const [recipeImagePreview, setRecipeImagePreview] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categories = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Beverage"]

  useEffect(() => {
    if (prefilledData) {
      setRecipeName(prefilledData.mealName)
      setDescription(prefilledData.notes || "")
      setServings(prefilledData.portion || "1")
      if (prefilledData.imageUrl) {
        setRecipeImagePreview(prefilledData.imageUrl) // Allow pre-filled image, but no file
        setRecipeImageFile(null); // Ensure no old file is lingering
      }


      const categoryMap: { [key: string]: string } = {
        Breakfast: "Breakfast",
        Lunch: "Lunch",
        Dinner: "Dinner",
        Snack: "Snack",
      }
      setSelectedCategory(categoryMap[prefilledData.mealTime] || "")
      onUpdateIngredients(prefilledData.selectedIngredients || [])

      const basicSteps = ["Prepare all ingredients as listed."];
      if (prefilledData.notes) {
        basicSteps.push(`Notes from consumed meal: ${prefilledData.notes}`);
      }
      basicSteps.push("Combine ingredients as desired.", "Cook accordingly.", "Serve and enjoy!");
      setSteps(basicSteps);
    }
  }, [prefilledData, onUpdateIngredients])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setRecipeImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setRecipeImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setRecipeImageFile(null)
      // Do not clear preview if it was from prefilledData and no new file selected
      if (!prefilledData?.imageUrl || recipeImageFile) { // Clears only if it wasn't prefilled or if a file was previously selected by user
          setRecipeImagePreview(null);
      }
    }
  }

  const removeIngredient = (index: number) => {
    const newIngredients = selectedIngredients.filter((_, i) => i !== index)
    onUpdateIngredients(newIngredients)
  }

  const updateIngredientAmount = (index: number, amount: string) => {
    const newIngredients = [...selectedIngredients]
    newIngredients[index] = { ...newIngredients[index], amount }
    // IMPORTANT: If nutritional values (calories, protein etc.) stored in the ingredient object
    // are 'per unit' and need to be recalculated based on the new 'amount',
    // that logic should happen here before calling onUpdateIngredients.
    // For simplicity, assuming 'amount' is just descriptive or values are already total.
    onUpdateIngredients(newIngredients)
  }

  const addStep = () => {
    setSteps([...steps, ""])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) { // Keep at least one step
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = value
    setSteps(newSteps)
  }

  const validateForm = () : boolean => {
    if (!recipeName.trim()) {
        setErrorMessage("Recipe name is required.");
        return false;
    }
    if (!selectedCategory) {
        setErrorMessage("Please select a category.");
        return false;
    }
     if (selectedIngredients.length === 0) {
        setErrorMessage("Please add at least one ingredient.");
        return false;
    }
    if (!steps.some(step => step.trim() !== "")) { // Check if at least one step is non-empty
        setErrorMessage("Please provide at least one valid instruction step.");
        return false;
    }
    if (Number(cookingTime) < 0) {
        setErrorMessage("Cooking time cannot be negative.");
        return false;
    }
    if (Number(servings) <= 0) {
        setErrorMessage("Servings must be greater than zero.");
        return false;
    }
    setErrorMessage(null); // Clear previous error if validation passes
    return true;
  }


  const handleSaveRecipe = async () => {
    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setErrorMessage("Authentication required. Please log in.");
      setIsSubmitting(false);
      // Optionally, trigger a redirect to login page here
      return;
    }

    // Ensure selectedIngredients have all necessary fields for the backend
    const processedIngredients = selectedIngredients.map(ing => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      image: ing.image || '',
      category: ing.category || '',
      calories: ing.calories || 0,
      protein: ing.protein || 0,
      fat: ing.fat || 0,
      carbs: ing.carbs || 0,
      // Add other nutritional fields if your backend expects them
    }));

    const recipePayload = {
      recipeName: recipeName.trim(),
      description: description.trim(),
      cookingTime: cookingTime || "0",
      category: selectedCategory,
      servings: servings || "1",
      ingredients: processedIngredients,
      steps: steps.map(s => s.trim()).filter((step) => step !== ""),
      createdFrom: prefilledData ? "consumed-menu" : "manual",
      // If an image was prefilled AND no new file selected, send its URL
      imageUrl: !recipeImageFile && recipeImagePreview ? recipeImagePreview : undefined,
    }

    const formData = new FormData()
    formData.append("recipeData", JSON.stringify(recipePayload))

    if (recipeImageFile) {
      formData.append("recipeImageFile", recipeImageFile)
    }

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/add`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data' is set automatically by browser with FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unexpected error occurred on the server." }));
        if (response.status === 401) {
          localStorage.removeItem('firebaseIdToken'); // Clear token
          localStorage.removeItem('currentUser'); // Clear user session data
          setErrorMessage("Session expired or invalid. Please log in again.");
          // Potentially navigate to login: onNavigateToLogin?.();
        } else {
          setErrorMessage(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // const result = await response.json(); // Process success result if needed
      // console.log("Recipe saved successfully!", result);

      // Clear form or navigate away
      if (onNavigateToRecipes) {
        onNavigateToRecipes();
      } else if (onNavigateBack) {
        onNavigateBack();
      }
      // Optionally clear form fields here if not navigating away
      // setRecipeName(''); setDescription(''); ... etc.

    } catch (error) {
      console.error("Failed to save recipe:", error);
      if (!errorMessage) { // Avoid overwriting a more specific error from response.json()
          setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred while saving.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onNavigateBack} disabled={isSubmitting} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{prefilledData ? "Create from Meal" : "Add New Recipe"}</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {prefilledData && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-4">
            <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
              ✨ Pre-filled from consumed meal: "{prefilledData.mealName}"
            </p>
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="px-4 pb-32 space-y-6"> {/* Increased pb for fixed bottom section */}
        {/* Recipe Image Upload */}
        <div>
            <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Recipe Photo (Optional)</label>
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
            {recipeImagePreview ? (
                <img src={recipeImagePreview} alt="Recipe preview" className="w-full h-full object-cover" />
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-2" />
                    <p className="text-sm">Tap to add photo</p>
                </div>
            )}
            <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isSubmitting}
                aria-label="Upload recipe photo"
            />
            </div>
            {recipeImagePreview && (
                 <Button variant="link" onClick={() => {setRecipeImageFile(null); setRecipeImagePreview(prefilledData?.imageUrl || null);}} className="mt-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" disabled={isSubmitting}>
                    {recipeImageFile ? "Clear Selected Image" : (prefilledData?.imageUrl && recipeImagePreview === prefilledData.imageUrl ? "Keep Original / Select New" : "Remove Preview")}
                </Button>
            )}
        </div>


        {/* Recipe Name */}
        <div>
          <label htmlFor="recipeName" className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Recipe Name</label>
          <Input
            id="recipeName"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g., Classic Pancakes"
            className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Description (Optional)</label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary of your recipe..."
            className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg min-h-[80px] focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            disabled={isSubmitting}
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                    : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
                onClick={() => setSelectedCategory(category)}
                disabled={isSubmitting}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Cooking Time */}
            <div>
            <label htmlFor="cookingTime" className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Cook Time (min)</label>
            <Input
                id="cookingTime"
                type="number"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="e.g., 30"
                className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                min="0"
                disabled={isSubmitting}
            />
            </div>

            {/* Servings */}
            <div>
            <label htmlFor="servings" className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Servings</label>
            <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="e.g., 4"
                className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                min="1"
                disabled={isSubmitting}
            />
            </div>
        </div>


        {/* Ingredients */}
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Ingredients</label>
          <div className="space-y-3">
            {selectedIngredients.length > 0 ? selectedIngredients.map((ingredient, index) => (
              <div key={ingredient.id || `ing-${index}`} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                  {ingredient.image ? (
                    <img src={ingredient.image} alt={ingredient.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><ImageIcon size={24}/></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm truncate" title={ingredient.name}>{ingredient.name}</h4>
                  {ingredient.category && <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">{ingredient.category}</p>}
                  <Input
                    value={ingredient.amount || ""}
                    onChange={(e) => updateIngredientAmount(index, e.target.value)}
                    placeholder="Amount (e.g., 1 cup)"
                    className="bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded text-xs mt-1 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  variant="ghost" size="icon" onClick={() => removeIngredient(index)}
                  className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  disabled={isSubmitting} aria-label="Remove ingredient"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            )) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">No ingredients added yet.</p>
            )}
            <Button
              variant="outline"
              onClick={onNavigateToIngredients}
              className="w-full border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:text-gray-900 transition-colors"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Instructions</label>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-gray-800 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-1 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 flex items-start gap-2">
                  <Textarea
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder={`Step ${index + 1} details...`}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg min-h-[70px] flex-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    disabled={isSubmitting}
                    rows={2}
                  />
                  {steps.length > 1 && ( // Only show remove button if more than one step
                    <Button
                      variant="ghost" size="icon" onClick={() => removeStep(index)}
                      className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 mt-1"
                      disabled={isSubmitting} aria-label="Remove step"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addStep} className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" />
              Add Another Step
            </Button>
          </div>
        </div>

        {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Oops! </strong>
                <span className="block sm:inline">{errorMessage}</span>
            </div>
        )}
      </div>

      {/* Fixed Bottom Section for Save Button & Navigation */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-sm mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
         <div className="px-4 py-3">
            <Button
                onClick={handleSaveRecipe}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl py-3 text-base font-semibold transition-colors"
                disabled={isSubmitting}
            >
                {isSubmitting ? "Saving Recipe..." : (prefilledData ? "Create Recipe" : "Save Recipe")}
            </Button>
         </div>
        {/* Bottom Navigation (Adjust active state based on actual router/navigation state if available) */}
        <div className="flex justify-around py-1.5 border-t border-gray-200 dark:border-gray-600">
            {[
                { label: "Home", icon: Home, action: onNavigateToHome, active: false },
                { label: "Add", icon: Plus, action: () => {}, active: true }, // Current page
                { label: "Recipes", icon: Book, action: onNavigateToRecipes, active: false },
            ].map((item) => (
                <div
                    key={item.label}
                    className={`flex flex-col items-center py-1 px-3 rounded-md cursor-pointer transition-colors ${
                        item.active
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={item.active ? undefined : item.action} // Prevent action if already active
                    aria-current={item.active ? "page" : undefined}
                >
                <item.icon className={`w-5 h-5 mb-0.5 ${item.active ? "" : ""}`} />
                <span className={`text-xs font-medium`}>{item.label}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}