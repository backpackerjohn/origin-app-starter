import { Button } from '@/components/ui/button';
import { FilterPanel } from './FilterPanel';
import { ThoughtList } from './ThoughtList';
import { Category, ThoughtWithCategories } from '@/types/thought.types';

interface AllThoughtsTabProps {
  thoughts: ThoughtWithCategories[];
  categories: Category[];
  availableCategories: Category[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  selectedThoughts: string[];
  onToggleSelect: (id: string) => void;
  onBulkArchive: () => void;
  onArchive: (id: string) => void;
  onRemoveCategory: (thoughtId: string, categoryId: string) => void;
  onMarkDone?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddCategory?: (thoughtId: string, categoryName: string) => Promise<void>;
  onCategoryClick?: (categoryId: string) => void;
}

export function AllThoughtsTab({
  thoughts,
  categories,
  availableCategories,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  isSelectMode,
  onToggleSelectMode,
  selectedThoughts,
  onToggleSelect,
  onBulkArchive,
  onArchive,
  onRemoveCategory,
  onMarkDone,
  onEdit,
  onAddCategory,
  onCategoryClick
}: AllThoughtsTabProps) {
  return (
    <>
      <FilterPanel
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryToggle={onCategoryToggle}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isSelectMode={isSelectMode}
        onToggleSelectMode={onToggleSelectMode}
        selectedCount={selectedThoughts.length}
      />

      {isSelectMode && selectedThoughts.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Button onClick={onBulkArchive} variant="destructive">
            Archive Selected ({selectedThoughts.length})
          </Button>
        </div>
      )}

      <ThoughtList
        thoughts={thoughts}
        isLoading={isLoading}
        isSelectMode={isSelectMode}
        selectedThoughts={selectedThoughts}
        onToggleSelect={onToggleSelect}
        onArchive={onArchive}
        onRemoveCategory={onRemoveCategory}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
        onAddCategory={onAddCategory}
        onCategoryClick={onCategoryClick}
        selectedCategoryIds={selectedCategories}
        availableCategories={availableCategories}
      />
    </>
  );
}
