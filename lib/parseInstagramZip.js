import JSZip from 'jszip';

const STRING_LIST_DATA = 'string_list_data';

// Instagram's export zip nests these files under a path like
// <export>/connections/followers_and_following/<name>.json, but the exact
// root folder name varies, so we just search for the filename anywhere in
// the archive.
function findEntry(files, candidateNames) {
  const entries = Object.keys(files);
  for (const candidate of candidateNames) {
    const match = entries.find(
      (name) => !files[name].dir && name.toLowerCase().endsWith(candidate)
    );
    if (match) return files[match];
  }
  return null;
}

async function readJson(entry) {
  if (!entry) return null;
  const text = await entry.async('string');
  return JSON.parse(text);
}

// Instagram's export sometimes points hrefs at https://www.instagram.com/_u/<user>
// (or other variants) instead of the plain profile URL. Rather than trying to
// pattern-match every variant, we ignore the given href entirely and always
// build the clean profile URL straight from the username.
function profileUrl(username) {
  return `https://www.instagram.com/${username}`;
}

function extractFollowers(json) {
  const followers = {};
  if (!json) return followers;
  // followers_1.json is a top-level array. Some older exports wrap it in
  // { relationships_followers: [...] }.
  const list = Array.isArray(json) ? json : json.relationships_followers || [];
  for (const item of list) {
    const stringListData = item[STRING_LIST_DATA] || [];
    for (const entry of stringListData) {
      const value = entry.value;
      if (!value) continue;
      followers[value] = profileUrl(value);
    }
  }
  return followers;
}

function extractFollowing(json) {
  const following = {};
  if (!json) return following;
  const list = json.relationships_following || (Array.isArray(json) ? json : []);
  for (const item of list) {
    const stringListData = item[STRING_LIST_DATA] || [];
    for (const entry of stringListData) {
      const key = item.title || entry.value;
      if (!key) continue;
      following[key] = profileUrl(key);
    }
  }
  return following;
}

function extractPending(json) {
  const pending = {};
  if (!json) return pending;
  const list = Array.isArray(json) ? json : [];
  for (const item of list) {
    const labelValues = item.label_values || [];
    for (const lv of labelValues) {
      if (lv.label === 'Username' && lv.value) {
        pending[lv.value] = profileUrl(lv.value);
      }
    }
  }
  return pending;
}

/**
 * @param {Buffer} buffer - raw bytes of the uploaded Instagram data export zip
 */
export async function parseInstagramZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const followersEntry = findEntry(zip.files, ['followers_1.json', 'followers.json']);
  const followingEntry = findEntry(zip.files, ['following.json']);
  const pendingEntry = findEntry(zip.files, ['pending_follow_requests.json']);

  if (!followersEntry || !followingEntry) {
    throw new Error(
      'Could not find followers_1.json / following.json inside the zip. Upload the "followers_and_following" folder from your Instagram data export, zipped.'
    );
  }

  const [followersJson, followingJson, pendingJson] = await Promise.all([
    readJson(followersEntry),
    readJson(followingEntry),
    readJson(pendingEntry),
  ]);

  return {
    followers: extractFollowers(followersJson),
    following: extractFollowing(followingJson),
    pending: extractPending(pendingJson),
  };
}
