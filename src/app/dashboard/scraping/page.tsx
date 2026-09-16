import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import ScrapingStudio from "@/components/ScrapingStudio";

export default async function ScrapingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user profile to get assigned scope
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email, assigned_scope")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-8">Error loading profile.</div>;
  }

  // Fallback to empty if nothing assigned
  const scope = profile.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] };
  let allowedActorsIds = scope.allowed_actors || [];
  let allowedGroupIds = scope.allowed_hashtag_groups || [];

  // Need admin client if we want to bypass RLS, BUT we don't have RLS on apify_actors and hashtag_groups anymore (they are globally readable). 
  // Let's just use the normal client!
  
  // 2. Fetch allowed Actors
  let actorsQuery = supabase.from("apify_actors").select("*").eq("is_active", true);
  if (!profile.is_admin && allowedActorsIds.length > 0) {
    actorsQuery = actorsQuery.in("actor_id", allowedActorsIds);
  } else if (!profile.is_admin) {
    // Force empty result if no actors assigned
    actorsQuery = actorsQuery.eq("actor_id", "NONE");
  }
  const { data: allowedActors } = await actorsQuery;

  // 3. Fetch allowed Groups
  let groupsQuery = supabase.from("hashtag_groups").select("*");
  if (!profile.is_admin && allowedGroupIds.length > 0) {
    groupsQuery = groupsQuery.in("group_id", allowedGroupIds);
  } else if (!profile.is_admin) {
    groupsQuery = groupsQuery.eq("group_id", "NONE");
  }
  const { data: allowedGroups } = await groupsQuery;

  // 4. Fetch Hashtags belonging to these groups
  const hashtagsByGroup: Record<string, any[]> = {};
  if (allowedGroups && allowedGroups.length > 0) {
    const groupIdsToFetch = allowedGroups.map(g => g.group_id);
    
    // We need to join hashtags with hashtag_group_mapping
    const { data: mappings } = await supabase
      .from("hashtag_group_mapping")
      .select(`
        group_id,
        hashtags (
          hashtag_id,
          hashtag_text,
          keyword_track,
          is_active
        )
      `)
      .in("group_id", groupIdsToFetch);

    if (mappings) {
      mappings.forEach(m => {
        if (!hashtagsByGroup[m.group_id]) hashtagsByGroup[m.group_id] = [];
        if (m.hashtags && (m.hashtags as any).is_active) {
          hashtagsByGroup[m.group_id].push(m.hashtags);
        }
      });
    }
  }

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 text-white">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Scraping Studio
            </h1>
            <p className="text-stone-500 mt-1">
              Phòng điều khiển chiến dịch cào dữ liệu. Bạn chỉ nhìn thấy các công cụ và từ khóa được Admin cấp quyền.
            </p>
          </div>
        </div>

        <ScrapingStudio 
          user={profile}
          allowedActors={allowedActors || []}
          allowedGroups={allowedGroups || []}
          hashtagsByGroup={hashtagsByGroup}
        />
      </div>
    </div>
  );
}
