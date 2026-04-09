import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, AlertCircle, GripVertical, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { Group, GroupAnalysis, TeamMember as TeamMemberType } from '../types';
import TeamMember from './TeamMember';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GroupCardProps {
  group: Group;
  locked: boolean;
  index: number;
  onMemberMove?: (member: TeamMemberType, fromGroup: string) => void;
  unassignedMembers?: TeamMemberType[];
  onAddMember?: (member: TeamMemberType, toGroup: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, locked, index, onMemberMove, unassignedMembers, onAddMember }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: group.name
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1
  };
  const [expanded, setExpanded] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'adjust'>( 'analysis' );

  // 计算分组的详细分析数据
  const analysis: GroupAnalysis = useMemo(() => {
    const totalScore = group.members.reduce((sum: number, member) => sum + member.score, 0);
    const averageScore = totalScore / group.members.length;
    const positionCount = group.members.reduce((count: Record<string, number>, member) => {
      count[member.main_position] = (count[member.main_position] || 0) + 1;
      return count;
    }, {});

    // 计算分组的优势和劣势
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (averageScore >= 90) {
      strengths.push('整体实力强劲');
    } else if (averageScore < 70) {
      weaknesses.push('整体实力有待提升');
    }

    // 检查位置分布
    const hasAllPositions = ['对抗路', '打野', '中单', '发育路', '辅助'].every(pos => 
      group.members.some(member => 
        member.main_position === pos || member.second_position === pos
      )
    );

    if (hasAllPositions) {
      strengths.push('位置分布均衡');
    } else {
      weaknesses.push('位置分布不均衡');
    }

    return {
      totalScore,
      averageScore,
      positionCount,
      strengths,
      weaknesses
    };
  }, [group.members]);



  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      style={style}
      ref={setNodeRef}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* 卡片头部 */}
      <div 
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`group-details-${index}`}
        aria-label={`${group.name} 分组卡片，点击展开详情`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50"
              aria-label="拖拽排序"
            >
              <GripVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 id={`group-title-${index}`} className="text-lg md:text-xl font-semibold text-blue-600 dark:text-blue-400">
              {group.name}
            </h2>
            {locked && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">已锁定</span>
            )}
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">平均分</p>
            <p className="font-medium text-lg text-gray-900 dark:text-white">{group.average_score}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">英雄重叠度</p>
            <p className="font-medium text-lg text-gray-900 dark:text-white">{group.hero_overlap_rate}%</p>
          </div>
        </div>
        {group.warning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-3 rounded-lg text-sm mb-4 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{group.warning}</p>
          </div>
        )}
        <div className="space-y-3 mt-4">
          {group.members.map((member, i) => (
            <TeamMember key={i} member={member} />
          ))}
        </div>
        {Array.isArray(group.missing_positions) && group.missing_positions.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-3 rounded-lg text-sm mt-4 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>缺少: {group.missing_positions.join(', ')}</p>
          </div>
        )}
      </div>

      {/* 展开的详细分析 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id={`group-details-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
            role="region"
            aria-labelledby={`group-title-${index}`}
          >
            <div className="bg-gray-50 dark:bg-gray-700/30">
              {/* 标签页导航 */}
              <div className="flex border-b border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 ${activeTab === 'analysis' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  <Brain className="w-4 h-4" />
                  分组分析
                </button>
                <button
                  onClick={() => setActiveTab('adjust')}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 ${activeTab === 'adjust' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  <RefreshCw className="w-4 h-4" />
                  手动调整
                </button>
              </div>

              {/* 标签页内容 */}
              <div className="p-5">
                {/* 分析标签页 */}
                {activeTab === 'analysis' && (
                  <div>
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      分组分析
                    </h3>
                    
                    {/* 详细数据 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">总得分</p>
                        <p className="font-medium text-lg text-gray-900 dark:text-white">{analysis.totalScore}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">队员数量</p>
                        <p className="font-medium text-lg text-gray-900 dark:text-white">{group.members.length}</p>
                      </div>
                    </div>

                    {/* 位置分布 */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">位置分布</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(analysis.positionCount).map(([position, count]) => (
                          <span key={position} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                            {position}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 优势和劣势 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          优势
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {analysis.strengths.length > 0 ? (
                            analysis.strengths.map((strength, i) => (
                              <li key={i}>{strength}</li>
                            ))
                          ) : (
                            <li>暂无明显优势</li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          劣势
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {analysis.weaknesses.length > 0 ? (
                            analysis.weaknesses.map((weakness, i) => (
                              <li key={i}>{weakness}</li>
                            ))
                          ) : (
                            <li>暂无明显劣势</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}



                {/* 手动调整标签页 */}
                {activeTab === 'adjust' && (
                  <div>
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      手动调整分组
                    </h3>
                    
                    {/* 队员列表 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">当前队员</h4>
                      <div className="space-y-3">
                        {group.members.map((member, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                            <TeamMember member={member} />
                            {!locked && onMemberMove && (
                              <button
                                onClick={() => onMemberMove(member, group.name)}
                                className="ml-auto bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 p-2 rounded-lg transition-all duration-300"
                                aria-label="移除队员"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 添加队员 */}
                    {!locked && onAddMember && unassignedMembers && unassignedMembers.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">添加队员</h4>
                          <button
                            onClick={() => setShowAddMember(!showAddMember)}
                            className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg text-sm transition-all duration-300 flex items-center gap-1"
                          >
                            <UserPlus className="w-4 h-4" />
                            {showAddMember ? '收起' : '展开'}
                          </button>
                        </div>
                        
                        {showAddMember && (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {unassignedMembers.map((member, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                                <TeamMember member={member} />
                                <button
                                  onClick={() => onAddMember(member, group.name)}
                                  className="ml-auto bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 p-2 rounded-lg transition-all duration-300"
                                  aria-label="添加队员"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default React.memo(GroupCard);
