import { analyze } from './analyze.js';

/**
 * Always recomputes from the current snapshots and current lists, so
 * editing the Allowed/Disabled/Allowed-pending lists immediately changes
 * what the analysis shows — nothing here is cached from upload time.
 */
export async function computeLiveAnalysis(db) {
  const snapshots = db.collection('snapshots');
  const lists = db.collection('lists');

  const [
    followersCurrent,
    followingCurrent,
    pendingCurrent,
    followersPrevious,
    followingPrevious,
    allowedDoc,
    disabledDoc,
    allowedPendingDoc,
  ] = await Promise.all([
    snapshots.findOne({ _id: 'followers_current' }),
    snapshots.findOne({ _id: 'following_current' }),
    snapshots.findOne({ _id: 'pending_current' }),
    snapshots.findOne({ _id: 'followers_previous' }),
    snapshots.findOne({ _id: 'following_previous' }),
    lists.findOne({ _id: 'allowed' }),
    lists.findOne({ _id: 'disabled' }),
    lists.findOne({ _id: 'allowed_pending' }),
  ]);

  if (!followersCurrent || !followingCurrent) {
    return {
      analysis: null,
      lastUploadAt: null,
      hasCurrent: false,
      hasPrevious: Boolean(followersPrevious && followingPrevious),
      currentFollowersCount: 0,
      currentFollowingCount: 0,
    };
  }

  const analysis = analyze({
    followers: followersCurrent.map || {},
    following: followingCurrent.map || {},
    pending: pendingCurrent?.map || {},
    previousFollowers: followersPrevious?.usernames || [],
    previousFollowing: followingPrevious?.usernames || [],
    allowed: allowedDoc?.usernames || [],
    disabled: disabledDoc?.usernames || [],
    allowedPending: allowedPendingDoc?.usernames || [],
  });

  return {
    analysis,
    lastUploadAt: followersCurrent.updatedAt || null,
    hasCurrent: true,
    hasPrevious: Boolean(followersPrevious && followingPrevious),
    currentFollowersCount: followersCurrent.usernames?.length || 0,
    currentFollowingCount: followingCurrent.usernames?.length || 0,
  };
}
