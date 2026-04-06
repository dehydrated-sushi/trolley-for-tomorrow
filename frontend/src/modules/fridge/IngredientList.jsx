import IngredientItem from './IngredientItem'

export default function IngredientList({ ingredients, onEdit, onDelete, onViewDetail }) {
  if (ingredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4 opacity-30">🧊</div>
        <div className="text-base font-medium text-[#2d4a38] mb-1">Your fridge is empty</div>
        <div className="text-sm text-[#5a7a68] font-light">
          Add ingredients manually or scan a receipt to get started.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {ingredients.map(ing => (
        <IngredientItem
          key={ing.id}
          ingredient={ing}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  )
}