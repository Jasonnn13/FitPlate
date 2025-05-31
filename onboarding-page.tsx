"use client"

import { ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface OnboardingPageProps {
  onComplete: () => void
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState({
    age: "",
    weight: "",
    height: "",
    activityLevel: "",
    goal: "",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    mealsPerDay: "",
  })

  const steps = [
    {
      title: "Tell us about yourself",
      subtitle: "Help us personalize your experience",
      component: "personal",
    },
    {
      title: "What's your goal?",
      subtitle: "We'll customize your meal recommendations",
      component: "goal",
    },
    {
      title: "Dietary preferences",
      subtitle: "Let us know your food preferences",
      component: "diet",
    },
    {
      title: "Any allergies?",
      subtitle: "We'll make sure to avoid these ingredients",
      component: "allergies",
    },
    {
      title: "Meal planning",
      subtitle: "How many meals do you prefer per day?",
      component: "meals",
    },
  ]

  const activityLevels = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"]
  const goals = ["Lose Weight", "Maintain Weight", "Gain Weight", "Build Muscle", "Improve Health"]
  const dietaryOptions = ["Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo", "Mediterranean", "Low Carb"]
  const allergyOptions = ["Nuts", "Dairy", "Eggs", "Soy", "Gluten", "Shellfish", "Fish", "Sesame"]
  const mealOptions = ["2 meals", "3 meals", "4 meals", "5 meals", "6 meals"]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateData = (field: string, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: string, item: string) => {
    const currentArray = onboardingData[field as keyof typeof onboardingData] as string[]
    const newArray = currentArray.includes(item) ? currentArray.filter((i) => i !== item) : [...currentArray, item]
    updateData(field, newArray)
  }

  const renderStepContent = () => {
    const step = steps[currentStep]

    switch (step.component) {
      case "personal":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-[#000000] font-medium mb-2">Age</label>
              <Input
                type="number"
                value={onboardingData.age}
                onChange={(e) => updateData("age", e.target.value)}
                placeholder="Enter your age"
                className="bg-[#f5f5f5] border-none rounded-lg h-12"
              />
            </div>
            <div>
              <label className="block text-[#000000] font-medium mb-2">Weight (kg)</label>
              <Input
                type="number"
                value={onboardingData.weight}
                onChange={(e) => updateData("weight", e.target.value)}
                placeholder="Enter your weight"
                className="bg-[#f5f5f5] border-none rounded-lg h-12"
              />
            </div>
            <div>
              <label className="block text-[#000000] font-medium mb-2">Height (cm)</label>
              <Input
                type="number"
                value={onboardingData.height}
                onChange={(e) => updateData("height", e.target.value)}
                placeholder="Enter your height"
                className="bg-[#f5f5f5] border-none rounded-lg h-12"
              />
            </div>
            <div>
              <label className="block text-[#000000] font-medium mb-3">Activity Level</label>
              <div className="space-y-2">
                {activityLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => updateData("activityLevel", level)}
                    className={`w-full p-3 rounded-lg text-left ${
                      onboardingData.activityLevel === level ? "bg-[#007aff] text-white" : "bg-[#f5f5f5] text-[#000000]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case "goal":
        return (
          <div className="space-y-3">
            {goals.map((goal) => (
              <button
                key={goal}
                onClick={() => updateData("goal", goal)}
                className={`w-full p-4 rounded-lg text-left ${
                  onboardingData.goal === goal ? "bg-[#007aff] text-white" : "bg-[#f5f5f5] text-[#000000]"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        )

      case "diet":
        return (
          <div className="space-y-3">
            <p className="text-[#787880] text-sm mb-4">Select all that apply (optional)</p>
            {dietaryOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleArrayItem("dietaryPreferences", option)}
                className={`w-full p-3 rounded-lg text-left ${
                  onboardingData.dietaryPreferences.includes(option)
                    ? "bg-[#007aff] text-white"
                    : "bg-[#f5f5f5] text-[#000000]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )

      case "allergies":
        return (
          <div className="space-y-3">
            <p className="text-[#787880] text-sm mb-4">Select all that apply (optional)</p>
            {allergyOptions.map((allergy) => (
              <button
                key={allergy}
                onClick={() => toggleArrayItem("allergies", allergy)}
                className={`w-full p-3 rounded-lg text-left ${
                  onboardingData.allergies.includes(allergy) ? "bg-[#007aff] text-white" : "bg-[#f5f5f5] text-[#000000]"
                }`}
              >
                {allergy}
              </button>
            ))}
          </div>
        )

      case "meals":
        return (
          <div className="space-y-3">
            {mealOptions.map((option) => (
              <button
                key={option}
                onClick={() => updateData("mealsPerDay", option)}
                className={`w-full p-4 rounded-lg text-left ${
                  onboardingData.mealsPerDay === option ? "bg-[#007aff] text-white" : "bg-[#f5f5f5] text-[#000000]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#000000]">FitPlate</h1>
          <span className="text-[#787880] text-sm">
            {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#f5f5f5] rounded-full h-2 mb-6">
          <div
            className="bg-[#007aff] h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-[#000000] mb-2">{steps[currentStep].title}</h2>
          <p className="text-[#787880] text-sm">{steps[currentStep].subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-6">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="px-4 pb-8">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 border-[#e5e5e5] text-[#000000] rounded-2xl py-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-4">
            {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
            {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
