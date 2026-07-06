// User fitness profile — stored client-side for v1.
// Easy to swap for Lovable Cloud later.

export type Gender = "male" | "female" | "other";
export type Goal = "fat_loss" | "muscle_gain" | "strength" | "recomp" | "general";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Diet = "veg" | "nonveg" | "egg";
export type Place = "gym" | "home";

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
  budgetPerDay: number; // INR
  createdAt: string;
}

const KEY = "fitmentor.profile.v1";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("fitmentor:profile"));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("fitmentor:profile"));
}

// Mifflin-St Jeor BMR + activity multiplier
export function calcBmr(p: Pick<Profile, "weightKg" | "heightCm" | "age" | "gender">) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.gender === "male" ? base + 5 : base - 161;
}

export function calcTdee(p: Profile) {
  // Activity factor scales with workout days
  const factor = 1.35 + Math.min(p.daysPerWeek, 6) * 0.045; // 1.35..1.62
  return Math.round(calcBmr(p) * factor);
}

export function calcTargets(p: Profile) {
  const tdee = calcTdee(p);
  let calories = tdee;
  if (p.goal === "fat_loss") calories = tdee - 400;
  else if (p.goal === "muscle_gain") calories = tdee + 300;
  else if (p.goal === "recomp") calories = tdee - 150;
  // protein g/kg
  const proteinPerKg =
    p.goal === "muscle_gain" || p.goal === "strength" ? 1.8 : p.goal === "fat_loss" ? 2.0 : 1.6;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories: Math.round(calories), protein, carbs, fat, tdee };
}

export const GOAL_LABEL: Record<Goal, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  recomp: "Body Recomp",
  general: "Stay Fit",
};