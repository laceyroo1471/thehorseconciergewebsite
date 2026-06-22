/**
 * Sync web Horse Snapshot fields to Firestore (same collections as thc-native app).
 */
(function (global) {
  function timestampToMs(val) {
    if (val == null) return 0;
    if (typeof val === "number" && !isNaN(val)) return val < 1e12 ? val * 1000 : val;
    if (val && typeof val.toDate === "function") {
      try {
        return val.toDate().getTime();
      } catch (e) {
        return 0;
      }
    }
    if (val && val.seconds != null) return val.seconds * 1000;
    if (typeof val === "string") {
      var t = Date.parse(val);
      return isNaN(t) ? 0 : t;
    }
    return 0;
  }

  function careDateToYmd(d) {
    if (d == null) return null;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    if (d && typeof d.toDate === "function") {
      try {
        return d.toDate().toISOString().split("T")[0];
      } catch (e) {
        return null;
      }
    }
    if (d && d.seconds != null) {
      return new Date(d.seconds * 1000).toISOString().split("T")[0];
    }
    return null;
  }

  function mapWebAppointmentType(webType) {
    switch (webType) {
      case "Farrier":
        return "farrier";
      case "Vet":
        return "vet";
      case "Dental":
      case "Bodywork":
      case "Other":
      default:
        return "other";
    }
  }

  function mapCalendarTypeToWeb(type, customType, title) {
    var t = (type || "").toLowerCase();
    if (t === "farrier") return "Farrier";
    if (t === "vet") return "Vet";
    if (customType === "Dental" || /dental/i.test(title || "")) return "Dental";
    if (customType === "Bodywork" || /bodywork/i.test(title || "")) return "Bodywork";
    return "Other";
  }

  function appointmentTitle(webType, note) {
    if (note && note.trim()) return note.trim().slice(0, 120);
    return webType + " appointment";
  }

  function deriveFarrierDate(records) {
    var today = new Date().toISOString().split("T")[0];
    var bestYmd = "";
    var bestLogged = 0;

    records.forEach(function (r) {
      if ((r.type || "").toLowerCase() !== "farrier") return;
      if (r.archivedAt || r.isArchived === true) return;
      var ymd = careDateToYmd(r.date);
      if (!ymd || ymd > today) return;
      var loggedMs = Math.max(timestampToMs(r.createdAt), timestampToMs(r.updatedAt));
      if (!bestYmd || ymd > bestYmd || (ymd === bestYmd && loggedMs > bestLogged)) {
        bestYmd = ymd;
        bestLogged = loggedMs;
      }
    });

    return bestYmd;
  }

  function deriveFeedSnapshot(entries) {
    var best = null;
    var bestMs = 0;

    entries.forEach(function (e) {
      if (e.archivedAt || e.isArchived === true) return;
      var ms = Math.max(timestampToMs(e.updatedAt), timestampToMs(e.createdAt));
      var ymd = careDateToYmd(e.date);
      if (ymd) ms = Math.max(ms, new Date(ymd + "T12:00:00").getTime());
      if (ms > bestMs) {
        bestMs = ms;
        best = e;
      }
    });

    if (!best) return { lastFeedChangeDate: "", lastFeedChangeNote: "" };
    var dateYmd = bestMs ? new Date(bestMs).toISOString().split("T")[0] : "";
    return {
      lastFeedChangeDate: dateYmd,
      lastFeedChangeNote: (best.notes || best.what || "").trim(),
    };
  }

  function deriveNextAppointment(events, horseId) {
    var today = new Date().toISOString().split("T")[0];
    var candidates = [];

    events.forEach(function (e) {
      if (e.isArchived) return;
      var applies =
        e.horseId === horseId ||
        (Array.isArray(e.horseIds) && e.horseIds.indexOf(horseId) >= 0);
      if (!applies) return;
      var ds = careDateToYmd(e.date);
      if (!ds || ds < today) return;
      candidates.push({
        date: ds,
        type: mapCalendarTypeToWeb(e.type, e.customType, e.title),
        note: (e.notes || "").trim(),
        title: (e.title || "").trim(),
      });
    });

    candidates.sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });

    var first = candidates[0];
    if (!first) return { date: "", type: "", note: "" };
    return {
      date: first.date,
      type: first.type,
      note: first.note || first.title,
    };
  }

  function fetchSyncedSnapshot(db, uid, horseId) {
    return Promise.all([
      db.collection("careRecords").where("horseId", "==", horseId).where("userId", "==", uid).get(),
      db.collection("feedEntries").where("horseId", "==", horseId).where("userId", "==", uid).get(),
      db.collection("calendarEvents").where("userId", "==", uid).get(),
    ]).then(function (results) {
      var careRecords = [];
      results[0].forEach(function (doc) {
        careRecords.push(doc.data());
      });
      var feedEntries = [];
      results[1].forEach(function (doc) {
        feedEntries.push(doc.data());
      });
      var calendarEvents = [];
      results[2].forEach(function (doc) {
        calendarEvents.push(doc.data());
      });

      var feed = deriveFeedSnapshot(feedEntries);
      var next = deriveNextAppointment(calendarEvents, horseId);

      return {
        lastFarrierDate: deriveFarrierDate(careRecords),
        lastFeedChangeDate: feed.lastFeedChangeDate,
        lastFeedChangeNote: feed.lastFeedChangeNote,
        nextCareEvent: next,
      };
    });
  }

  function saveFarrierVisit(db, uid, horseId, date) {
    var now = new Date();
    return db.collection("careRecords").add({
      type: "farrier",
      title: "Farrier visit",
      date: date,
      nextDue: "",
      provider: "",
      notes: "Added from web Horse Snapshot",
      horseId: horseId,
      userId: uid,
      createdAt: now,
      sourceWebSnapshot: true,
    });
  }

  function saveFeedUpdate(db, uid, horseId, date, note) {
    var trimmedNote = (note || "").trim();
    var createdAt = new Date(date + "T12:00:00");
    if (isNaN(createdAt.getTime())) createdAt = new Date();

    return db.collection("feedEntries").add({
      what: trimmedNote ? trimmedNote.slice(0, 120) : "Feed change",
      brand: "",
      amount: "",
      frequency: "",
      notes: trimmedNote || "Feed change recorded on web",
      horseId: horseId,
      userId: uid,
      createdAt: createdAt,
      sourceWebSnapshot: true,
    });
  }

  function saveNextAppointment(db, uid, horseId, horseName, date, webType, note) {
    var calType = mapWebAppointmentType(webType);
    var title = appointmentTitle(webType, note);
    var trimmedNote = (note || "").trim();
    var now = new Date();
    var name = horseName || "Horse";

    var eventData = {
      title: title,
      type: calType,
      date: date,
      time: "09:00",
      notes: trimmedNote,
      userId: uid,
      horseId: horseId,
      horseIds: [horseId],
      horseNames: [name],
      createdAt: now,
      updatedAt: now,
      sourceWebSnapshot: true,
    };

    if (calType === "other" && (webType === "Dental" || webType === "Bodywork")) {
      eventData.customType = webType;
    }

    return db
      .collection("calendarEvents")
      .add(eventData)
      .then(function () {
        return db.collection("careRecords").add({
          type: calType,
          title: title,
          date: date,
          nextDue: "",
          provider: "",
          notes: trimmedNote || "Scheduled from web Horse Snapshot",
          horseId: horseId,
          userId: uid,
          createdAt: now,
          sourceWebSnapshot: true,
        });
      });
  }

  global.ThcSnapshotSync = {
    fetchSyncedSnapshot: fetchSyncedSnapshot,
    saveFarrierVisit: saveFarrierVisit,
    saveFeedUpdate: saveFeedUpdate,
    saveNextAppointment: saveNextAppointment,
  };
})(window);
