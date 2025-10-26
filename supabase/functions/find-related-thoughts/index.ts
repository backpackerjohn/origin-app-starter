import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGeminiWithSchema } from "../_shared/gemini.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Find Related Thoughts Function Started ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { clusterId } = await req.json();
    
    if (!clusterId) {
      throw new Error('clusterId is required');
    }

    console.log('Finding related thoughts for cluster:', clusterId);

    // Get thoughts in this cluster (as examples)
    const { data: clusterThoughts, error: clusterError } = await supabase
      .from('thought_clusters')
      .select(`
        thoughts (
          id,
          content
        )
      `)
      .eq('cluster_id', clusterId);

    if (clusterError) {
      console.error('Error fetching cluster thoughts:', clusterError);
      throw clusterError;
    }

    if (!clusterThoughts || clusterThoughts.length < 2) {
      return new Response(
        JSON.stringify({ 
          relatedThoughts: [], 
          count: 0,
          message: 'Need at least 2 thoughts in cluster to find related ones' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cluster has ${clusterThoughts.length} example thoughts`);

    // Get all thoughts for this user
    const { data: allThoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (thoughtsError) {
      console.error('Error fetching all thoughts:', thoughtsError);
      throw thoughtsError;
    }

    const allThoughtIds = allThoughts?.map(t => t.id) || [];
    
    // Get all clustered thought IDs
    const { data: clustered, error: clusteredError } = await supabase
      .from('thought_clusters')
      .select('thought_id')
      .in('thought_id', allThoughtIds);

    if (clusteredError) {
      console.error('Error fetching clustered thoughts:', clusteredError);
      throw clusteredError;
    }

    const clusteredIds = new Set(clustered?.map(c => c.thought_id) || []);
    const unclusteredIds = allThoughtIds.filter(id => !clusteredIds.has(id));

    console.log(`Found ${unclusteredIds.length} unclustered thoughts`);

    if (unclusteredIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          relatedThoughts: [], 
          count: 0,
          message: 'No unclustered thoughts available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch full unclustered thoughts
    const { data: unclusteredThoughts, error: unclusteredError } = await supabase
      .from('thoughts')
      .select('id, content')
      .in('id', unclusteredIds);

    if (unclusteredError) {
      console.error('Error fetching unclustered thoughts:', unclusteredError);
      throw unclusteredError;
    }

    // Use AI to find related thoughts
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const exampleTexts = clusterThoughts
      .map((ct: any) => ct.thoughts.content || '')
      .join('\n\n');

    const candidateThoughts = unclusteredThoughts.map(t => ({
      id: t.id,
      text: t.content || ''
    }));

    const prompt = `You are helping a user organize their thoughts. They have manually created a cluster with the following thoughts as examples:

**Example Thoughts in Cluster:**
${exampleTexts}

**Unclustered Thoughts to Evaluate:**
${JSON.stringify(candidateThoughts, null, 2)}

**Task:**
From the list of unclustered thoughts, identify which ones are thematically similar to the example thoughts. Only select thoughts that clearly relate to the same project, topic, goal, or context.

Be selective - only include thoughts that genuinely fit the theme. It's better to return an empty list than to force unrelated thoughts into the cluster.`;

    console.log('Calling Gemini to find related thoughts...');

    const parsed = await callGeminiWithSchema(
      prompt,
      GEMINI_API_KEY,
      {
        type: 'object',
        properties: {
          thoughtIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of thought IDs that are thematically related to the cluster'
          }
        },
        required: ['thoughtIds'],
        additionalProperties: false
      }
    );

    const thoughtIds: string[] = parsed.thoughtIds || [];

    console.log(`AI suggested ${thoughtIds.length} related thoughts`);

    // Validate IDs exist in unclustered set
    const validIds = thoughtIds.filter(id => unclusteredIds.includes(id));

    console.log(`${validIds.length} valid thought IDs after filtering`);

    // Automatically add them to the cluster
    if (validIds.length > 0) {
      const links = validIds.map(thoughtId => ({
        thought_id: thoughtId,
        cluster_id: clusterId
      }));

      const { error: linkError } = await supabase
        .from('thought_clusters')
        .insert(links);

      if (linkError) {
        console.error('Error linking thoughts:', linkError);
        throw linkError;
      }

      console.log(`Successfully linked ${validIds.length} thoughts to cluster`);
    }

    return new Response(
      JSON.stringify({ 
        relatedThoughts: validIds,
        count: validIds.length,
        message: validIds.length > 0 
          ? `Found and added ${validIds.length} related thought${validIds.length !== 1 ? 's' : ''}` 
          : 'No related thoughts found'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Error Finding Related Thoughts ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : '');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isAuth = errorMessage.includes('authenticated') || errorMessage.includes('authorization');
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        relatedThoughts: [],
        count: 0
      }),
      { 
        status: isAuth ? 401 : 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

