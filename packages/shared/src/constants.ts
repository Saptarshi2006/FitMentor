import type { Goal, MealPlan } from "./types";

export const GOAL_LABEL: Record<Goal, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  recomp: "Body Recomp",
  general: "Stay Fit",
};

export const INDIAN_MEAL_PLANS: MealPlan[] = [
  {
    id: "veg-100",
    title: "Hostel Veg • ₹100/day",
    budgetPerDay: 100,
    diet: "veg",
    meals: [
      { name: "Breakfast", items: "3 boiled eggs + 2 bananas + black coffee", kcal: 380, protein: 24 },
      { name: "Lunch", items: "Dal + 3 rotis + sabzi + curd", kcal: 650, protein: 28 },
      { name: "Snack", items: "Roasted chana 50g + milk 250ml", kcal: 320, protein: 18 },
      { name: "Dinner", items: "Rajma + rice + salad", kcal: 600, protein: 22 },
    ],
  },
  {
    id: "veg-150",
    title: "Veg Balanced • ₹150/day",
    budgetPerDay: 150,
    diet: "veg",
    meals: [
      { name: "Breakfast", items: "Oats 60g + milk + 1 scoop peanut butter + banana", kcal: 520, protein: 22 },
      { name: "Lunch", items: "Paneer bhurji + 3 rotis + dal + salad", kcal: 720, protein: 38 },
      { name: "Snack", items: "Sprouts chaat + curd", kcal: 280, protein: 18 },
      { name: "Dinner", items: "Soya chunks curry + rice + veggies", kcal: 600, protein: 36 },
    ],
  },
  {
    id: "nonveg-150",
    title: "Non-Veg Lean • ₹150/day",
    budgetPerDay: 150,
    diet: "nonveg",
    meals: [
      { name: "Breakfast", items: "4 egg whites + 2 whole eggs + 2 rotis", kcal: 460, protein: 36 },
      { name: "Lunch", items: "Chicken curry 150g + rice + dal", kcal: 750, protein: 48 },
      { name: "Snack", items: "Milk 300ml + 1 apple", kcal: 260, protein: 12 },
      { name: "Dinner", items: "Egg bhurji + 3 rotis + sabzi", kcal: 580, protein: 32 },
    ],
  },
  {
    id: "nonveg-200",
    title: "Muscle Builder • ₹200/day",
    budgetPerDay: 200,
    diet: "nonveg",
    meals: [
      { name: "Breakfast", items: "5 eggs + 3 rotis + peanut butter", kcal: 720, protein: 44 },
      { name: "Lunch", items: "Chicken 200g + rice + dal + curd", kcal: 900, protein: 60 },
      { name: "Snack", items: "Milk shake + banana + oats", kcal: 480, protein: 22 },
      { name: "Dinner", items: "Fish curry + 2 rotis + sabzi", kcal: 620, protein: 42 },
    ],
  },
];

export const COMMON_FOODS = [
  { name: "Roti (1)", kcal: 100, protein: 3 },
  { name: "Rice (1 cup)", kcal: 200, protein: 4 },
  { name: "Dal (1 katori)", kcal: 150, protein: 9 },
  { name: "Egg (1 whole)", kcal: 75, protein: 6 },
  { name: "Paneer (100g)", kcal: 260, protein: 18 },
  { name: "Milk (250ml)", kcal: 150, protein: 8 },
  { name: "Chicken breast (100g)", kcal: 165, protein: 31 },
  { name: "Fish (100g)", kcal: 130, protein: 22 },
  { name: "Soya chunks (50g dry)", kcal: 170, protein: 26 },
  { name: "Oats (50g)", kcal: 190, protein: 7 },
  { name: "Banana (1)", kcal: 100, protein: 1 },
  { name: "Peanut butter (1 tbsp)", kcal: 95, protein: 4 },
];

export const EXERCISE_LIBRARY: { name: string; emoji: string; muscles: string[]; tips: string; mistakes: string }[] = [
  { name: "Bench Press", emoji: "🏋️", muscles: ["Chest", "Triceps", "Shoulders"], tips: "Feet planted, slight arch, bar to mid-chest.", mistakes: "Bouncing the bar off your chest." },
  { name: "Back Squat", emoji: "🦵", muscles: ["Quads", "Glutes", "Core"], tips: "Brace core, descend with control, drive through heels.", mistakes: "Knees caving inward." },
  { name: "Deadlift", emoji: "💪", muscles: ["Back", "Hamstrings", "Glutes"], tips: "Bar close to body, neutral spine, push the floor away.", mistakes: "Rounding lower back." },
  { name: "Pull-up", emoji: "🤸", muscles: ["Lats", "Biceps"], tips: "Full hang, pull chest to bar.", mistakes: "Kipping without control." },
  { name: "Push-up", emoji: "🙌", muscles: ["Chest", "Triceps", "Core"], tips: "Body in a line, elbows ~45°.", mistakes: "Hips sagging." },
  { name: "Shoulder Press", emoji: "🪖", muscles: ["Shoulders", "Triceps"], tips: "Press straight up, ribs down.", mistakes: "Overarching lower back." },
  { name: "Barbell Row", emoji: "🚣", muscles: ["Back", "Biceps"], tips: "Hinge 45°, pull to belly button.", mistakes: "Jerking with momentum." },
  { name: "Walking Lunges", emoji: "🚶", muscles: ["Quads", "Glutes"], tips: "Long stride, upright torso.", mistakes: "Front knee shooting forward." },
  { name: "Plank", emoji: "🧘", muscles: ["Core"], tips: "Squeeze glutes and abs, neutral neck.", mistakes: "Holding breath." },
  { name: "Lat Pulldown", emoji: "⬇️", muscles: ["Lats"], tips: "Pull bar to upper chest, elbows down.", mistakes: "Leaning way back." },
  { name: "Bicep Curl", emoji: "💪", muscles: ["Biceps"], tips: "Elbows pinned, full ROM.", mistakes: "Swinging the weight." },
  { name: "Tricep Pushdown", emoji: "📐", muscles: ["Triceps"], tips: "Lock elbows to sides.", mistakes: "Flaring elbows out." },
  { name: "Leg Press", emoji: "🦿", muscles: ["Quads", "Glutes"], tips: "Don't lock knees at top.", mistakes: "Half reps." },
  { name: "Lateral Raise", emoji: "🦅", muscles: ["Side Delts"], tips: "Lead with elbows, slight bend.", mistakes: "Using too much weight." },
  { name: "Romanian Deadlift", emoji: "🏋️", muscles: ["Hamstrings", "Glutes"], tips: "Push hips back, soft knees.", mistakes: "Squatting instead of hinging." },
  { name: "Face Pull", emoji: "🪢", muscles: ["Rear Delts", "Upper Back"], tips: "Pull to forehead, external rotation.", mistakes: "Using arms only." },
];
