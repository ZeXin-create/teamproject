import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { heroes } from '../../services/teamGroupingService';

export async function POST() {
  try {
    console.log('开始同步英雄数据到数据库...');
    
    // 清空现有英雄数据
    const { error: deleteError } = await supabase
      .from('heroes')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.error('清空英雄表失败:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: '清空英雄表失败: ' + deleteError.message 
      }, { status: 500 });
    }
    
    console.log('已清空现有英雄数据');
    
    // 插入新英雄数据
    const heroesData = heroes.map(hero => ({
      id: hero.id,
      name: hero.name,
      position: hero.position,
      avatar: hero.avatar || null
    }));
    
    const { error: insertError } = await supabase
      .from('heroes')
      .insert(heroesData);
    
    if (insertError) {
      console.error('插入英雄数据失败:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: '插入英雄数据失败: ' + insertError.message 
      }, { status: 500 });
    }
    
    console.log(`成功同步 ${heroesData.length} 个英雄到数据库`);
    
    return NextResponse.json({ 
      success: true, 
      message: `成功同步 ${heroesData.length} 个英雄到数据库`,
      count: heroesData.length
    });
    
  } catch (error) {
    console.error('同步英雄数据出错:', error);
    return NextResponse.json({ 
      success: false, 
      error: '同步英雄数据出错: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('heroes')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('获取英雄数据失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取英雄数据失败: ' + error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      heroes: data,
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('获取英雄数据出错:', error);
    return NextResponse.json({ 
      success: false, 
      error: '获取英雄数据出错: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}