import gleam/option.{type Option}

pub type Profile {
  Profile(
    user_id: String,
    name_: String,
    age: Int,
    gender: String,
    height_cm: Int,
    weight_kg: Int,
    goal: String,
    place: String,
    experience: String,
    diet: String,
    days_per_week: Int,
    budget_per_day: Int,
    health_conditions: List(String),
    bmi: Option(Float),
  )
}

pub type User {
  User(uuid: String, cf_sub: String, name_: String)
}

pub type DailyLog {
  DailyLog(
    sleep: Int,
    steps: Int,
    protein_g: Int,
    workout_done: Bool,
    weight_kg: Option(Float),
  )
}

pub type MealItem {
  MealItem(name: String, items: String, kcal: Int, protein: Int)
}

pub type WorkoutExercise {
  WorkoutExercise(
    name: String,
    sets: Int,
    reps: String,
    rest: String,
    muscles: List(String),
    tips: String,
    alt: String,
  )
}

pub type WorkoutDay {
  WorkoutDay(title: String, focus: String, exercises: List(WorkoutExercise))
}

pub type AIPlanTable {
  MealPlans
  WorkoutPlans
  BmiAdvice
  SleepAdvice
  InjuryAdvice
  FormAdvice
}

pub fn table_name(t: AIPlanTable) -> String {
  case t {
    MealPlans -> "meal_plans"
    WorkoutPlans -> "workout_plans"
    BmiAdvice -> "bmi_advice"
    SleepAdvice -> "sleep_advice"
    InjuryAdvice -> "injury_advice"
    FormAdvice -> "form_advice"
  }
}

pub fn all_tables() -> List(AIPlanTable) {
  [MealPlans, WorkoutPlans, BmiAdvice, SleepAdvice, InjuryAdvice, FormAdvice]
}
