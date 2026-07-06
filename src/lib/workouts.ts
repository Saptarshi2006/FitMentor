import type { Profile } from "./profile";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscles: string[];
  tips: string;
  alt?: string;
}

export interface WorkoutDay {
  title: string;
  focus: string;
  exercises: Exercise[];
}

// Curated beginner-friendly templates per goal + place.
const GYM_PPL: WorkoutDay[] = [
  {
    title: "Push Day",
    focus: "Chest • Shoulders • Triceps",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6–8", rest: "90s", muscles: ["Chest", "Triceps"], tips: "Squeeze your shoulder blades and lower the bar to mid-chest.", alt: "Dumbbell Bench Press" },
      { name: "Shoulder Press (DB)", sets: 3, reps: "8–10", rest: "75s", muscles: ["Shoulders"], tips: "Don't flare elbows past 45°.", alt: "Machine Shoulder Press" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8–10", rest: "75s", muscles: ["Upper Chest"], tips: "Bench at 30°, full range." },
      { name: "Lateral Raises", sets: 3, reps: "12–15", rest: "60s", muscles: ["Side Delts"], tips: "Lead with elbows, control the negative." },
      { name: "Triceps Rope Pushdown", sets: 3, reps: "10–12", rest: "60s", muscles: ["Triceps"], tips: "Lock elbows to your sides." },
    ],
  },
  {
    title: "Pull Day",
    focus: "Back • Biceps",
    exercises: [
      { name: "Deadlift", sets: 3, reps: "5", rest: "120s", muscles: ["Back", "Glutes", "Hams"], tips: "Brace your core, bar close to shins.", alt: "Romanian Deadlift" },
      { name: "Pull-ups (or Lat Pulldown)", sets: 4, reps: "6–10", rest: "90s", muscles: ["Lats"], tips: "Pull elbows down and back, not just hands." },
      { name: "Barbell Row", sets: 3, reps: "8", rest: "90s", muscles: ["Mid Back"], tips: "Hinge 45°, pull to belly button." },
      { name: "Face Pulls", sets: 3, reps: "12–15", rest: "60s", muscles: ["Rear Delts"], tips: "External rotation at the top." },
      { name: "Barbell Curl", sets: 3, reps: "10", rest: "60s", muscles: ["Biceps"], tips: "No swinging — strict form." },
    ],
  },
  {
    title: "Leg Day",
    focus: "Quads • Hamstrings • Glutes",
    exercises: [
      { name: "Back Squat", sets: 4, reps: "6–8", rest: "120s", muscles: ["Quads", "Glutes"], tips: "Knees track over toes, depth at parallel.", alt: "Goblet Squat" },
      { name: "Romanian Deadlift", sets: 3, reps: "8–10", rest: "90s", muscles: ["Hamstrings", "Glutes"], tips: "Soft knees, push hips back." },
      { name: "Walking Lunges", sets: 3, reps: "12 each", rest: "75s", muscles: ["Quads", "Glutes"], tips: "Long stride, drive through front heel." },
      { name: "Leg Curl", sets: 3, reps: "10–12", rest: "60s", muscles: ["Hamstrings"], tips: "Slow eccentric." },
      { name: "Standing Calf Raise", sets: 4, reps: "12–15", rest: "45s", muscles: ["Calves"], tips: "Full stretch at the bottom." },
    ],
  },
];

const HOME_FULL: WorkoutDay[] = [
  {
    title: "Full Body A",
    focus: "Push • Legs • Core",
    exercises: [
      { name: "Push-ups", sets: 4, reps: "8–15", rest: "60s", muscles: ["Chest", "Triceps"], tips: "Body in a straight line — no sagging hips.", alt: "Knee Push-ups" },
      { name: "Bodyweight Squat", sets: 4, reps: "15–20", rest: "60s", muscles: ["Quads", "Glutes"], tips: "Sit back like into a chair." },
      { name: "Pike Push-ups", sets: 3, reps: "8–10", rest: "60s", muscles: ["Shoulders"], tips: "Hips high, head between hands." },
      { name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", muscles: ["Glutes"], tips: "Squeeze hard at the top for 1 sec." },
      { name: "Plank", sets: 3, reps: "30–45s", rest: "45s", muscles: ["Core"], tips: "Brace abs — don't let hips drop." },
    ],
  },
  {
    title: "Full Body B",
    focus: "Pull • Legs • Core",
    exercises: [
      { name: "Backpack Rows (or Door Rows)", sets: 4, reps: "10–12", rest: "60s", muscles: ["Back", "Biceps"], tips: "Squeeze shoulder blades together." },
      { name: "Reverse Lunges", sets: 3, reps: "10 each", rest: "60s", muscles: ["Quads", "Glutes"], tips: "Long step back, knee just above floor." },
      { name: "Superman Hold", sets: 3, reps: "20s", rest: "45s", muscles: ["Lower Back"], tips: "Lift arms and legs together." },
      { name: "Diamond Push-ups", sets: 3, reps: "6–10", rest: "60s", muscles: ["Triceps", "Chest"], tips: "Hands form a triangle." },
      { name: "Mountain Climbers", sets: 3, reps: "30s", rest: "30s", muscles: ["Core", "Cardio"], tips: "Fast knees, stable shoulders." },
    ],
  },
  {
    title: "Active Recovery",
    focus: "Mobility • Light Cardio",
    exercises: [
      { name: "Brisk Walk", sets: 1, reps: "25 min", rest: "—", muscles: ["Cardio"], tips: "Aim for ~120 bpm pace." },
      { name: "Cat-Cow", sets: 2, reps: "10", rest: "30s", muscles: ["Spine"], tips: "Slow, breathing with the motion." },
      { name: "World's Greatest Stretch", sets: 2, reps: "5 each", rest: "30s", muscles: ["Hips", "T-spine"], tips: "Reach long through the back leg." },
    ],
  },
];

export function generateWorkoutPlan(p: Profile): WorkoutDay[] {
  const base = p.place === "gym" ? GYM_PPL : HOME_FULL;
  const days = Math.max(3, Math.min(6, p.daysPerWeek));
  const plan: WorkoutDay[] = [];
  for (let i = 0; i < days; i++) plan.push(base[i % base.length]);
  return plan;
}

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