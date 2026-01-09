import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import { Ingredient, Formula, ProductionEntry, InventoryState, Bag, CookingEntry } from '@/types/inventory';

declare global {
  interface Window {
    electronAPI: {
      getInventory: () => Promise<InventoryState | null>;
      saveInventory: (data: InventoryState) => Promise<boolean>;
      getAppPath: (name: string) => Promise<string>;
      openFile: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      saveFile: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    }
  }
}

interface InventoryContextType {
  ingredients: Ingredient[];
  formulas: Formula[];
  productionHistory: ProductionEntry[];
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, updates: Partial<Omit<Ingredient, 'id'>>) => void;
  deleteIngredient: (id: string) => void;
  addFormula: (name: string, items: Formula['items']) => void;
  updateFormula: (id: string, updates: Partial<Formula>) => void;
  deleteFormula: (id: string) => void;
  addProduction: (entry: Omit<ProductionEntry, 'id'>) => void;
  updateProduction: (id: string, updates: { bagsProduced: number }) => void;
  deleteProduction: (id: string) => void;
  getIngredientById: (id: string) => Ingredient | undefined;
  resetInventory: () => void;
  // Bag Management
  bags: Bag[];
  cookingHistory: CookingEntry[];
  updateBagCount: (formulaId: string, newQuantity: number) => void;
  cookBags: (formulaId: string, quantity: number) => void;
  updateCookingEntry: (id: string, newQuantity: number) => void;
  deleteCookingEntry: (id: string) => void;
}

const defaultState: InventoryState = {
  ingredients: [],
  formulas: [],
  productionHistory: [],
  bags: [],
  cookingHistory: [],
};

const round = (num: number, decimals: number = 4): number => {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InventoryState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from File System on startup
  useEffect(() => {
    const loadData = async () => {
      if (!window.electronAPI) {
        console.warn("electronAPI not found. Running in browser mode?");
        setIsLoaded(true);
        return;
      }
      try {
        const savedData = await window.electronAPI.getInventory();
        if (savedData) {
          setState(savedData);
        }
      } catch (error) {
        console.error("Failed to load inventory from file:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save to File System on every change
  useEffect(() => {
    if (isLoaded && window.electronAPI) {
      window.electronAPI.saveInventory(state).catch(err => {
        console.error("Failed to save inventory to file:", err);
      });
    }
  }, [state, isLoaded]);


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
        ing.id === id ? {
          ...ing,
          ...updates,
          quantity: updates.quantity !== undefined ? round(updates.quantity) : ing.quantity,
          minStock: updates.minStock !== undefined ? round(updates.minStock) : ing.minStock
        } : ing
      ),
    }));
  };

  const deleteIngredient = (id: string) => {
    setState(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== id),
      // Remove ingredient from all formulas
      formulas: (prev.formulas || []).map(f => ({
        ...f,
        items: f.items.filter(item => item.ingredientId !== id)
      })),
    }));
  };

  const addFormula = (name: string, items: Formula['items']) => {
    const newFormula: Formula = {
      id: crypto.randomUUID(),
      name,
      items
    };
    setState(prev => ({
      ...prev,
      formulas: [...(prev.formulas || []), newFormula]
    }));
  }

  const updateFormula = (id: string, updates: Partial<Formula>) => {
    setState(prev => ({
      ...prev,
      formulas: (prev.formulas || []).map(f =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  };

  const deleteFormula = (id: string) => {
    setState(prev => ({
      ...prev,
      formulas: (prev.formulas || []).filter(f => f.id !== id),
      bags: (prev.bags || []).filter(b => b.formulaId !== id)
    }));
  }

  const addProduction = (entry: Omit<ProductionEntry, 'id'>) => {
    if (entry.bagsProduced <= 0) {
      throw new Error("Production amount must be positive");
    }

    setState(prev => {
      // Deduct ingredients from warehouse
      // Check for sufficiency first (though UI should handle this, double check)
      const sufficient = prev.ingredients.every(ing => {
        const used = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        return !used || ing.quantity >= used.quantityUsed;
      });

      if (!sufficient) {
        // This should ideally be caught by UI, but as a safeguard
        console.warn("Forcing production despite low stock (or UI race condition)");
      }

      const updatedIngredients = prev.ingredients.map(ing => {
        const usedItem = entry.ingredientsUsed.find(u => u.ingredientId === ing.id);
        if (usedItem) {
          return { ...ing, quantity: Math.max(0, round(ing.quantity - usedItem.quantityUsed)) };
        }
        return ing;
      });

      // Aggregate production history
      const today = new Date(entry.date);
      const existingEntryIndex = prev.productionHistory.findIndex(histEntry =>
        isSameDay(new Date(histEntry.date), today) && histEntry.formulaId === entry.formulaId
      );

      let updatedHistory: ProductionEntry[];

      if (existingEntryIndex > -1) {
        // Entry for today with SAME FORMULA exists, update it
        updatedHistory = [...prev.productionHistory];
        const existingEntry = updatedHistory[existingEntryIndex];

        const ingredientsMap = new Map<string, { quantityUsed: number; unit: string; ingredientName: string }>();

        existingEntry.ingredientsUsed.forEach(item => {
          ingredientsMap.set(item.ingredientId, { ...item });
        });

        entry.ingredientsUsed.forEach(item => {
          const existing = ingredientsMap.get(item.ingredientId);
          if (existing) {
            existing.quantityUsed = round(existing.quantityUsed + item.quantityUsed);
          } else {
            ingredientsMap.set(item.ingredientId, { ...item });
          }
        });

        const finalIngredients = Array.from(ingredientsMap.entries()).map(([ingredientId, data]) => ({
          ingredientId,
          ingredientName: data.ingredientName,
          quantityUsed: round(data.quantityUsed),
          unit: data.unit, // FIXED: Use existing unit
        }));

        const updatedEntry: ProductionEntry = {
          ...existingEntry,
          bagsProduced: existingEntry.bagsProduced + entry.bagsProduced,
          ingredientsUsed: finalIngredients,
          date: entry.date, // Update to the latest timestamp of the day
        };

        updatedHistory[existingEntryIndex] = updatedEntry;
      } else {
        // No entry for today + formula, create a new one
        const newEntry: ProductionEntry = {
          ...entry,
          id: crypto.randomUUID(),
        };
        updatedHistory = [newEntry, ...prev.productionHistory];
      }

      // Update Bags Inventory
      const currentBags = prev.bags || []; // Handle legacy state where bags might be undefined
      const bagIndex = currentBags.findIndex(b => b.formulaId === entry.formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        updatedBags[bagIndex] = {
          ...updatedBags[bagIndex],
          quantity: round(updatedBags[bagIndex].quantity + entry.bagsProduced)
        };
      } else {
        updatedBags.push({
          formulaId: entry.formulaId,
          quantity: round(entry.bagsProduced)
        });
      }

      return {
        ...prev,
        ingredients: updatedIngredients,
        productionHistory: updatedHistory,
        bags: updatedBags,
      };
    });
  };

  const updateProduction = (id: string, updates: { bagsProduced: number }) => {
    // We cannot throw easily inside setState, so we'll do checks inside and if failed return prev state
    // Ideally we capture the error, but for now we will just prevent invalid state

    // NOTE: This function logic is tricky because we need to access 'prev' state to know if we have enough stock.
    // If strict error handling is needed, we should move logic outside setState or throw inside (which crashes react render loop usually).
    // Better pattern: Check validity before calling Update, OR rely on a separate query.
    // However, given the architecture, let's implement the logic safely inside setState.

    setState(prev => {
      const entryIndex = prev.productionHistory.findIndex(entry => entry.id === id);
      if (entryIndex === -1) return prev;

      const oldEntry = prev.productionHistory[entryIndex];
      const oldBags = oldEntry.bagsProduced;
      const newBags = updates.bagsProduced;

      // 1. Validate positive
      if (newBags <= 0) return prev; // Fail silently or handle better? For now, no-op.

      // 2. No-op check
      if (newBags === oldBags) return prev;

      // 3. Compute Stock Changes
      // ingredientDeltas: positive = need MORE stock (warehouse goes down)
      //                   negative = returning stock (warehouse goes up)
      const ingredientDeltas = new Map<string, number>();
      let possible = true;

      oldEntry.ingredientsUsed.forEach(item => {
        const perBag = item.quantityUsed / oldBags;
        const newTotalUsage = perBag * newBags;
        const deltaNeeded = newTotalUsage - item.quantityUsed;

        ingredientDeltas.set(item.ingredientId, deltaNeeded);

        // Check sufficiency
        if (deltaNeeded > 0) {
          const inStock = prev.ingredients.find(i => i.id === item.ingredientId);
          // If ingredient missing or not enough:
          if (!inStock || inStock.quantity < deltaNeeded) {
            possible = false;
          }
        }
      });

      if (!possible) {
        // Cannot produce more than we have ingredients for.
        // We can't easily alert() here. We will just return prev to block the update.
        // The UI will likely see no change.
        console.error("Insufficient ingredients for this edit."); // Debug help
        return prev;
      }

      // 4. Apply Updates
      // Handle Ghost Ingredients: If returning stock (delta < 0) and ingredient doesn't exist, recreate it.
      let nextIngredients = [...prev.ingredients];

      for (const [ingId, delta] of Array.from(ingredientDeltas.entries())) {
        const existingIndex = nextIngredients.findIndex(i => i.id === ingId);

        if (existingIndex > -1) {
          // Ingredient exists, update quantity
          const current = nextIngredients[existingIndex];
          const newQty = Math.max(0, round(current.quantity - delta));
          nextIngredients[existingIndex] = { ...current, quantity: newQty };
        }
      }

      // Update History Entry
      const updatedEntry: ProductionEntry = {
        ...oldEntry,
        bagsProduced: newBags,
        ingredientsUsed: oldEntry.ingredientsUsed.map(item => {
          const perBag = item.quantityUsed / oldBags;
          return {
            ...item,
            quantityUsed: round(perBag * newBags),
          };
        }),
      };

      const updatedHistory = [...prev.productionHistory];
      updatedHistory[entryIndex] = updatedEntry;

      // Update Bags Inventory (Adjust for difference)
      const bagDiff = newBags - oldBags;
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === oldEntry.formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        // Ensure we don't go negative if not intended? Well, user can manually fix.
        updatedBags[bagIndex] = {
          ...updatedBags[bagIndex],
          quantity: Math.max(0, round(updatedBags[bagIndex].quantity + bagDiff))
        };
      } else if (bagDiff > 0) {
        // If for some reason bag entry didn't exist
        updatedBags.push({
          formulaId: oldEntry.formulaId,
          quantity: round(bagDiff)
        });
      }

      return {
        ...prev,
        ingredients: nextIngredients,
        productionHistory: updatedHistory,
        bags: updatedBags,
      };
    });
  };

  const deleteProduction = (id: string) => {
    setState(prev => {
      const entryIndex = prev.productionHistory.findIndex(entry => entry.id === id);
      if (entryIndex === -1) return prev;

      const entry = prev.productionHistory[entryIndex];
      let nextIngredients = [...prev.ingredients];

      // Restore ingredients
      entry.ingredientsUsed.forEach(item => {
        const existingIndex = nextIngredients.findIndex(i => i.id === item.ingredientId);
        if (existingIndex > -1) {
          const current = nextIngredients[existingIndex];
          nextIngredients[existingIndex] = { ...current, quantity: round(current.quantity + item.quantityUsed) };
        } else {
          console.warn(`Ingredient ${item.ingredientName} (${item.ingredientId}) not found in warehouse during deletion. Stock cannot be restored.`);
        }
      });

      const updatedHistory = prev.productionHistory.filter(e => e.id !== id);

      // Update Bags Inventory (Remove produced bags)
      // If we delete the production record, we should theoretically remove those bags from stock.
      // But what if they were already sold/cooked?
      // Assumption: If deleting history, we are reverting the action. So we revert the bag add.
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === entry.formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        updatedBags[bagIndex] = {
          ...updatedBags[bagIndex],
          quantity: Math.max(0, round(updatedBags[bagIndex].quantity - entry.bagsProduced))
        };
      }

      return {
        ...prev,
        ingredients: nextIngredients,
        productionHistory: updatedHistory,
        bags: updatedBags,
      };
    });
  };

  const resetInventory = () => {
    setState(defaultState);
  };

  const getIngredientById = (id: string) => {
    return state.ingredients.find(ing => ing.id === id);
  };

  const updateBagCount = (formulaId: string, newQuantity: number) => {
    setState(prev => {
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        updatedBags[bagIndex] = { ...updatedBags[bagIndex], quantity: round(newQuantity) };
      } else {
        updatedBags.push({ formulaId, quantity: round(newQuantity) });
      }

      return { ...prev, bags: updatedBags };
    });
  };

  const cookBags = (formulaId: string, quantity: number) => {
    setState(prev => {
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === formulaId);
      if (bagIndex === -1) return prev; // Cannot cook what doesn't exist

      const formula = prev.formulas?.find(f => f.id === formulaId);
      const formulaName = formula?.name || 'Unknown Formula';

      const updatedBags = [...currentBags];
      const newQty = Math.max(0, round(updatedBags[bagIndex].quantity - quantity));
      updatedBags[bagIndex] = { ...updatedBags[bagIndex], quantity: newQty };

      const now = new Date();
      const history = prev.cookingHistory || [];
      const existingEntryIndex = history.findIndex(e =>
        isSameDay(new Date(e.date), now) && e.formulaId === formulaId
      );

      let updatedHistory = [...history];

      if (existingEntryIndex > -1) {
        // Update existing entry for today
        updatedHistory[existingEntryIndex] = {
          ...updatedHistory[existingEntryIndex],
          quantityCooked: round(updatedHistory[existingEntryIndex].quantityCooked + quantity),
          date: now.toISOString(), // Update timestamp
        };
      } else {
        // Create new entry
        const newCookingEntry: CookingEntry = {
          id: crypto.randomUUID(),
          formulaId,
          formulaName,
          quantityCooked: quantity,
          date: now.toISOString(),
        };
        updatedHistory = [newCookingEntry, ...updatedHistory];
      }

      return {
        ...prev,
        bags: updatedBags,
        cookingHistory: updatedHistory
      };
    });
  };

  const updateCookingEntry = (id: string, newQuantity: number) => {
    setState(prev => {
      const history = prev.cookingHistory || [];
      const entryIndex = history.findIndex(e => e.id === id);
      if (entryIndex === -1) return prev;

      const entry = history[entryIndex];
      const diff = newQuantity - entry.quantityCooked;

      // Adjust bags: if cooked more, subtract from stock. If cooked less, add back to stock.
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === entry.formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        updatedBags[bagIndex] = {
          ...updatedBags[bagIndex],
          quantity: Math.max(0, round(updatedBags[bagIndex].quantity - diff))
        };
      }

      const updatedHistory = [...history];
      updatedHistory[entryIndex] = { ...entry, quantityCooked: newQuantity };

      return {
        ...prev,
        bags: updatedBags,
        cookingHistory: updatedHistory,
      };
    });
  };

  const deleteCookingEntry = (id: string) => {
    setState(prev => {
      const history = prev.cookingHistory || [];
      const entry = history.find(e => e.id === id);
      if (!entry) return prev;

      // Restore bags to stock
      const currentBags = prev.bags || [];
      const bagIndex = currentBags.findIndex(b => b.formulaId === entry.formulaId);
      let updatedBags = [...currentBags];

      if (bagIndex > -1) {
        updatedBags[bagIndex] = {
          ...updatedBags[bagIndex],
          quantity: round(updatedBags[bagIndex].quantity + entry.quantityCooked)
        };
      }

      return {
        ...prev,
        bags: updatedBags,
        cookingHistory: history.filter(e => e.id !== id),
      };
    });
  };

  return (
    <InventoryContext.Provider
      value={{
        ingredients: state.ingredients,
        formulas: state.formulas || [],
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
        // Bag Management
        bags: state.bags || [],
        cookingHistory: state.cookingHistory || [],
        updateBagCount,
        cookBags,
        updateCookingEntry,
        deleteCookingEntry,
        getIngredientById,
        resetInventory,
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
