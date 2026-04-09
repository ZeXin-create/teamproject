import { supabase } from '../lib/supabase';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

// 发送通知给单个用户
export async function sendNotification(data: NotificationData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
        is_read: false
      });

    if (error) {
      console.error('发送通知失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('发送通知出错:', error);
    return false;
  }
}

// 发送通知给多个用户
export async function sendNotificationToUsers(
  userIds: string[],
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
): Promise<boolean> {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('批量发送通知失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('批量发送通知出错:', error);
    return false;
  }
}

// 发送通知给战队所有成员
export async function sendNotificationToTeam(
  teamId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string,
  excludeUserId?: string // 排除特定用户（如发送者自己）
): Promise<boolean> {
  try {
    // 获取战队所有成员
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (membersError) {
      console.error('获取战队成员失败:', membersError);
      return false;
    }

    if (!members || members.length === 0) {
      return true;
    }

    // 过滤掉排除的用户
    const userIds = members
      .map(m => m.user_id)
      .filter(id => id !== excludeUserId);

    if (userIds.length === 0) {
      return true;
    }

    return await sendNotificationToUsers(userIds, title, message, type, link);
  } catch (error) {
    console.error('发送战队通知出错:', error);
    return false;
  }
}

// 申请加入战队通知
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function notifyTeamApplication(teamId: string, applicantName: string, _applicantId: string): Promise<boolean> {
  try {
    // 获取战队队长
    const { data: captains, error: captainError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('role', '队长')
      .eq('status', 'active');

    if (captainError || !captains || captains.length === 0) {
      console.error('获取战队队长失败:', captainError || '没有找到队长');
      return false;
    }

    const captain = captains[0];

    return await sendNotification({
      user_id: captain.user_id,
      title: '新的入队申请',
      message: `${applicantName} 申请加入您的战队，请尽快处理。`,
      type: 'info',
      link: '/teams/applications'
    });
  } catch (error) {
    console.error('发送入队申请通知出错:', error);
    return false;
  }
}

// 申请被批准通知
export async function notifyApplicationApproved(userId: string, teamName: string, teamId: string): Promise<boolean> {
  return await sendNotification({
    user_id: userId,
    title: '入队申请已通过',
    message: `恭喜！您加入 ${teamName} 的申请已被批准。`,
    type: 'success',
    link: `/teams/${teamId}/space`
  });
}

// 申请被拒绝通知
export async function notifyApplicationRejected(userId: string, teamName: string): Promise<boolean> {
  return await sendNotification({
    user_id: userId,
    title: '入队申请未通过',
    message: `抱歉，您加入 ${teamName} 的申请未被批准。`,
    type: 'warning'
  });
}

// 被踢出战队通知
export async function notifyKickedFromTeam(userId: string, teamName: string): Promise<boolean> {
  return await sendNotification({
    user_id: userId,
    title: '被移出战队',
    message: `您已被移出 ${teamName} 战队。`,
    type: 'error'
  });
}

// 战队分组生成通知
export async function notifyGroupGenerated(teamId: string, senderId: string): Promise<boolean> {
  return await sendNotificationToTeam(
    teamId,
    '战队分组已生成',
    '队长已生成新的战队赛分组，请查看您的分组情况。',
    'info',
    '/teams/grouping',
    senderId
  );
}

// 比赛安排通知
export async function notifyMatchScheduled(
  teamId: string,
  matchDate: string,
  opponent: string,
  senderId: string
): Promise<boolean> {
  return await sendNotificationToTeam(
    teamId,
    '新的比赛安排',
    `${matchDate} 将与 ${opponent} 进行战队赛，请做好准备。`,
    'info',
    '/teams/matches',
    senderId
  );
}

// 比赛结果通知
export async function notifyMatchResult(
  teamId: string,
  opponent: string,
  result: '胜利' | '失败',
  senderId: string
): Promise<boolean> {
  const isWin = result === '胜利';
  return await sendNotificationToTeam(
    teamId,
    isWin ? '比赛胜利' : '比赛结果',
    `与 ${opponent} 的比赛${isWin ? '取得胜利' : '遗憾落败'}，${isWin ? '继续保持！' : '下次加油！'}`,
    isWin ? 'success' : 'info',
    '/teams/matches',
    senderId
  );
}

// 战队资料更新通知
export async function notifyTeamProfileUpdated(teamId: string, updaterName: string, senderId: string): Promise<boolean> {
  return await sendNotificationToTeam(
    teamId,
    '战队资料已更新',
    `${updaterName} 更新了战队资料。`,
    'info',
    '/teams/info',
    senderId
  );
}

// 新成员加入通知
export async function notifyNewMemberJoined(teamId: string, newMemberName: string, senderId: string): Promise<boolean> {
  return await sendNotificationToTeam(
    teamId,
    '新成员加入',
    `欢迎 ${newMemberName} 加入战队！`,
    'success',
    '/teams/members',
    senderId
  );
}

// 队长转让通知
export async function notifyCaptainTransferred(
  oldCaptainId: string,
  newCaptainId: string,
  teamName: string
): Promise<boolean> {
  try {
    // 通知原队长
    await sendNotification({
      user_id: oldCaptainId,
      title: '队长职位已转让',
      message: `您已将 ${teamName} 的队长职位转让给他人。`,
      type: 'info'
    });

    // 通知新队长
    await sendNotification({
      user_id: newCaptainId,
      title: '成为新队长',
      message: `您已成为 ${teamName} 的新队长，请好好管理战队！`,
      type: 'success'
    });

    return true;
  } catch (error) {
    console.error('发送队长转让通知出错:', error);
    return false;
  }
}

// 系统公告通知
export async function notifySystemAnnouncement(userId: string, title: string, message: string): Promise<boolean> {
  return await sendNotification({
    user_id: userId,
    title,
    message,
    type: 'info'
  });
}