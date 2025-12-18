// web/nody_helper.js

import { app } from "/scripts/app.js"; //comfy frontend
import { api } from "/scripts/api.js"; //comfy backend

let nodyDragFromId = null;          // preferred (upgraded when we can) // liteGraph
let nodyPointerDownNodeId = null;   // backup (always captured early) //mousepos

// prevents repeated logs/injection for the same overlay element // ya it was annoying
const _seenOverlays = new WeakSet();

// -------------------------
// DEBUG (readable console) //console structure yay
// -------------------------
const NODY_DEBUG = true;

const _dbg = {
  overlayCount: 0,
  last: {
    dragFromId: undefined,
    pointerDownNodeId: undefined,
  },
};

function dbgChange(key, val) {
  if (!NODY_DEBUG) return;
  if (_dbg.last[key] === val) return; // only log changes
  _dbg.last[key] = val;
  console.log(`[NODY] ${key}:`, val);
}

function dbgOverlaySummary(where = "") {
  if (!NODY_DEBUG) return;
  _dbg.overlayCount += 1;

  const finalDraggedFrom = nodyDragFromId ?? nodyPointerDownNodeId ?? null;

  console.groupCollapsed(
    `[NODY] Overlay #${_dbg.overlayCount}${where ? " — " + where : ""}`
  );
  console.log("dragFromId (preferred):", nodyDragFromId);
  console.log("pointerDownNodeId (backup):", nodyPointerDownNodeId);
  console.log("draggedFromNodeId (final):", finalDraggedFrom);
  console.groupEnd();
}

console.log("[NODY] extension loaded", { app, api }); // ✓

// -------------------------
// EXTENSION SETUP
// -------------------------
app.registerExtension({ //comfy knows my js extension <3
  // added catch e and calls observeOverlays function yay
  name: "ks.nody.helper",
  async setup() {
    console.log("[NODY] setup running"); // ✓
    
    //checks python side is alive
    try {
      const res = await api.fetchApi("/nody/ping");
      console.log("[NODY] ping:", await res.json()); // ✓
    } catch (e) {
      console.error("[NODY] ping failed:", e);
    }

    // cache drag-from BEFORE ComfyUI clears connecting state when overlay opens //slayyy
    await waitForCanvas();
    attachPointerListeners();

    // overlay watcher 
    observeOverlays();
  },
});

// -------------------------
// DRAG-FROM CACHING :)
// -------------------------
async function waitForCanvas() {
  // small helper: wait until the LiteGraph canvas exists
  while (!app?.canvas?.graph || !app?.canvas?.canvas) {
    await new Promise((r) => requestAnimationFrame(r));
  }
}

function attachPointerListeners() {
  const canvasEl = app.canvas?.canvas;
  if (!canvasEl) {
    console.warn("[NODY] canvas element missing, drag caching disabled");
    return;
  }

  // CAPTURE PHASE: run before ComfyUI/LiteGraph handlers mutate/clear connecting state
  canvasEl.addEventListener("pointerdown", onPointerDown, true);
  canvasEl.addEventListener("pointermove", onPointerMove, true);

  console.log("[NODY] pointer listeners attached"); // ✓
}

function onPointerDown(e) {
  // backup: what node is under the cursor when drag starts
  nodyPointerDownNodeId = getNodeUnderPointer(app.canvas, e)?.id ?? null;

  // seed preferred with backup (so we always have something)
  nodyDragFromId = nodyPointerDownNodeId;

  dbgChange("pointerDownNodeId", nodyPointerDownNodeId);
  dbgChange("dragFromId", nodyDragFromId);

  // try to upgrade immediately (sometimes connecting_links is already populated)
  upgradeDragFromId();
  dbgChange("dragFromId", nodyDragFromId);
}

function onPointerMove(e) {
  if (!e.buttons) return; // only while dragging
  upgradeDragFromId();    // preferred: upgrade using LiteGraph connection state (if available)
}

// “Upgrade” means: if LiteGraph gives you the true origin id mid-drag, use that
function upgradeDragFromId() {
  const before = nodyDragFromId;
  const c = app.canvas;

  // Newer ComfyUI builds often use connecting_links (array)
  const links = c?.connecting_links || c?._connecting_links;
  if (Array.isArray(links) && links.length) {
    const l0 = links[0];

    // Your build showed l0.node.id exists; keep a couple common fallbacks too. //idk if necessary
    const originId =
      l0?.node?.id ??
      l0?.origin_id ??
      l0?.from_id ??
      null;

    if (originId != null) nodyDragFromId = originId;
  } else {
    // Older builds sometimes expose connecting_node directly // not sure what ver we all have
    const nodeId = c?.connecting_node?.id ?? null;
    if (nodeId != null) nodyDragFromId = nodeId;
  }

  if (nodyDragFromId !== before) dbgChange("dragFromId", nodyDragFromId);
}

// -------------------------
// OVERLAY WATCHER (non-spammy)
// -------------------------
function observeOverlays() {
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // Only trigger when an overlay container appears,
        // NOT when its internal list items update. // yes mama
        const pv =
          node.matches?.("div.p-autocomplete-overlay.p-component")
            ? node
            : node.querySelector?.("div.p-autocomplete-overlay.p-component");

        if (!pv) continue;

        tryMarkSearchOverlay(pv);
        return; // one per mutation batch is enough //idk what this means yet check later
      }
    }
  });

  obs.observe(document.body, { childList: true, subtree: true }); // watches the entire page //ugh
  console.log("[NODY] MutationObserver attached"); // ✓
}

function tryMarkSearchOverlay(pv) {
  if (!pv) return false;

  // guard: handle each overlay element only once
  if (_seenOverlays.has(pv)) return true;
  _seenOverlays.add(pv);

  // IMPORTANT: do NOT try to read live connecting state here (it’s often already cleared)
  // Instead: use what we cached during pointerdown/move.
  dbgOverlaySummary("autocomplete overlay");

  // Inject a fixed first-row input + send button (once)
  if (!pv.querySelector("[data-nody-bar='1']")) {
    injectNodyBar(pv);
    console.log("[NODY] Injected input bar");
  }

  return true;
}

// -------------------------
// UI INJECTION (chat bar)
// -------------------------
function injectNodyBar(pv) {
  const bar = document.createElement("div");
  bar.dataset.nodyBar = "1";

  // first row, neat!
  bar.style.display = "flex";
  bar.style.gap = "10px";
  bar.style.alignItems = "center";
  bar.style.width = "100%";
  bar.style.padding = "10px 12px";
  bar.style.boxSizing = "border-box";
  bar.style.fontSize = "16px"; // easier to read

  // Optional: make it visually separated from the list // i like this
  bar.style.borderBottom = "1px solid rgba(255,255,255,0.12)";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask Nody...";
  input.dataset.nodyInput = "1";

  // Input should take most of the row
  input.style.flex = "1";
  input.style.minWidth = "0";
  input.style.padding = "8px 10px";
  input.style.borderRadius = "10px";
  input.style.border = "1px solid rgba(255,255,255,0.18)";
  input.style.background = "rgba(0,0,0,0.35)";
  input.style.color = "white";
  input.style.outline = "none";
  input.style.fontSize = "16px"; //easier to read
  input.style.lineHeight = "20px"; // easier to read
  input.style.height = "38px"; // fancy thing to make reading more enjoyable

  const send = document.createElement("button");
  send.textContent = "Send";
  send.dataset.nodySend = "1";

  // Small button next to input
  send.style.flex = "0 0 auto";
  send.style.padding = "8px 12px";
  send.style.borderRadius = "10px";
  send.style.border = "1px solid rgba(255,255,255,0.18)";
  send.style.background = "rgba(0,0,0,0.6)";
  send.style.color = "white";
  send.style.cursor = "pointer";
  send.style.fontSize = "16px"; //easier to read
  send.style.lineHeight = "20px"; // easier to read
  send.style.height = "38px"; // fancy thing to make reading more enjoyable

  const submit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.(); // Don’t let this click travel upward to parent elements

    // --- rudimentary click feedback ---
    const prevBg = send.style.background;
    const prevBorder = send.style.border;

    send.style.background = "rgba(255,255,255,0.25)";
    send.style.border = "1px solid rgba(255,255,255,0.55)";

    setTimeout(() => {
      send.style.background = prevBg;
      send.style.border = prevBorder;
    }, 120);
    // --- end feedback ---

    console.groupCollapsed("[NODY] submit");
    console.log("input:", input.value);

    const prompt = await app.graphToPrompt();
    const fullWorkflowJson = prompt.workflow; // entire workflow graph
    const apiPromptJson = prompt.output;      // API prompt format

    // selected and dragged nodes:
    const selectedMap = app.canvas?.selected_nodes || {};
    const selectedIds = Object.keys(selectedMap);
    const selectedId = selectedIds.length ? Number(selectedIds[selectedIds.length - 1]) : null;

    // Fallback: if nothing is selected, try the node you're currently dragging a connection from
    const draggingFromId = selectedId == null ? (nodyDragFromId ?? nodyPointerDownNodeId) : null;

    console.log("workflow nodes:", fullWorkflowJson?.nodes?.length);
    console.log("api prompt keys:", Object.keys(apiPromptJson || {}).length);
    console.log("selected node id:", selectedId);
    console.log("dragged node (cached):", draggingFromId);
    console.groupEnd();
  };

  send.addEventListener("click", submit);

  // Bonus: press Enter to send
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit(e);
    // stop overlay keyboard handlers from hijacking Enter
    e.stopPropagation();
  });

  // Stop clicks inside the bar from bubbling up to overlay handlers
  bar.addEventListener("click", (e) => e.stopPropagation());

  bar.appendChild(input);
  bar.appendChild(send);

  // Put the bar as the first "row"
  pv.prepend(bar);
}

// -------------------------
// HELPERS //Given a mouse/pointer event, which graph node is under the cursor right now?
// -------------------------
function getNodeUnderPointer(lgCanvas, e) {
  try {
    const graph = lgCanvas?.graph;
    if (!graph) return null;

    const pos = lgCanvas.convertEventToCanvas?.(e);
    if (!Array.isArray(pos)) return null;

    return graph.getNodeOnPos?.(pos[0], pos[1]) ?? null;
  } catch (_) {
    return null;
  }
}