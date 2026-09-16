const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("Seeding apify_actors...");
  await supabase.from('apify_actors').upsert([
    {
      actor_id: 'clockwork/tiktok-scraper',
      actor_name: 'TikTok Data Extractor',
      platform: 'Tiktok',
      default_config: { maxItems: 100 }
    },
    {
      actor_id: 'apify/facebook-pages-scraper',
      actor_name: 'Facebook Pages Scraper',
      platform: 'Facebook',
      default_config: { resultsLimit: 50 }
    },
    {
      actor_id: 'streamer/youtube-scraper',
      actor_name: 'YouTube Comments Extractor',
      platform: 'YouTube',
      default_config: { maxComments: 200 }
    }
  ], { onConflict: 'actor_id' });

  console.log("Seeding hashtag_groups...");
  await supabase.from('hashtag_groups').upsert([
    { group_id: 'COMMERCIAL', group_name: 'Nhóm Thương mại', description: 'Các bài viết mang tính mua bán, quảng cáo' },
    { group_id: 'YOUTH', group_name: 'Nhóm Hành vi giới trẻ', description: 'Các trào lưu, chia sẻ lối sống' },
    { group_id: 'HEALTH', group_name: 'Nhóm Cảnh báo Y tế', description: 'Cảnh báo tác hại sức khỏe' }
  ], { onConflict: 'group_id' });

  console.log("Seeding hashtags...");
  const hashtagsToSeed = [
    { text: '#vape', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'YOUTH'] },
    { text: '#pod', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'YOUTH'] },
    { text: '#vapetricks', track: 'FIXED', groups: ['YOUTH'] },
    { text: '#vapegiare', track: 'FIXED', groups: ['COMMERCIAL'] },
    { text: '#ungthu', track: 'FIXED', groups: ['HEALTH'] },
    { text: '#thuocladientu', track: 'ADAPTIVE', groups: ['HEALTH', 'COMMERCIAL'] }
  ];

  for (const h of hashtagsToSeed) {
    const { data: insertedHashtag, error: hError } = await supabase
      .from('hashtags')
      .upsert({ hashtag_text: h.text, keyword_track: h.track, is_active: true }, { onConflict: 'hashtag_text' })
      .select('hashtag_id')
      .single();

    if (hError) {
      console.error("Error inserting hashtag", h.text, hError);
      continue;
    }

    const hashtag_id = insertedHashtag.hashtag_id;

    // Delete existing mappings just to be safe
    await supabase.from('hashtag_group_mapping').delete().eq('hashtag_id', hashtag_id);

    // Insert new mappings
    const mappings = h.groups.map(g => ({ hashtag_id, group_id: g }));
    await supabase.from('hashtag_group_mapping').insert(mappings);
  }

  console.log("Seeding complete!");
}

seed();
