import { Link } from 'react-router-dom'
import PageShell from '../../shared/PageShell'
import EmptyState from '../../shared/EmptyState'

export default function MealsPage() {
  return (
    <PageShell
      eyebrow="Planning"
      title="Your Meals"

      right={(
        <Link
          to="/fridge"
          className="text-sm text-[#0c1f14] bg-[#5cad76] px-5 py-2.5 rounded-full hover:bg-[#8dcca0] transition-all duration-150 hover:-translate-y-px font-medium"
        >
          Use fridge items →
        </Link>
      )}
    >
      <EmptyState
        icon="🍽"
        title="No meal plan yet"
        description="Generate a plan based on what's in your fridge, your budget, and your dietary preferences."
        primaryAction={{ to: '/signup', label: 'Create account to unlock plans' }}
      />
    </PageShell>
  )
}

