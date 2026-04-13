import PageShell from '../../shared/PageShell'
import EmptyState from '../../shared/EmptyState'

export default function ShoppingListPage() {
  return (
    <PageShell
      eyebrow="Groceries"
      title="Shopping List"
      subtitle="Shopping list UI (MVP). Next step: generate from meal plan + fridge gaps."
    >
      <EmptyState
        icon="🛒"
        title="Your shopping list is empty"
        description="Once you generate a meal plan, we'll automatically build a shopping list to fill the gaps."
        primaryAction={{ to: '/meals', label: 'Go to meal planner' }}
      />
    </PageShell>
  )
}

