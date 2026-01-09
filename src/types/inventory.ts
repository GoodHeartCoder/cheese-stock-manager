export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
}

export interface FormulaItem {
  ingredientId: string;
  quantityPerBag: number;
}

export interface Formula {
  id: string;
  name: string;
  items: FormulaItem[];
}

export interface ProductionEntry {
  id: string;
  date: string; // ISO date string
  bagsProduced: number;
  formulaId: string;
  formulaName: string;
  ingredientsUsed: {
    ingredientId: string;
    ingredientName: string;
    quantityUsed: number;
    unit: string;
  }[];
}

export interface Bag {
  formulaId: string;
  quantity: number;
}

export interface CookingEntry {
  id: string;
  formulaId: string;
  formulaName: string;
  quantityCooked: number;
  date: string; // ISO date string
}

export interface InventoryState {
  ingredients: Ingredient[];
  formulas: Formula[];
  productionHistory: ProductionEntry[];
  bags: Bag[];
  cookingHistory: CookingEntry[];
}
