import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POSITIONS = ['对抗路', '打野', '中单', '发育路', '辅助'];
const POSITION_MAP: Record<string, string> = {
  '上单': '对抗路', '射手': '发育路', '游走': '辅助',
};
const RANK_SCORE: Record<string, number> = {
  '倔强青铜': 10, '秩序白银': 20, '荣耀黄金': 30, '尊贵铂金': 40,
  '永恒钻石': 50, '至尊星耀': 60, '最强王者': 70, '无双王者': 80,
  '荣耀王者': 90, '传奇王者': 100,
};

function getRankKey(rank: string): string {
  if (!rank) return '';
  const match = rank.match(/^[^\(]+/);
  return match ? match[0].trim() : rank.trim();
}

export async function POST(req: Request) {
  try {
    const { team_id } = await req.json();
    if (!team_id) return NextResponse.json({ error: '缺少 team_id' }, { status: 400 });
    const { data: profiles, error } = await supabase.from('player_profiles').select('*').eq('team_id', team_id);
    if (error) throw error;
    if (!profiles?.length) return NextResponse.json({ groups: [], unassigned: [], total_players: 0 });

    const players: any[] = [];
    for (const p of profiles) {
      let rawPos = p.main_positions?.[0] || '';
      const pos = POSITION_MAP[rawPos] || rawPos;
      if (!POSITIONS.includes(pos)) continue;
      const rankKey = getRankKey(p.current_rank);
      const score = RANK_SCORE[rankKey] || 50;
      players.push({ user_id: p.user_id, game_id: p.game_id || '未设置', main_position: pos, score });
    }
    if (players.length === 0) return NextResponse.json({ groups: [], unassigned: [], total_players: 0 });

    const byPos: Record<string, any[]> = {};
    for (const pos of POSITIONS) byPos[pos] = [];
    for (const p of players) byPos[p.main_position].push(p);
    for (const pos of POSITIONS) byPos[pos].sort((a, b) => b.score - a.score);

    const groups = [];
    let unassigned: any[] = [];
    const hasAllPositions = POSITIONS.every(pos => byPos[pos].length > 0);

    if (hasAllPositions) {
      const members = POSITIONS.map(pos => byPos[pos][0]);
      const avgScore = Math.round(members.reduce((s, m) => s + m.score, 0) / members.length);
      groups.push({ id: 0, name: 'A组', members, average_score: avgScore, position_coverage: members.map(m => m.main_position), is_complete: true, missing_positions: [] });
      for (const pos of POSITIONS) {
        for (let i = 1; i < byPos[pos].length; i++) unassigned.push(byPos[pos][i]);
      }
    } else {
      const members = POSITIONS.filter(pos => byPos[pos].length > 0).map(pos => byPos[pos][0]);
      const avgScore = members.length ? Math.round(members.reduce((s, m) => s + m.score, 0) / members.length) : 0;
      const missing = POSITIONS.filter(pos => byPos[pos].length === 0);
      groups.push({ id: 0, name: 'A组', members, average_score: avgScore, position_coverage: members.map(m => m.main_position), is_complete: false, missing_positions: missing });
      for (const pos of POSITIONS) {
        for (let i = 1; i < byPos[pos].length; i++) unassigned.push(byPos[pos][i]);
      }
    }

    return NextResponse.json({ success: true, groups, unassigned, total_players: players.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}