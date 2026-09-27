/**
 * Rule-based proctoring session summary.
 *
 * Generated entirely in the browser from real backend data (events,
 * behavioural violations, suspicion score) using deterministic rules —
 * no external API, no API key, no LLM call. Numbers and claims in the
 * summary are always derived from the actual data passed in; nothing is
 * invented.
 *
 * Weights match the backend scoring:
 *   NO_FACE 2 · MULTIPLE_FACES 5 · MOBILE_DETECTED 5 · BOOK_DETECTED 3
 *   TAB_SWITCH 3 · COPY_PASTE 4 · RIGHT_CLICK 2 · FULLSCREEN_EXIT 3
 *   UNKNOWN_FACE 6
 */

const TYPE_WEIGHTS = {
  NO_FACE: 2,
  MULTIPLE_FACES: 5,
  MOBILE_DETECTED: 5,
  BOOK_DETECTED: 3,
  TAB_SWITCH: 3,
  COPY_PASTE: 4,
  RIGHT_CLICK: 2,
  FULLSCREEN_EXIT: 3,
  UNKNOWN_FACE: 6,
};

const TYPE_LABELS = {
  NO_FACE: "face-absence",
  MULTIPLE_FACES: "multiple-person",
  MOBILE_DETECTED: "mobile-phone",
  BOOK_DETECTED: "book",
  TAB_SWITCH: "tab-switch",
  COPY_PASTE: "copy/paste",
  RIGHT_CLICK: "right-click",
  FULLSCREEN_EXIT: "fullscreen-exit",
  UNKNOWN_FACE: "unknown-person",
};

const riskBand = (score) => {
  if (score >= 20) return { label: "High risk", color: "red" };
  if (score >= 10) return { label: "Medium risk", color: "amber" };
  if (score >= 1) return { label: "Low risk", color: "yellow" };
  return { label: "Clean", color: "green" };
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/**
 * @param {Array}  incidents  merged list of { eventType|type, timestamp|at, details }
 * @param {number} score      suspicion score from backend
 * @returns {{
 *   counts: Record<string, number>,
 *   score: number,
 *   risk: {label: string, color: string},
 *   timeline: Array<{time: string, type: string, label: string}>,
 *   paragraphs: string[],
 *   recommendations: string[],
 *   headline: string
 * }}
 */
export function buildSessionSummary(incidents = [], score = 0) {
  const counts = {};
  let cameraIncidents = 0;
  let behaviourIncidents = 0;

  incidents.forEach((incident) => {
    const type = incident.eventType || incident.type;
    counts[type] = (counts[type] || 0) + 1;
    if (["NO_FACE", "MULTIPLE_FACES", "MOBILE_DETECTED", "BOOK_DETECTED", "UNKNOWN_FACE"].includes(type)) {
      cameraIncidents += 1;
    } else {
      behaviourIncidents += 1;
    }
  });

  const risk = riskBand(score);
  const sorted = [...incidents].sort(
    (a, b) => new Date(a.timestamp || a.at) - new Date(b.timestamp || b.at)
  );

  const timeline = sorted.map((incident) => {
    const type = incident.eventType || incident.type;
    return {
      time: formatTime(incident.timestamp || incident.at),
      type,
      label: TYPE_LABELS[type] || type,
      details: incident.details || "",
    };
  });

  const distinctTypes = Object.keys(counts);
  const topType = distinctTypes.sort((a, b) => counts[b] - counts[a])[0];
  const expectedFromCounts = distinctTypes.reduce(
    (sum, type) => sum + (TYPE_WEIGHTS[type] || 0) * counts[type],
    0
  );

  const paragraphs = [];

  paragraphs.push(
    incidents.length === 0
      ? "No proctoring incidents were recorded during this session. Camera checks stayed clear and the candidate remained on the exam screen."
      : `This session recorded ${incidents.length} incident${incidents.length > 1 ? "s" : ""}: ` +
          distinctTypes
            .map((type) => `${counts[type]} × ${TYPE_LABELS[type] || type}`)
            .join(", ") +
          "."
  );

  if (cameraIncidents > 0 && behaviourIncidents > 0) {
    paragraphs.push(
      `Both camera/object detections (${cameraIncidents}) and browser-behaviour violations (${behaviourIncidents}) occurred, which usually indicates repeated disruption rather than a single isolated event.`
    );
  } else if (cameraIncidents > 0) {
    paragraphs.push(
      "All incidents came from the live camera/object feed (face count, identity match or mobile-phone detection)."
    );
  } else if (behaviourIncidents > 0) {
    paragraphs.push(
      "All incidents came from browser-level monitoring (tab focus, clipboard and fullscreen)."
    );
  }

  if (topType) {
    const share = Math.round((counts[topType] / incidents.length) * 100);
    paragraphs.push(
      `Most frequent incident: ${TYPE_LABELS[topType]} (${counts[topType]} of ${incidents.length}, ${share}%).`
    );
  }

  paragraphs.push(
    `Backend suspicion score: ${score} → ${risk.label}.` +
      (expectedFromCounts !== score
        ? ` (Rule-computed weight from listed incidents: ${expectedFromCounts} — a difference usually means older incidents are outside this view.)`
        : " This matches the rule-based weight total of the listed incidents.")
  );

  paragraphs.push(
    "This summary is a deterministic rule-based digest produced locally in the browser — no external AI service or API key was used. It is an aid for human review, not a final malpractice decision."
  );

  const recommendations = [];
  if (counts.MULTIPLE_FACES) {
    recommendations.push(
      "Review camera snapshots around the multiple-person timestamps — confirm whether a second person entered the frame."
    );
  }
  if (counts.UNKNOWN_FACE) {
    recommendations.push(
      "Identity-mismatch alerts mean a detected face did not match the reference face captured at verification — review those timestamps closely to confirm who was in frame."
    );
  }
  if (counts.MOBILE_DETECTED) {
    recommendations.push(
      "Check the mobile-phone detections — ask the candidate to confirm what was in view; corroborate with timestamps."
    );
  }
  if (counts.NO_FACE) {
    recommendations.push(
      "Face-absence gaps may be caused by lighting or camera angle — verify before concluding absence."
    );
  }
  if (counts.TAB_SWITCH) {
    recommendations.push(
      "Tab/window switches suggest the candidate left the exam surface — consider asking what they accessed."
    );
  }
  if (counts.COPY_PASTE) {
    recommendations.push(
      "Copy/paste attempts were blocked — review whether content was nevertheless shared out of frame."
    );
  }
  if (score >= 20) {
    recommendations.push(
      "High score: recommend a manual video/timeline review before publishing results."
    );
  }
  if (incidents.length === 0) {
    recommendations.push("No follow-up needed — publish results as normal.");
  }

  const headline =
    incidents.length === 0
      ? "Clean session — no incidents"
      : `${risk.label} — ${incidents.length} incident${incidents.length > 1 ? "s" : ""}, score ${score}`;

  return {
    counts,
    score,
    risk,
    timeline,
    paragraphs,
    recommendations,
    headline,
    generatedAt: new Date().toISOString(),
  };
}

export default buildSessionSummary;
