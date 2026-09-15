function toRows(usernames, urlSource) {
  return usernames.map((username) => ({
    username,
    url: (urlSource && urlSource[username]) || `https://www.instagram.com/${username}`,
  }));
}

/**
 * Reproduces the comparisons from the original desktop tool:
 *  - who you follow but who doesn't follow back (excluding allowed/disabled)
 *  - allowed accounts that you no longer follow (list hygiene)
 *  - pending follow requests split into "allowed" vs "can remove"
 *  - what actually changed since the last committed snapshot (previous vs current)
 *  - allowed accounts that started following back (candidates to remove from "allowed")
 */
export function analyze({
  followers = {},
  following = {},
  pending = {},
  previousFollowers = [],
  previousFollowing = [],
  allowed = [],
  disabled = [],
  allowedPending = [],
}) {
  const followersKeys = Object.keys(followers);
  const followingKeys = Object.keys(following);
  const pendingKeys = Object.keys(pending);

  const notFollowingBack = followingKeys.filter(
    (k) => !followers[k] && !allowed.includes(k) && !disabled.includes(k)
  );

  const followersNotFollowedBack = followersKeys.filter((k) => !following[k]);

  const notInAllowedListAnymore = allowed.filter((k) => !following[k]);

  const pendingAllowed = pendingKeys.filter((k) => allowedPending.includes(k));
  const pendingCanRemove = pendingKeys.filter((k) => !allowedPending.includes(k));

  const existingFollowingRemoved = previousFollowing.filter((u) => !following[u]);
  const existingFollowingAdded = followingKeys.filter((u) => !previousFollowing.includes(u));
  const existingFollowerRemoved = previousFollowers.filter((u) => !followers[u]);
  const existingFollowerAdded = followersKeys.filter((u) => !previousFollowers.includes(u));

  const removedFromFollowingOnly = existingFollowingRemoved.filter(
    (u) => !existingFollowerRemoved.includes(u)
  );
  const removedFromFollowersOnly = existingFollowerRemoved.filter(
    (u) => !existingFollowingRemoved.includes(u)
  );

  const addedToFollowingOnly = existingFollowingAdded.filter(
    (u) => !existingFollowerAdded.includes(u)
  );
  const addedToFollowersOnly = existingFollowerAdded.filter(
    (u) => !existingFollowingAdded.includes(u)
  );

  const commonRemoved = existingFollowingRemoved.filter((u) => existingFollowerRemoved.includes(u));
  const commonAdded = existingFollowingAdded.filter((u) => existingFollowerAdded.includes(u));

  const startedFollowingCanRemoveFromAllowed = allowed.filter((k) => followers[k]);

  return {
    counts: {
      followers: followersKeys.length,
      following: followingKeys.length,
      pending: pendingKeys.length,
      allowed: allowed.length,
      disabled: disabled.length,
    },
    notFollowingBack: toRows(notFollowingBack, following),
    followersNotFollowedBack: toRows(followersNotFollowedBack, followers),
    notInAllowedListAnymore: toRows(notInAllowedListAnymore),
    pendingAllowed: toRows(pendingAllowed, pending),
    pendingCanRemove: toRows(pendingCanRemove, pending),
    removedFromFollowingOnly: toRows(removedFromFollowingOnly),
    removedFromFollowersOnly: toRows(removedFromFollowersOnly),
    addedToFollowingOnly: toRows(addedToFollowingOnly, following),
    addedToFollowersOnly: toRows(addedToFollowersOnly, followers),
    commonRemoved: toRows(commonRemoved),
    commonAdded: toRows(commonAdded, following),
    startedFollowingCanRemoveFromAllowed: toRows(startedFollowingCanRemoveFromAllowed, followers),
  };
}
