import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { heroes } from '../../services/teamGroupingService';

export async function POST() {
  try {
    console.log('开始同步英雄数据到数据库...');
    
    // 清空现有英雄数据
    const deleteResponse = await supabase
      .from('heroes')
      .delete()
      .neq('id', 0);
    
    const deleteError = 'error' in deleteResponse ? deleteResponse.error : null;
    
    if (deleteError) {
      console.error('清空英雄表失败:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: '清空英雄表失败: ' + (typeof deleteError === 'object' && deleteError !== null && 'message' in deleteError ? deleteError.message : String(deleteError)) 
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
    
    const insertResponse = await supabase
      .from('heroes')
      .insert(heroesData);
    
    const insertError = 'error' in insertResponse ? insertResponse.error : null;
    
    if (insertError) {
      console.error('插入英雄数据失败:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: '插入英雄数据失败: ' + (typeof insertError === 'object' && insertError !== null && 'message' in insertError ? insertError.message : String(insertError)) 
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
    const heroesResponse = await supabase
      .from('heroes')
      .select('*')
      .order('id');
    
    const data = 'data' in heroesResponse ? heroesResponse.data : null;
    const error = 'error' in heroesResponse ? heroesResponse.error : null;
    
    if (error) {
      console.error('获取英雄数据失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取英雄数据失败: ' + (typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)) 
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