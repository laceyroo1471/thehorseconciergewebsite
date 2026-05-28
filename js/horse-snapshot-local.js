/**
 * Web-only snapshot fields (not synced to Firebase).
 * Keyed per user + horse document id.
 */
export function snapshotStorageKey(uid, horseId) {
  return "thc_web_snapshot_v1:" + uid + ":" + horseId;
}

export function loadLocalSnapshot(uid, horseId) {
  if (!uid || !horseId) return defaultSnapshot();
  try {
    var raw = localStorage.getItem(snapshotStorageKey(uid, horseId));
    if (!raw) return defaultSnapshot();
    var o = JSON.parse(raw);
    if (!o || typeof o !== "object") return defaultSnapshot();
    return normalizeSnapshot(o);
  } catch (err) {
    return defaultSnapshot();
  }
}

export function saveLocalSnapshot(uid, horseId, data) {
  if (!uid || !horseId) return;
  try {
    localStorage.setItem(snapshotStorageKey(uid, horseId), JSON.stringify(normalizeSnapshot(data)));
  } catch (err) {
    console.warn("snapshot local save failed", err);
  }
}

function defaultSnapshot() {
  return {
    lastFarrierDate: "",
    lastFeedChangeDate: "",
    lastFeedChangeNote: "",
    nextCareEvent: { date: "", type: "", note: "" },
  };
}

function normalizeSnapshot(o) {
  var d = defaultSnapshot();
  if (typeof o.lastFarrierDate === "string") d.lastFarrierDate = o.lastFarrierDate;
  if (typeof o.lastFeedChangeDate === "string") d.lastFeedChangeDate = o.lastFeedChangeDate;
  if (typeof o.lastFeedChangeNote === "string") d.lastFeedChangeNote = o.lastFeedChangeNote;
  if (o.nextCareEvent && typeof o.nextCareEvent === "object") {
    d.nextCareEvent = {
      date: typeof o.nextCareEvent.date === "string" ? o.nextCareEvent.date : "",
      type: typeof o.nextCareEvent.type === "string" ? o.nextCareEvent.type : "",
      note: typeof o.nextCareEvent.note === "string" ? o.nextCareEvent.note : "",
    };
  }
  return d;
}

export function daysSinceDateString(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  var parts = isoDate.split("-");
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(day)) return null;
  var then = new Date(y, m, day);
  var now = new Date();
  var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var diffMs = startToday.getTime() - then.getTime();
  var days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 0) return null;
  return days;
}

export function hasCompleteNextCareEvent(snap) {
  if (!snap || !snap.nextCareEvent) return false;
  return !!(snap.nextCareEvent.date && snap.nextCareEvent.type);
}
