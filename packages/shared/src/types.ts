export type Gender = "male" | "female" | "other";
export type Goal = "fat_loss" | "muscle_gain" | "strength" | "recomp" | "general";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Diet = "veg" | "nonveg" | "egg";
export type Place = "gym" | "home";
export type Theme = "light" | "dark";
export type PlanTier = "free" | "premium" | "pro";

export interface Profile {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  place: Place;
  experience: Experience;
  diet: Diet;
  daysPerWeek: number;
  budgetPerDay: number;
  healthConditions: string[];
  createdAt: string;
}

export interface DailyLog {
  date: string;
  water: number;
  sleep: number;
  steps: number;
  proteinG: number;
  workoutDone: boolean;
  weightKg?: number;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscles: string[];
  tips: string;
  alt?: string;
  emoji?: string;
  mistakes?: string;
}

export interface WorkoutDay {
  title: string;
  focus: string;
  exercises: Exercise[];
}

export interface Meal {
  name: string;
  items: string;
  kcal: number;
  protein: number;
}

export interface MealPlan {
  id: string;
  title: string;
  budgetPerDay: number;
  diet: "veg" | "nonveg";
  meals: Meal[];
}

export interface Subscription {
  tier: PlanTier;
  startDate: string;
  expiryDate: string;
  paymentMethod?: string;
}
