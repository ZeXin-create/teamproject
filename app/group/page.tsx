'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { useCache } from '@/app/hooks/useCache';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useSensor, useSensors, PointerSensor, TouchSensor, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { RefreshCw, CheckCircle, AlertCircle, UserPlus, Clock, History, ArrowLeft, Sparkles, Target, Shield, Swords } from 'lucide-react';

// 导入类型定义
import { Group, TeamMember as TeamMemberType } from './types';

// 导入组件
import GroupCard from './components/GroupCard';
import UnassignedMember from './components/UnassignedMember';
import Navbar from '@/app/components/Navbar';
import PageLayout from '@/app/components/layout/PageLayout';

export default function GroupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [unassigned, setUnassigned] = useState<TeamMemberType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locked, setLocked] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [historyGroups, setHistoryGroups] = useState<Group[][]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: userTeam } = useCache(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: member } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle();
    return member?.team_id || null;
  }, { key: 'user-team', ttl: 10 * 60 * 1000 });

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
      
      if (data.error) {
        throw new Error(data.error);
      }
      
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((item) => item.name === String(active.id));
        const newIndex = items.findIndex((item) => item.name === String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleMemberMove = useCallback((member: TeamMemberType, fromGroup: string) => {
    setGroups((prevGroups) => {
      return prevGroups.map((group) => {
        if (group.name === fromGroup) {
          return {
            ...group,
            members: group.members.filter((m) => m.user_id !== member.user_id)
          };
        }
        return group;
      });
    });
    setUnassigned((prevUnassigned) => [...prevUnassigned, member]);
  }, []);

  const handleAddMember = useCallback((member: TeamMemberType, toGroup: string) => {
    setGroups((prevGroups) => {
      return prevGroups.map((group) => {
        if (group.name === toGroup) {
          return {
            ...group,
            members: [...group.members, member]
          };
        }
        return group;
      });
    });
    setUnassigned((prevUnassigned) => {
      return prevUnassigned.filter((m) => m.user_id !== member.user_id);
    });
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Navbar />
      <PageLayout paddingTop="pt-20 md:pt-24">
        {/* 背景装饰 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
        {/* 页面头部 - 玻璃拟态卡片 */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 text-pink-600 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg shadow-pink-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  智能分组系统
                </h1>
                <p className="text-sm text-gray-500 mt-1">AI驱动的战队分组方案</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed pl-16">
              系统会根据队员的位置、段位和擅长英雄进行智能分组，确保每组的平衡性和战斗力
            </p>
          </div>
        </motion.div>

        {/* 操作按钮 - 呼吸感设计 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <motion.button 
            onClick={handleGroup} 
            disabled={loading || locked}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              btn-primary px-8 py-4
              ${loading || locked ? 'btn-loading' : ''}
            `}
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>分组中...</span>
                </>
              ) : locked ? (
                <>
                  <Shield className="w-5 h-5" />
                  <span>已锁定</span>
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5" />
                  <span>智能分组</span>
                </>
              )}
            </span>
          </motion.button>

          {!locked && groups.length > 0 && (
            <motion.button 
              onClick={handleConfirmGroup} 
              disabled={confirmLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`btn-primary px-8 py-4 ${confirmLoading ? 'btn-loading' : ''}`}
            >
              <span className="flex items-center gap-2">
                {confirmLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>确认中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>锁定分组</span>
                  </>
                )}
              </span>
            </motion.button>
          )}

          <motion.button 
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && teamId) {
                fetchHistoryGroups();
              }
            }}
            disabled={!teamId}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`btn-secondary px-8 py-4 ${!teamId ? 'opacity-50' : ''}`}
          >
            <span className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <span>{showHistory ? '隐藏历史' : '分组历史'}</span>
            </span>
          </motion.button>
        </motion.div>

        {/* 提示信息 - 玻璃拟态 */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-red-500/10"
            >
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-red-700 font-medium">{error}</p>
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-green-500/10"
            >
              <div className="p-2 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">{success}</p>
            </motion.div>
          )}
          
          {progress && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-blue-500/10"
            >
              <div className="p-2 bg-blue-100 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
              <p className="text-blue-700 font-medium">{progress}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 分组结果 */}
        {groups.length > 0 && (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map(group => group.name)}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {groups.map((group, idx) => (
                  <GroupCard 
                    key={idx} 
                    group={group} 
                    locked={locked} 
                    index={idx}
                    onMemberMove={handleMemberMove}
                    onAddMember={handleAddMember}
                    unassignedMembers={unassigned}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 历史分组 */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="card">
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <History className="w-5 h-5 text-purple-600" />
                  </div>
                  历史分组
                </h2>
                
                {historyLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                  </div>
                ) : historyGroups.length > 0 ? (
                  <div className="space-y-6">
                    {historyGroups.map((historyGroup, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm"
                      >
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                          <Target className="w-4 h-4 text-pink-500" />
                          分组记录 #{historyGroups.length - idx}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {historyGroup.map((group, groupIdx) => (
                            <div key={groupIdx} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100">
                              <h4 className="font-semibold mb-2 text-pink-600">{group.name}</h4>
                              <div className="text-sm text-gray-500 mb-3">
                                平均分: <span className="font-medium text-gray-700">{group.average_score}</span> | 英雄重叠: <span className="font-medium text-gray-700">{group.hero_overlap_rate}%</span>
                              </div>
                              <div className="space-y-2">
                                {group.members.map((member: { game_id: string; main_position: string; }, memberIdx: number) => (
                                  <div key={memberIdx} className="flex items-center gap-2 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                                      {member.game_id.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-700">{member.game_id}</span>
                                    <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full">{member.main_position}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-gray-500">暂无历史分组记录</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 未分配队员 */}
        <AnimatePresence>
          {unassigned.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="card"
            >
              <h3 className="font-bold mb-6 text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                </div>
                未分配队员 <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-sm">{unassigned.length}</span>
              </h3>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {unassigned.map((p, idx) => (
                  <motion.div
                    key={p.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <UnassignedMember member={p} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 空状态 */}
        {!locked && groups.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center p-8 sm:p-12"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-7xl mb-6"
            >
              🎮
            </motion.div>
            <h3 className="text-2xl font-bold mb-3 text-gray-800">还没有分组</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              点击「开始分组」按钮，系统会根据队员的位置、段位和擅长英雄进行智能分组
            </p>
            <motion.button 
              onClick={handleGroup} 
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`btn-primary px-8 py-4 ${loading ? 'btn-loading' : ''}`}
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>分组中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>智能分组</span>
                  </>
                )}
              </span>
            </motion.button>
          </motion.div>
        )}
      </div>
      </PageLayout>

      {/* 自定义滚动条样式 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(236, 72, 153, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ec4899, #a855f7);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #db2777, #9333ea);
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
