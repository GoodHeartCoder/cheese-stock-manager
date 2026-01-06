import React, { createContext, useContext, ReactNode } from 'react';
import { isSameDay } from 'date-fns';
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
  updateProduction: (id: string, updates: { bagsProduced: number }) => void;
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
    setState(prev => {
      // Deduct ingredients from warehouse
      const updatedIngredients = prev.ingredients.map(ing => {
        const usedItem = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        if (usedItem) {
          return { ...ing, quantity: Math.max(0, ing.quantity - usedItem.quantityUsed) };
        }
        return ing;
      });

      // Aggregate production history
      const today = new Date(entry.date);
      const existingEntryIndex = prev.productionHistory.findIndex(histEntry =>
        isSameDay(new Date(histEntry.date), today)
      );

      let updatedHistory: ProductionEntry[];

      if (existingEntryIndex > -1) {
        // Entry for today exists, update it
        updatedHistory = [...prev.productionHistory];
        const existingEntry = updatedHistory[existingEntryIndex];

        const ingredientsMap = new Map<string, { quantityUsed: number; unit: string; ingredientName: string }>();

        existingEntry.ingredientsUsed.forEach(item => {
          ingredientsMap.set(item.ingredientId, { ...item });
        });

        entry.ingredientsUsed.forEach(item => {
          const existing = ingredientsMap.get(item.ingredientId);
          if (existing) {
            existing.quantityUsed += item.quantityUsed;
          } else {
            ingredientsMap.set(item.ingredientId, { ...item });
          }
        });

        const finalIngredients = Array.from(ingredientsMap.entries()).map(([ingredientId, data]) => ({
            ingredientId,
            ingredientName: data.ingredientName,
            quantityUsed: data.quantityUsed,
            unit: data.unit,
        }));

        const updatedEntry: ProductionEntry = {
          ...existingEntry,
          bagsProduced: existingEntry.bagsProduced + entry.bagsProduced,
          ingredientsUsed: finalIngredients,
          date: entry.date, // Update to the latest timestamp of the day
        };

        updatedHistory[existingEntryIndex] = updatedEntry;
      } else {
        // No entry for today, create a new one
        const newEntry: ProductionEntry = {
          ...entry,
          id: crypto.randomUUID(),
        };
        updatedHistory = [newEntry, ...prev.productionHistory];
      }

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: updatedHistory,
      };
    });
  };

  const updateProduction = (id: string, updates: { bagsProduced: number }) => {
    setState(prev => {
      const entryIndex = prev.productionHistory.findIndex(entry => entry.id === id);
      if (entryIndex === -1) return prev;

      const oldEntry = prev.productionHistory[entryIndex];
      const oldBags = oldEntry.bagsProduced;

      // Avoid division by zero and no-op edits
      if (oldBags === 0 || updates.bagsProduced === oldBags) {
        return prev;
      }

      const newBags = updates.bagsProduced;

      // Compute how much each ingredient's total usage should change
      const ingredientDeltas = new Map<string, number>();
      oldEntry.ingredientsUsed.forEach(item => {
        const perBag = item.quantityUsed / oldBags;
        const newTotal = perBag * newBags;
        const delta = newTotal - item.quantityUsed; // positive = use more, negative = give back
        ingredientDeltas.set(item.ingredientId, delta);
      });

      // Adjust warehouse inventory for ingredients that still exist
      const updatedIngredients = prev.ingredients.map(ing => {
        const delta = ingredientDeltas.get(ing.id);
        if (delta === undefined) return ing;

        const newQuantity = ing.quantity - delta;
        return { ...ing, quantity: Math.max(0, newQuantity) };
      });

      // Update the stored production entry's totals
      const updatedEntry: ProductionEntry = {
        ...oldEntry,
        bagsProduced: newBags,
        ingredientsUsed: oldEntry.ingredientsUsed.map(item => {
          const perBag = item.quantityUsed / oldBags;
          return {
            ...item,
            quantityUsed: perBag * newBags,
          };
        }),
      };

      const updatedHistory = [...prev.productionHistory];
      updatedHistory[entryIndex] = updatedEntry;

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: updatedHistory,
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
        updateProduction,
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
