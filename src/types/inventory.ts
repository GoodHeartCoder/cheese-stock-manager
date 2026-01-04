export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface FormulaItem {
  ingredientId: string;
  quantityPerBag: number;
}

export interface Formula {
  items: FormulaItem[];
}

export interface ProductionEntry {
  id: string;
  date: string; // ISO date string
  bagsProduced: number;
  ingredientsUsed: {
    ingredientId: string;
    ingredientName: string;
    quantityUsed: number;
    unit: string;
  }[];
}

export interface InventoryState {
  ingredients: Ingredient[];
  formula: Formula;
  productionHistory: ProductionEntry[];
}
