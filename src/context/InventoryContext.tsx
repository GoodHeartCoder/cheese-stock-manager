import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Ingredient, Formula, ProductionEntry, InventoryState } from '@/types/inventory';

interface InventoryContextType {
  ingredients: Ingredient[];
  formula: Formula;
  productionHistory: ProductionEntry[];
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, updates: Partial<Omit<Ingredient, 'id'>>) => void;
  deleteIngredient: (id: string) => void;
  updateFormula: (formula: Formula) => void;
  addProduction: (entry: Omit<ProductionEntry, 'id'>) => void;
  getIngredientById: (id: string) => Ingredient | undefined;
}

const defaultState: InventoryState = {
  ingredients: [],
  formula: { items: [] },
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
      formula: {
        items: prev.formula.items.filter(item => item.ingredientId !== id),
      },
    }));
  };

  const updateFormula = (formula: Formula) => {
    setState(prev => ({
      ...prev,
      formula,
    }));
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

  return (
    <InventoryContext.Provider
      value={{
        ingredients: state.ingredients,
        formula: state.formula,
        productionHistory: state.productionHistory,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        updateFormula,
        addProduction,
        getIngredientById,
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
