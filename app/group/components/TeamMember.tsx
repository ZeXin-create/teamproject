import React from 'react';
import { TeamMember as TeamMemberType } from '../types';

const TeamMember: React.FC<{ member: TeamMemberType }> = ({ member }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-all duration-300">
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-green-500 flex items-center justify-center">
        <span className="text-white font-medium">{member.game_id.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">{member.game_id}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {member.main_position}{member.second_position ? ` / ${member.second_position}` : ''} - {member.score}分
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeamMember);
