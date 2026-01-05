import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Ingredient, Formula, ProductionEntry, InventoryState } from '@/types/inventory';

interface InventoryContextType {
  ingredients: Ingredient[];
  formulas: Formula[];
  productionHistory: ProductionEntry[];
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, updates: Partial<Omit<Ingredient, 'id'>>) => void;
  deleteIngredient: (id: string) => void;
  addFormula: (formula: Omit<Formula, 'id'>) => void;
  updateFormula: (id: string, updates: Partial<Omit<Formula, 'id'>>) => void;
  deleteFormula: (id: string) => void;
  addProduction: (entry: Omit<ProductionEntry, 'id'>) => void;
  updateProduction: (id: string, newBagsProduced: number) => void;
  deleteProduction: (id: string) => void;
  getIngredientById: (id: string) => Ingredient | undefined;
  getFormulaById: (id: string) => Formula | undefined;
}

const defaultState: InventoryState = {
  ingredients: [],
  formulas: [],
  productionHistory: [],
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<InventoryState>('cheese-inventory', defaultState);

  const addIngredient = (ingredient: Omit<Ingredient, 'id'>) => {
    const newIngredient: Ingredient = {
      ...ingredient,
      id: crypto.randomUUID(),
    };
    setState(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient],
    }));
  };

  const updateIngredient = (id: string, updates: Partial<Omit<Ingredient, 'id'>>) => {
    setState(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing =>
        ing.id === id ? { ...ing, ...updates } : ing
      ),
    }));
  };

  const deleteIngredient = (id: string) => {
    setState(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== id),
      formulas: prev.formulas.map(formula => ({
        ...formula,
        items: formula.items.filter(item => item.ingredientId !== id),
      })),
    }));
  };

  const addFormula = (formula: Omit<Formula, 'id'>) => {
    const newFormula: Formula = {
      ...formula,
      id: crypto.randomUUID(),
    };
    setState(prev => ({
      ...prev,
      formulas: [...prev.formulas, newFormula],
    }));
  };

  const updateFormula = (id: string, updates: Partial<Omit<Formula, 'id'>>) => {
    setState(prev => ({
      ...prev,
      formulas: prev.formulas.map(formula =>
        formula.id === id ? { ...formula, ...updates } : formula
      ),
    }));
  };

  const deleteFormula = (id: string) => {
    setState(prev => ({
      ...prev,
      formulas: prev.formulas.filter(formula => formula.id !== id),
    }));
  };

  const getFormulaById = (id: string) => {
    return state.formulas.find(formula => formula.id === id);
  };

  const addProduction = (entry: Omit<ProductionEntry, 'id'>) => {
    const newEntry: ProductionEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };

    // Deduct ingredients from warehouse
    setState(prev => {
      const updatedIngredients = prev.ingredients.map(ing => {
        const usedItem = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        if (usedItem) {
          return { ...ing, quantity: Math.max(0, ing.quantity - usedItem.quantityUsed) };
        }
        return ing;
      });

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: [newEntry, ...prev.productionHistory],
      };
    });
  };

  const getIngredientById = (id: string) => {
    return state.ingredients.find(ing => ing.id === id);
  };

  const updateProduction = (id: string, newBagsProduced: number) => {
    setState(prev => {
      const entry = prev.productionHistory.find(e => e.id === id);
      if (!entry) return prev;

      const oldBags = entry.bagsProduced;
      const bagDifference = newBagsProduced - oldBags;

      // Calculate the ratio to adjust ingredients
      const ratio = newBagsProduced / oldBags;

      // Update ingredients in stock based on the difference
      const updatedIngredients = prev.ingredients.map(ing => {
        const usedItem = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        if (usedItem) {
          // Calculate the difference in quantity used
          const oldQuantity = usedItem.quantityUsed;
          const newQuantity = oldQuantity * ratio;
          const quantityDifference = newQuantity - oldQuantity;
          // Deduct more if bags increased, add back if bags decreased
          return { ...ing, quantity: Math.max(0, ing.quantity - quantityDifference) };
        }
        return ing;
      });

      // Update the production entry
      const updatedHistory = prev.productionHistory.map(e => {
        if (e.id === id) {
          return {
            ...e,
            bagsProduced: newBagsProduced,
            ingredientsUsed: e.ingredientsUsed.map(item => ({
              ...item,
              quantityUsed: item.quantityUsed * ratio,
            })),
          };
        }
        return e;
      });

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: updatedHistory,
      };
    });
  };

  const deleteProduction = (id: string) => {
    setState(prev => {
      const entry = prev.productionHistory.find(e => e.id === id);
      if (!entry) return prev;

      // Restore ingredients to stock
      const updatedIngredients = prev.ingredients.map(ing => {
        const usedItem = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        if (usedItem) {
          return { ...ing, quantity: ing.quantity + usedItem.quantityUsed };
        }
        return ing;
      });

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: prev.productionHistory.filter(e => e.id !== id),
      };
    });
  };

  return (
    <InventoryContext.Provider
      value={{
        ingredients: state.ingredients,
        formulas: state.formulas,
        productionHistory: state.productionHistory,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        addFormula,
        updateFormula,
        deleteFormula,
        addProduction,
        updateProduction,
        deleteProduction,
        getIngredientById,
        getFormulaById,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
