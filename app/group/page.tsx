'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useCache } from '@/app/hooks/useCache';
import { motion } from 'framer-motion';
import { DndContext, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Users, RefreshCw, CheckCircle, AlertCircle, UserPlus, Clock, History } from 'lucide-react';

// 导入类型定义
import { Group, TeamMember as TeamMemberType } from './types';

// 导入组件
import GroupCard from './components/GroupCard';
import UnassignedMember from './components/UnassignedMember';

export default function GroupPage() {
  const [mounted, setMounted] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [unassigned, setUnassigned] = useState<TeamMemberType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locked, setLocked] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [progress, setProgress] = useState<string>(''); // 分组进度提示
  const [historyGroups, setHistoryGroups] = useState<Group[][]>([]); // 历史分组
  const [showHistory, setShowHistory] = useState(false); // 是否显示历史分组
  const [historyLoading, setHistoryLoading] = useState(false); // 历史分组加载状态

  useEffect(() => { setMounted(true); }, []);

  // 使用 useCache 缓存战队信息
  const { data: userTeam, loading: teamLoading } = useCache(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: member } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle();
    return member?.team_id || null;
  }, { key: 'user-team', ttl: 10 * 60 * 1000 }); // 10分钟缓存

  useEffect(() => {
    if (userTeam) {
      setTeamId(userTeam);
    }
  }, [userTeam]);

  async function handleGroup() {
    if (!teamId) return setError('未找到战队，请先加入一个战队');
    setLoading(true);
    setError('');
    setSuccess('');
    setProgress('');
    try {
      setProgress('正在获取队员数据...');
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        const progressSteps = [
          '正在分析队员数据...',
          '正在计算最佳组合...',
          '正在分配队员到各组...',
          '正在生成分组结果...'
        ];
        const currentIndex = progressSteps.indexOf(progress);
        if (currentIndex < progressSteps.length - 1) {
          setProgress(progressSteps[currentIndex + 1]);
        }
      }, 1000);

      const res = await fetch('/api/group/auto', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ team_id: teamId }) 
      });
      clearInterval(progressInterval);
      
      // 检查网络错误
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = '分组失败';
        
        switch (res.status) {
          case 400:
            errorMessage = data.error || '请求参数错误，请检查战队信息';
            break;
          case 401:
            errorMessage = '未授权，请先登录';
            break;
          case 404:
            errorMessage = '战队不存在，请检查战队信息';
            break;
          case 500:
            errorMessage = '服务器错误，请稍后重试';
            break;
          default:
            errorMessage = data.error || '分组失败，请稍后重试';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      
      // 检查业务逻辑错误
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 检查数据完整性
      if (!data.groups && !data.unassigned) {
        throw new Error('分组结果为空，请检查队员数据');
      }
      
      setGroups(data.groups || []);
      setUnassigned(data.unassigned || []);
      setSuccess('分组成功，共 ' + (data.groups?.length || 0) + ' 组');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  async function handleConfirmGroup() {
    if (!teamId) return setError('未找到战队，请先加入一个战队');
    if (groups.length === 0) return setError('没有可确认的分组，请先进行分组');
    setConfirmLoading(true);
    try {
      const res = await fetch('/api/group/confirm', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ team_id: teamId, groups }) 
      });
      
      // 检查网络错误
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = '确认分组失败';
        
        switch (res.status) {
          case 400:
            errorMessage = data.error || '请求参数错误，请检查分组信息';
            break;
          case 401:
            errorMessage = '未授权，请先登录';
            break;
          case 404:
            errorMessage = '战队不存在，请检查战队信息';
            break;
          case 500:
            errorMessage = '服务器错误，请稍后重试';
            break;
          default:
            errorMessage = data.error || '确认分组失败，请稍后重试';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      
      // 检查业务逻辑错误
      if (data.error) {
        throw new Error(data.error);
      }
      
      setLocked(true);
      setSuccess('分组已确认');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirmLoading(false);
    }
  }

  // 获取历史分组
  async function fetchHistoryGroups() {
    if (!teamId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/group/history?team_id=${teamId}`);
      if (!res.ok) throw new Error('获取历史分组失败');
      const data = await res.json();
      setHistoryGroups(data.groups || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  // 拖拽功能相关
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor)
  );

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((item) => item.name === active.id);
        const newIndex = items.findIndex((item) => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-100">
      <div className="p-4 sm:p-5 md:p-6 max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Users className="w-6 sm:w-7 md:w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">智能分组系统</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            系统会根据队员的位置、段位和擅长英雄进行智能分组，确保每组的平衡性和战斗力
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button 
            onClick={handleGroup} 
            disabled={loading || locked} 
            aria-label={loading ? "分组中..." : locked ? "已锁定" : "开始分组"}
            aria-busy={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                <span>分组中...</span>
              </div>
            ) : locked ? '已锁定' : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>开始分组</span>
              </div>
            )}
          </button>
          {!locked && groups.length > 0 && (
            <button 
              onClick={handleConfirmGroup} 
              disabled={confirmLoading} 
              aria-label={confirmLoading ? "确认中..." : "确认分组"}
              aria-busy={confirmLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {confirmLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                  <span>确认中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  <span>确认分组</span>
                </div>
              )}
            </button>
          )}
          <button 
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && teamId) {
                fetchHistoryGroups();
              }
            }} 
            disabled={!teamId}
            aria-label={showHistory ? "隐藏历史分组" : "显示历史分组"}
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" aria-hidden="true" />
              <span>{showHistory ? '隐藏历史分组' : '历史分组'}</span>
            </div>
          </button>
        </div>

        {/* 提示信息 */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 border border-red-200 dark:border-red-800 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg mb-6 border border-green-200 dark:border-green-800 flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </motion.div>
        )}
        {progress && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-lg mb-6 border border-blue-200 dark:border-blue-800 flex items-start gap-3"
          >
            <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{progress}</p>
          </motion.div>
        )}

        {/* 分组结果 */}
        {groups.length > 0 && (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map(group => group.name)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {groups.map((group, idx) => (
                  <GroupCard key={idx} group={group} locked={locked} index={idx} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 历史分组 */}
        {showHistory && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              历史分组
            </h2>
            {historyLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : historyGroups.length > 0 ? (
              <div className="space-y-6">
                {historyGroups.map((historyGroup, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">分组记录 #{historyGroups.length - idx}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyGroup.map((group, groupIdx) => (
                        <div key={groupIdx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                          <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">{group.name}</h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            平均分: {group.average_score} | 英雄重叠度: {group.hero_overlap_rate}%
                          </div>
                          <div className="space-y-2">
                            {group.members.map((member: any, memberIdx) => (
                              <div key={memberIdx} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-green-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">{member.game_id.charAt(0).toUpperCase()}</span>
                                </div>
                                <span>{member.game_id} ({member.main_position})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">暂无历史分组记录</p>
              </div>
            )}
          </div>
        )}

        {/* 未分配队员 */}
        {unassigned.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              未分配队员 ({unassigned.length})
            </h3>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <div className="space-y-3">
                {unassigned.map((p) => (
                  <UnassignedMember key={p.user_id} member={p} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!locked && groups.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 text-center transition-all duration-300 hover:shadow-md">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🎮</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900 dark:text-white">还没有分组</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto">
              点击「开始分组」按钮，系统会根据队员的位置、段位和擅长英雄进行智能分组，确保每组的平衡性和战斗力
            </p>
            <button 
              onClick={handleGroup} 
              disabled={loading} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>分组中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>开始分组</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}