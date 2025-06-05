"use client"

import { ChevronLeft, Plus, Minus, Camera, Home, Book, Upload, Image as ImageIcon, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, ChangeEvent } from "react"

// No longer using the detailed Ingredient interface for input here
// interface Ingredient {
//   id: string; 
//   name: string;
//   amount: string; 
//   // ... other fields
// }

interface AddRecipePageProps {
  onNavigateBack?: () => void;
  onNavigateToHome: () => void;
  onNavigateToRecipes: () => void;
  // onNavigateToIngredients: () => void; // REMOVED: Ingredients are now direct string inputs
  prefilledData?: {
    mealName: string;
    portion: string; 
    notes: string;
    mealTime: string;
    // Assuming selectedIngredients from prefill might still be structured, we'll extract names.
    selectedIngredients: Array<{ id: string; name: string; amount: string; [key: string]: any }>; 
    imageUrl?: string;
  } | null;
  // selectedIngredients and onUpdateIngredients will now handle string[]
  selectedIngredients: string[]; 
  onUpdateIngredients: (ingredients: string[]) => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL)
                      || "http://localhost:5000"; // Ensure this points to your Flask server

export default function AddRecipePage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  // onNavigateToIngredients, // REMOVED
  prefilledData,
  selectedIngredients, // Now expects string[]
  onUpdateIngredients, // Now expects (ingredients: string[]) => void
}: AddRecipePageProps) {
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [cookingTime, setCookingTime] = useState("") // In minutes
  const [selectedCategory, setSelectedCategory] = useState("")
  const [steps, setSteps] = useState([""]) // Keep steps as string array
  const [servings, setServings] = useState("1")
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null)
  const [recipeImagePreview, setRecipeImagePreview] = useState<string | null>(null)

  // State for Nutrition Facts
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [fat, setFat] = useState("")
  const [carbs, setCarbs] = useState("")
  const [cholesterol, setCholesterol] = useState("")
  const [sodium, setSodium] = useState("")
  const [potassium, setPotassium] = useState("")
  const [iron, setIron] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categories = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Beverage", "Side Dish", "Appetizer", "Soup", "Salad", "Other"]

  useEffect(() => {
    if (prefilledData) {
      setRecipeName(prefilledData.mealName || "");
      setDescription(prefilledData.notes || "");
      setServings(prefilledData.portion || "1");
      if (prefilledData.imageUrl) {
        setRecipeImagePreview(prefilledData.imageUrl);
        setRecipeImageFile(null);
      }

      const categoryMap: { [key: string]: string } = {
        Breakfast: "Breakfast", Lunch: "Lunch", Dinner: "Dinner", Snack: "Snack",
      };
      setSelectedCategory(categoryMap[prefilledData.mealTime] || "");
      
      // Convert prefilled structured ingredients to simple strings (name + amount)
      const prefilledStringIngredients = prefilledData.selectedIngredients?.map(
        ing => `${ing.amount || ''} ${ing.name}`.trim()
      ).filter(name => name) || [];
      onUpdateIngredients(prefilledStringIngredients);

      const basicSteps = ["Prepare all ingredients as listed."];
      if (prefilledData.notes) {
        basicSteps.push(`Notes from consumed meal: ${prefilledData.notes}`);
      }
      basicSteps.push("Combine ingredients as desired.", "Cook accordingly.", "Serve and enjoy!");
      setSteps(basicSteps);
      
      // Clear manual nutrition fields when prefilling, as they are not part of prefilledData usually
      setCalories(""); setProtein(""); setFat(""); setCarbs("");
      setCholesterol(""); setSodium(""); setPotassium(""); setIron("");

    } else {
        // If not prefilling, ensure ingredients are based on the prop (could be empty from parent)
        onUpdateIngredients(selectedIngredients || []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledData]); // onUpdateIngredients might cause loop if not stable, but usually fine from parent.

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
      setRecipeImagePreview(prefilledData?.imageUrl || null); // Revert to prefilled if exists, else null
    }
  }

  // --- Ingredient String Management ---
  const addIngredientString = () => {
    onUpdateIngredients([...selectedIngredients, ""]);
  };

  const updateIngredientString = (index: number, value: string) => {
    const newIngredients = [...selectedIngredients];
    newIngredients[index] = value;
    onUpdateIngredients(newIngredients);
  };

  const removeIngredientString = (index: number) => {
    const newIngredients = selectedIngredients.filter((_, i) => i !== index);
    onUpdateIngredients(newIngredients);
  };
  // --- End Ingredient String Management ---

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const validateForm = () : boolean => {
    if (!recipeName.trim()) { setErrorMessage("Recipe name is required."); return false; }
    if (!selectedCategory) { setErrorMessage("Please select a category."); return false; }
    if (!selectedIngredients.some(ing => ing.trim() !== "")) { setErrorMessage("Please add at least one valid ingredient."); return false; }
    if (!steps.some(step => step.trim() !== "")) { setErrorMessage("Please provide at least one valid instruction step."); return false; }
    
    const numericFields = [
        { value: cookingTime, name: "Cooking time", nonNegative: true },
        { value: servings, name: "Servings", positive: true },
        { value: calories, name: "Calories", nonNegative: true, optional: true },
        { value: protein, name: "Protein", nonNegative: true, optional: true },
        { value: fat, name: "Fat", nonNegative: true, optional: true },
        { value: carbs, name: "Carbohydrates", nonNegative: true, optional: true },
        { value: cholesterol, name: "Cholesterol", nonNegative: true, optional: true },
        { value: sodium, name: "Sodium", nonNegative: true, optional: true },
        { value: potassium, name: "Potassium", nonNegative: true, optional: true },
        { value: iron, name: "Iron", nonNegative: true, optional: true },
    ];

    for (const field of numericFields) {
        if (field.value.trim() !== "" || !field.optional) { // Validate if not empty or not optional
            const numValue = Number(field.value);
            if (isNaN(numValue)) {
                setErrorMessage(`${field.name} must be a valid number.`); return false;
            }
            if (field.nonNegative && numValue < 0) {
                setErrorMessage(`${field.name} cannot be negative.`); return false;
            }
            if (field.positive && numValue <= 0) {
                setErrorMessage(`${field.name} must be greater than zero.`); return false;
            }
        }
    }

    setErrorMessage(null);
    return true;
  }

  const handleSaveRecipe = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setErrorMessage("Authentication required. Please log in.");
      setIsSubmitting(false);
      return;
    }

    const recipePayload = {
      recipeName: recipeName.trim(),
      description: description.trim(),
      cookingTime: cookingTime.trim() || "0",
      category: selectedCategory,
      servings: servings.trim() || "1",
      ingredients: selectedIngredients.map(s => s.trim()).filter(s => s !== ""), // Array of strings
      steps: steps.map(s => s.trim()).filter(s => s !== ""),
      createdFrom: prefilledData ? "consumed-menu" : "manual",
      imageUrl: !recipeImageFile && recipeImagePreview ? recipeImagePreview : undefined,
      // Nutrition Facts (send as numbers, or null if empty; backend should handle type conversion)
      calories: calories.trim() ? Number(calories) : null,
      protein: protein.trim() ? Number(protein) : null,
      fat: fat.trim() ? Number(fat) : null,
      carbs: carbs.trim() ? Number(carbs) : null,
      cholesterol: cholesterol.trim() ? Number(cholesterol) : null,
      sodium: sodium.trim() ? Number(sodium) : null,
      potassium: potassium.trim() ? Number(potassium) : null,
      iron: iron.trim() ? Number(iron) : null,
    };

    const formData = new FormData();
    formData.append("recipeData", JSON.stringify(recipePayload));
    if (recipeImageFile) {
      formData.append("recipeImageFile", recipeImageFile);
    }

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/add`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Server error." }));
        setErrorMessage(errorData.error || `Error ${response.status}`);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      // const result = await response.json();
      // console.log("Recipe saved:", result);
      onNavigateToRecipes(); // Navigate to recipes list on success
    } catch (error) {
      console.error("Failed to save recipe:", error);
      if (!errorMessage) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save recipe.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nutritionFields = [
    {label: "Calories (kcal)", state: calories, setState: setCalories, placeholder: "e.g., 350"},
    {label: "Protein (g)", state: protein, setState: setProtein, placeholder: "e.g., 20"},
    {label: "Fat (g)", state: fat, setState: setFat, placeholder: "e.g., 15"},
    {label: "Carbohydrates (g)", state: carbs, setState: setCarbs, placeholder: "e.g., 40"},
    {label: "Cholesterol (mg)", state: cholesterol, setState: setCholesterol, placeholder: "e.g., 70", optional: true},
    {label: "Sodium (mg)", state: sodium, setState: setSodium, placeholder: "e.g., 500", optional: true},
    {label: "Potassium (mg)", state: potassium, setState: setPotassium, placeholder: "e.g., 300", optional: true},
    {label: "Iron (mg)", state: iron, setState: setIron, placeholder: "e.g., 2.5", optional: true},
  ];

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
      <div className="px-4 pb-32 space-y-6">
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
              type="file" accept="image/*" onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isSubmitting} aria-label="Upload recipe photo"
            />
          </div>
          {recipeImagePreview && (
            <Button variant="link" onClick={() => {setRecipeImageFile(null); setRecipeImagePreview(prefilledData?.imageUrl || null);}} className="mt-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" disabled={isSubmitting}>
              {recipeImageFile ? "Clear New Image" : (prefilledData?.imageUrl && recipeImagePreview === prefilledData.imageUrl ? "Change Image" : "Remove Preview")}
            </Button>
          )}
        </div>

        {/* Recipe Name, Description, Category, Time, Servings */}
        <div>
          <label htmlFor="recipeName" className="block text-gray-800 dark:text-gray-200 font-semibold mb-1">Recipe Name</label>
          <Input id="recipeName" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="e.g., Classic Pancakes" className="bg-gray-50 dark:bg-gray-700 rounded-lg" disabled={isSubmitting} required />
        </div>
        <div>
          <label htmlFor="description" className="block text-gray-800 dark:text-gray-200 font-semibold mb-1">Description (Optional)</label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short summary..." className="bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[80px]" disabled={isSubmitting} />
        </div>
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button key={category} variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${ selectedCategory === category ? "bg-blue-600 dark:bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                onClick={() => setSelectedCategory(category)} disabled={isSubmitting}
              >{category}</Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cookingTime" className="block text-gray-800 dark:text-gray-200 font-semibold mb-1">Cook Time (min)</label>
            <Input id="cookingTime" type="number" value={cookingTime} onChange={(e) => setCookingTime(e.target.value)} placeholder="e.g., 30" className="bg-gray-50 dark:bg-gray-700 rounded-lg" min="0" disabled={isSubmitting}/>
          </div>
          <div>
            <label htmlFor="servings" className="block text-gray-800 dark:text-gray-200 font-semibold mb-1">Servings</label>
            <Input id="servings" type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="e.g., 4" className="bg-gray-50 dark:bg-gray-700 rounded-lg" min="1" disabled={isSubmitting}/>
          </div>
        </div>

        {/* Ingredients (String Input) */}
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Ingredients</label>
          <div className="space-y-3">
            {selectedIngredients.map((ingredientStr, index) => (
              <div key={`ing-str-${index}`} className="flex items-center gap-2">
                <Input
                  value={ingredientStr}
                  onChange={(e) => updateIngredientString(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1} (e.g., "1 cup flour", "2 eggs")`}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg flex-1"
                  disabled={isSubmitting}
                />
                <Button variant="ghost" size="icon" onClick={() => removeIngredientString(index)} disabled={isSubmitting} aria-label="Remove ingredient" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addIngredientString} className="w-full border-dashed border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30" disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" /> Add Ingredient
            </Button>
          </div>
        </div>
        
        {/* Nutrition Facts */}
        <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Nutrition Facts (Optional, per serving)</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {nutritionFields.map(field => (
                    <div key={field.label}>
                        <label htmlFor={field.label.toLowerCase().replace(/\s/g, '')} className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            {field.label}
                        </label>
                        <Input
                            type="number"
                            id={field.label.toLowerCase().replace(/\s/g, '')}
                            value={field.state}
                            onChange={(e) => field.setState(e.target.value)}
                            placeholder={field.placeholder}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                            min="0"
                            step="any" // Allows decimals
                            disabled={isSubmitting}
                        />
                    </div>
                ))}
            </div>
        </div>


        {/* Steps */}
        <div>
          <label className="block text-gray-800 dark:text-gray-200 font-semibold mb-2">Instructions</label>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-7 h-7 bg-gray-800 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-2 flex-shrink-0">{index + 1}</div>
                <Textarea value={step} onChange={(e) => updateStep(index, e.target.value)} placeholder={`Step ${index + 1} details...`} className="bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[70px] flex-1" disabled={isSubmitting} rows={2}/>
                {steps.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeStep(index)} disabled={isSubmitting} aria-label="Remove step" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 mt-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addStep} className="w-full border-dashed border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" /> Add Step
            </Button>
          </div>
        </div>

        {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                <AlertCircle size={20} />
                <div>
                    <strong className="font-bold block">Oops!</strong>
                    <span className="block sm:inline text-sm">{errorMessage}</span>
                </div>
            </div>
        )}
      </div>

      {/* Fixed Bottom Section */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-sm mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="px-4 py-3">
          <Button onClick={handleSaveRecipe} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl py-3 text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (prefilledData ? "Create Recipe" : "Save Recipe")}
          </Button>
        </div>
        <div className="flex justify-around py-1.5 border-t border-gray-200 dark:border-gray-600">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add", icon: Plus, action: () => {}, active: true }, 
            { label: "Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
            <div key={item.label}
              className={`flex flex-col items-center py-1 px-3 rounded-md cursor-pointer ${item.active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              onClick={item.active ? undefined : item.action} aria-current={item.active ? "page" : undefined}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
