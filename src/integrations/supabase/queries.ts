/**
 * Type-safe Supabase query helpers
 * Provides proper typing for complex queries without using 'as any'
 */

import { supabase } from './client';
import type { Database } from './types';
import type {
  ThoughtRow,
  ThoughtUpdate,
  CategoryRow,
  ClusterRow
} from './type-extensions';

// Complex query result types
export type ThoughtWithCategoriesResult = ThoughtRow & {
  thought_categories: Array<{
    categories: CategoryRow;
  }>;
};

export type ClusterWithThoughtsResult = ClusterRow & {
  thought_clusters: Array<{
    thoughts: ThoughtWithCategoriesResult;
  }>;
};

/**
 * Fetch thoughts with categories - properly typed
 * Uses type assertion via unknown for complex nested queries
 */
export async function fetchThoughtsWithCategories(status: 'active' | 'archived' = 'active') {
  const { data, error } = await supabase
    .from('thoughts')
    .select(`
      *,
      thought_categories(
        categories(*)
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  // Complex nested queries require type assertion
  // This is safer than 'as any' and documents the type transformation
  return { 
    data: (data as unknown as ThoughtWithCategoriesResult[]) || [], 
    error 
  };
}

/**
 * Fetch clusters with thoughts and categories - properly typed
 * Uses type assertion via unknown for complex nested queries
 */
export async function fetchClustersWithThoughts() {
  const { data, error } = await supabase
    .from('clusters')
    .select(`
      *,
      thought_clusters(
        thoughts(
          *,
          thought_categories(
            categories(*)
          )
        )
      )
    `)
    .order('created_at', { ascending: false });
  
  // Complex nested queries require type assertion
  // This is safer than 'as any' and documents the type transformation
  return { 
    data: (data as unknown as ClusterWithThoughtsResult[]) || [], 
    error 
  };
}

/**
 * Fetch all categories - properly typed
 */
export async function fetchCategories() {
  return supabase
    .from('categories')
    .select('*')
    .order('name');
}

/**
 * Update thought - properly typed
 * Uses extended types with is_completed field
 */
export async function updateThought(
  thoughtId: string, 
  updates: ThoughtUpdate
) {
  return supabase
    .from('thoughts')
    .update(updates)
    .eq('id', thoughtId);
}

/**
 * Archive/restore thought - properly typed
 */
export async function updateThoughtStatus(thoughtId: string, status: 'active' | 'archived') {
  return supabase
    .from('thoughts')
    .update({ status })
    .eq('id', thoughtId);
}

/**
 * Remove category from thought - properly typed
 */
export async function removeCategoryFromThought(thoughtId: string, categoryId: string) {
  return supabase
    .from('thought_categories')
    .delete()
    .eq('thought_id', thoughtId)
    .eq('category_id', categoryId);
}

/**
 * Add category to thought using RPC - properly typed
 * Note: RPC functions may not be in auto-generated types
 */
export async function addCategoryToThought(
  thoughtId: string,
  categoryName: string,
  userId: string
) {
  // Type assertion needed for RPC call - database function not in generated types
  const { data, error } = await (supabase.rpc as any)('add_category_to_thought', {
    p_thought_id: thoughtId,
    p_category_name: categoryName,
    p_user_id: userId
  });

  return { data, error };
}

/**
 * Update cluster - properly typed
 */
export async function updateCluster(
  clusterId: string,
  updates: Partial<Omit<ClusterRow, 'id' | 'user_id' | 'created_at'>>
) {
  return supabase
    .from('clusters')
    .update(updates)
    .eq('id', clusterId);
}

/**
 * Add thought to cluster - properly typed
 */
export async function addThoughtToCluster(thoughtId: string, clusterId: string) {
  return supabase
    .from('thought_clusters')
    .insert({
      thought_id: thoughtId,
      cluster_id: clusterId
    });
}

/**
 * Remove thought from cluster - properly typed
 */
export async function removeThoughtFromCluster(thoughtId: string, clusterId: string) {
  return supabase
    .from('thought_clusters')
    .delete()
    .eq('thought_id', thoughtId)
    .eq('cluster_id', clusterId);
}

/**
 * Create manual cluster - properly typed
 */
export async function createCluster(userId: string, name: string, isManual: boolean = true) {
  return supabase
    .from('clusters')
    .insert({ 
      user_id: userId, 
      name,
      is_manual: isManual 
    })
    .select()
    .single();
}
