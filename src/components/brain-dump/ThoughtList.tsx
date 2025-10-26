import { ThoughtCard } from './ThoughtCard';
import { Brain } from 'lucide-react';
import { ThoughtWithCategories, Category } from '@/types/thought.types';

interface ThoughtListProps {
  thoughts: ThoughtWithCategories[];
  isLoading: boolean;
  isSelectMode?: boolean;
  selectedThoughts?: string[];
  onToggleSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRemoveCategory?: (thoughtId: string, categoryId: string) => void;
  onMarkDone?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddCategory?: (thoughtId: string, categoryName: string) => Promise<void>;
  onCategoryClick?: (categoryId: string) => void;
  selectedCategoryIds?: string[];
  availableCategories?: Category[];
  emptyMessage?: string;
}

export function ThoughtList({
  thoughts,
  isLoading,
  isSelectMode,
  selectedThoughts = [],
  onToggleSelect,
  onArchive,
  onRemoveCategory,
  onMarkDone,
  onEdit,
  onAddCategory,
  onCategoryClick,
  selectedCategoryIds,
  availableCategories,
  emptyMessage = 'No thoughts yet. Start dumping your ideas above!'
}: ThoughtListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading your thoughts...</p>
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {thoughts.map((thought) => (
        <ThoughtCard
          key={thought.id}
          thought={thought}
          isSelectMode={isSelectMode}
          isSelected={selectedThoughts.includes(thought.id)}
          onToggleSelect={onToggleSelect}
          onArchive={onArchive}
          onRemoveCategory={onRemoveCategory}
          onMarkDone={onMarkDone}
          onEdit={onEdit}
          onAddCategory={onAddCategory}
          onCategoryClick={onCategoryClick}
          selectedCategoryIds={selectedCategoryIds}
          availableCategories={availableCategories}
        />
      ))}
    </div>
  );
}
