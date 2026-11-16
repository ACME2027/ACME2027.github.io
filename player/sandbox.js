export function sandboxRuntime() {
  "use strict";
  var interactionCleanups = [];
  var activeClarificationInteractionId = null;
  var currentChartNode = null;
  var renderToken = 0;
  var activeRequestId = null;
  var READY_LIMIT_MS = 5000;
  function disposeChart() {
    var node = currentChartNode;
    currentChartNode = null;
    if (node && typeof node.__dispose === "function") {
      try {
        node.__dispose();
      } catch (_error) {
      }
    }
  }

  function invokeRender(renderFn, root, data, config) {
    disposeChart();
    root.innerHTML = "";
    var node = renderFn(root, data, config);
    currentChartNode = node && typeof node === "object" ? node : null;
    return node;
  }

  function readyOf(node) {
    return node && node.__ready && typeof node.__ready.then === "function"
      ? node.__ready
      : null;
  }

  function post(msg) {
    msg.renderVersion = activeRequestId;
    parent.postMessage(msg, "*");
  }

  function errorText(err) {
    return err && err.stack ? String(err.stack) : String(err);
  }

  function validChanges(changes) {
    return Array.isArray(changes) &&
      changes.length > 0 &&
      changes.every(function (change) {
        return change &&
          typeof change === "object" &&
          typeof change.configPath === "string" &&
          change.configPath.length > 0 &&
          Object.prototype.hasOwnProperty.call(change, "nextValue");
      });
  }

  function cleanupInteraction() {
    for (var i = interactionCleanups.length - 1; i >= 0; i -= 1) {
      try {
        interactionCleanups[i]();
      } catch (err) {
        post({
          type: "interaction_error",
          error: "Interaction cleanup failed: " + errorText(err)
        });
      }
    }
    interactionCleanups = [];
    activeClarificationInteractionId = null;
    var overlay = document.getElementById("editor-overlay");
    if (overlay) overlay.innerHTML = "";
  }

  function getElementByChartId(root, targetId) {
    var elements = root.querySelectorAll("[data-chart-id]");
    for (var i = 0; i < elements.length; i += 1) {
      if (elements[i].getAttribute("data-chart-id") === targetId) {
        return elements[i];
      }
    }
    return null;
  }

  function collectTargetInventory(root) {
    var counts = Object.create(null);
    var elements = root.querySelectorAll("[data-chart-id]");
    for (var i = 0; i < elements.length; i += 1) {
      var id = elements[i].getAttribute("data-chart-id");
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
    return Object.keys(counts).sort().map(function (id) {
      return { id: id, count: counts[id] };
    });
  }

  function validateInteractionTargets(clarificationInteraction, targetInventory) {
    var declared = declaredInteractionTargetIds(clarificationInteraction);
    if (declared.length === 0) {
      throw new Error("Interaction binding declares no runtime target");
    }
    var counts = Object.create(null);
    targetInventory.forEach(function (entry) { counts[entry.id] = entry.count; });
    declared.forEach(function (targetId) {
      var count = counts[targetId] || 0;
      if (count === 0) {
        throw new Error(
          "Interaction target " + targetId + " does not exist in the rendered DOM"
        );
      }
      if (count !== 1) {
        throw new Error(
          "Interaction target " + targetId + " is not unique in the rendered DOM (" +
          count + " matches)"
        );
      }
    });
  }

  function svgPointer(event, target) {
    var svg = target && target.ownerSVGElement
      ? target.ownerSVGElement
      : target;
    if (!svg || typeof svg.getScreenCTM !== "function") {
      throw new Error("Interaction target is not inside an SVG");
    }
    var ctm = svg.getScreenCTM();
    if (!ctm) throw new Error("SVG coordinate transform is unavailable");
    var point = new DOMPoint(event.clientX, event.clientY)
      .matrixTransform(ctm.inverse());
    return [point.x, point.y];
  }

  function chartUnitsPerOverlayUnit(target, overlay) {
    var svg = target && target.ownerSVGElement ? target.ownerSVGElement : target;
    if (!svg || typeof svg.getScreenCTM !== "function") {
      throw new Error("Interaction target is not inside an SVG");
    }
    var ctm = svg.getScreenCTM();
    if (!ctm) throw new Error("SVG coordinate transform is unavailable");
    var frame = overlayCoordinateFrame(overlay);
    var sx = Math.hypot(ctm.a, ctm.b) * frame.scaleX;
    var sy = Math.hypot(ctm.c, ctm.d) * frame.scaleY;
    if (!(sx > 0) || !(sy > 0)) {
      throw new Error("Chart coordinate scale is unavailable");
    }
    return [1 / sx, 1 / sy];
  }

  function createInteractionApi(data, config) {
    var chartRoot = document.getElementById("chart-root");
    var overlayRoot = document.getElementById("editor-overlay");
    var previewChanges = [];

    return {
      chartRoot: chartRoot,
      overlayRoot: overlayRoot,
      data: data,
      config: config,

      getElement: function (targetId) {
        return getElementByChartId(chartRoot, targetId);
      },

      pointer: svgPointer,

      getOverlayRect: function (target) {
        return elementRectInOverlay(target, overlayRoot);
      },

      pointerInOverlay: function (event) {
        return clientPointInOverlay(event.clientX, event.clientY, overlayRoot);
      },

      previewConfig: function (changes) {
        if (!validChanges(changes)) {
          throw new Error("previewConfig requires non-empty valid config changes");
        }
        previewChanges = changes.slice();
      },

      commitConfig: function (interactionId, changes) {
        if (typeof interactionId !== "string" || !interactionId) {
          throw new Error("commitConfig requires an interaction id");
        }
        if (!validChanges(changes)) {
          throw new Error("commitConfig requires non-empty valid config changes");
        }
        previewChanges = [];
        post({
          type: "interaction_commit",
          interactionId: interactionId,
          changes: changes
        });
      },

      cancelInteraction: function (interactionId, reason) {
        post({
          type: "interaction_cancel",
          interactionId: interactionId,
          reason: reason
        });
      },

      resolveClarification: function (resolution) {
        if (!resolution || typeof resolution !== "object") {
          throw new Error("resolveClarification requires a resolution object");
        }
        if (
          typeof resolution.slotId !== "string" || !resolution.slotId ||
          typeof resolution.adapterId !== "string" || !resolution.adapterId ||
          typeof resolution.displayValue !== "string" ||
          !resolution.displayValue.trim()
        ) {
          throw new Error("clarification resolution is missing identity or displayValue");
        }
        post({
          type: "clarification_resolution",
          slotId: resolution.slotId,
          adapterId: resolution.adapterId,
          displayValue: resolution.displayValue,
          value: resolution.value
        });
      },

      onCleanup: function (cleanup) {
        if (typeof cleanup !== "function") {
          throw new Error("onCleanup requires a function");
        }
        interactionCleanups.push(cleanup);
      },

      reportError: function (interactionId, err) {
        post({
          type: "interaction_error",
          interactionId: interactionId,
          error: errorText(err)
        });
      },

      getPreviewChanges: function () {
        return previewChanges.slice();
      }
    };
  }

  function sizeOverlay(overlay) {
    var stage = document.getElementById("editor-stage");
    var width = Math.max(1, stage.clientWidth);
    var height = Math.max(1, stage.clientHeight);
    overlay.setAttribute("width", String(width));
    overlay.setAttribute("height", String(height));
    overlay.setAttribute("viewBox", "0 0 " + width + " " + height);
  }

  function overlayCoordinateFrame(overlay) {
    sizeOverlay(overlay);
    var rect = overlay.getBoundingClientRect();
    var rawViewBox = (overlay.getAttribute("viewBox") || "0 0 1 1")
      .trim()
      .split(/[ ,]+/)
      .map(Number);
    var viewX = Number.isFinite(rawViewBox[0]) ? rawViewBox[0] : 0;
    var viewY = Number.isFinite(rawViewBox[1]) ? rawViewBox[1] : 0;
    var viewWidth = Number.isFinite(rawViewBox[2]) && rawViewBox[2] > 0
      ? rawViewBox[2]
      : Number(overlay.getAttribute("width")) || 1;
    var viewHeight = Number.isFinite(rawViewBox[3]) && rawViewBox[3] > 0
      ? rawViewBox[3]
      : Number(overlay.getAttribute("height")) || 1;
    var clientWidth = rect.width || overlay.clientWidth || viewWidth;
    var clientHeight = rect.height || overlay.clientHeight || viewHeight;
    if (!Number.isFinite(clientWidth) || clientWidth <= 0) clientWidth = 1;
    if (!Number.isFinite(clientHeight) || clientHeight <= 0) clientHeight = 1;
    return {
      rect: rect,
      viewX: viewX,
      viewY: viewY,
      scaleX: viewWidth / clientWidth,
      scaleY: viewHeight / clientHeight
    };
  }

  function clientPointInOverlay(clientX, clientY, overlay) {
    var frame = overlayCoordinateFrame(overlay);
    return [
      frame.viewX + (clientX - frame.rect.left) * frame.scaleX,
      frame.viewY + (clientY - frame.rect.top) * frame.scaleY
    ];
  }

  function elementRectInOverlay(element, overlay) {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      throw new Error("getOverlayRect requires a measurable Element");
    }
    var targetRect = element.getBoundingClientRect();
    var frame = overlayCoordinateFrame(overlay);
    var left = frame.viewX +
      (targetRect.left - frame.rect.left) * frame.scaleX;
    var top = frame.viewY +
      (targetRect.top - frame.rect.top) * frame.scaleY;
    var width = targetRect.width * frame.scaleX;
    var height = targetRect.height * frame.scaleY;
    var values = [left, top, width, height];
    if (!values.every(function (value) { return Number.isFinite(value); })) {
      throw new Error("getOverlayRect produced invalid geometry");
    }
    return {
      x: left,
      y: top,
      width: width,
      height: height,
      left: left,
      top: top,
      right: left + width,
      bottom: top + height
    };
  }

  function generatedOutputValue(value, outputPath) {
    if (outputPath === "$") return value;
    if (typeof outputPath !== "string" || outputPath.slice(0, 2) !== "$.") {
      return undefined;
    }
    var current = value;
    var parts = outputPath.slice(2).split(".");
    for (var i = 0; i < parts.length; i += 1) {
      if (!current || typeof current !== "object" || !(parts[i] in current)) {
        return undefined;
      }
      current = current[parts[i]];
    }
    return current;
  }

  function generatedConfigValue(config, configPath) {
    var current = config;
    var parts = configPath.split(".");
    for (var i = 0; i < parts.length; i += 1) {
      if (!current || typeof current !== "object" || !(parts[i] in current)) {
        return undefined;
      }
      current = current[parts[i]];
    }
    return current;
  }

  function generatedPreviewChanges(api, spec, value) {
    var visualization = spec.writeBack && spec.writeBack.visualization;
    if (!visualization || visualization.mode !== "config_patch") return [];
    return visualization.mappings.map(function (mapping) {
      var output = generatedOutputValue(value, mapping.outputPath);
      if (output === undefined) {
        throw new Error("Generated DM output is missing " + mapping.outputPath);
      }
      var nextValue = output;
      if (mapping.strategy === "add") {
        var previous = generatedConfigValue(api.config, mapping.configPath);
        if (
          typeof previous !== "number" || !Number.isFinite(previous) ||
          typeof output !== "number" || !Number.isFinite(output)
        ) {
          throw new Error("Generated DM numeric preview is invalid");
        }
        nextValue = previous + output;
      }
      return { configPath: mapping.configPath, nextValue: nextValue };
    });
  }

  function configWithChanges(config, changes) {
    var next = JSON.parse(JSON.stringify(config || {}));
    changes.forEach(function (change) {
      var parts = change.configPath.split(".");
      var current = next;
      for (var i = 0; i < parts.length - 1; i += 1) {
        if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = change.nextValue;
    });
    return next;
  }

  function createGeneratedPreview(api, renderFn, interactionId, refreshGuidance) {
    var pending = null;
    var frame = null;
    var applied = false;

    function schedule(callback) {
      if (typeof requestAnimationFrame === "function") {
        return { raf: requestAnimationFrame(callback) };
      }
      return { timeout: setTimeout(callback, 16) };
    }

    function cancelFrame() {
      if (!frame) return;
      if (frame.raf !== undefined) cancelAnimationFrame(frame.raf);
      else clearTimeout(frame.timeout);
      frame = null;
    }

    var drawToken = 0;
    var disposed = false;

    function draw(config) {
      var token = ++drawToken;
      var ready = readyOf(invokeRender(renderFn, api.chartRoot, api.data, config));
      if (!ready) {
        refreshGuidance(config);
        return;
      }
      var done = false;
      var current = function () { return !done && !disposed && token === drawToken; };
      var timer = setTimeout(function () {
        if (!current()) return;
        done = true;
        api.reportError(interactionId, "Live preview layout did not finish within " + READY_LIMIT_MS + "ms.");
      }, READY_LIMIT_MS);
      ready.then(
        function () {
          if (!current()) return;
          done = true;
          clearTimeout(timer);
          refreshGuidance(config);
        },
        function (err) {
          if (!current()) return;
          done = true;
          clearTimeout(timer);
          api.reportError(interactionId, "Live preview failed: " + errorText(err));
          restore();
        }
      );
    }

    function restore() {
      cancelFrame();
      pending = null;
      if (!applied) return;
      applied = false;
      try {
        draw(api.config);
      } catch (err) {
        api.reportError(interactionId, "Restoring the preview failed: " + errorText(err));
      }
    }

    function drawChanges(changes) {
      try {
        applied = true;
        draw(configWithChanges(api.config, changes));
        return true;
      } catch (err) {
        api.reportError(interactionId, "Live preview failed: " + errorText(err));
        restore();
        return false;
      }
    }

    function flush() {
      frame = null;
      if (!pending) return;
      var changes = pending;
      pending = null;
      drawChanges(changes);
    }

    return {
      request: function (changes) {
        pending = changes;
        if (!frame) frame = schedule(flush);
      },
      drawFinal: function (changes) {
        cancelFrame();
        pending = null;
        return drawChanges(changes);
      },
      restore: restore,
      dispose: function () {
        cancelFrame();
        pending = null;
        disposed = true;
        drawToken += 1;
      }
    };
  }

  function mountGeneratedGuidance(api, guidance) {
    if (!guidance || typeof guidance !== "object") {
      throw new Error("Generated DM guidance is missing");
    }
    if (!api.getElement(guidance.subjectTargetId)) {
      throw new Error("Generated DM guidance subject does not exist");
    }
    var ns = "http://www.w3.org/2000/svg";
    var group = document.createElementNS(ns, "g");
    group.setAttribute("class", "editor-generated-guidance");
    group.setAttribute("data-guide-subject", guidance.subjectTargetId);

    var guideElements = Object.create(null);
    var anchor = null;
    if (guidance.anchor) {
      anchor = document.createElementNS(ns, "circle");
      anchor.setAttribute("class", "editor-generated-guidance__anchor");
      anchor.setAttribute("data-guide-id", guidance.anchor.id);
      anchor.setAttribute("r", "8");
      anchor.style.pointerEvents = "all";
      anchor.style.cursor = guidance.anchor.cursor;
      group.appendChild(anchor);
      guideElements[guidance.anchor.id] = anchor;
    }
    api.overlayRoot.appendChild(group);

    var refreshListeners = [];
    function refresh(config) {
      var subject = api.getElement(guidance.subjectTargetId);
      if (!subject) {
        throw new Error("Generated DM guidance subject does not exist after redraw");
      }
      var bounds = api.getOverlayRect(subject);
      if (anchor) {
        anchor.setAttribute(
          "cx",
          String(bounds.x + bounds.width * guidance.anchor.x)
        );
        anchor.setAttribute(
          "cy",
          String(bounds.y + bounds.height * guidance.anchor.y)
        );
      }
    }

    var latestConfig = api.config;
    function refreshAll(config) {
      if (config) latestConfig = config;
      refresh();
      refreshListeners.slice().forEach(function (callback) { callback(latestConfig); });
    }
    function onResize() { refreshAll(); }
    window.addEventListener("resize", onResize);
    api.onCleanup(function () { window.removeEventListener("resize", onResize); refreshListeners.length = 0; });
    refreshAll();
    api.onCleanup(function () {
      if (group.parentNode) group.parentNode.removeChild(group);
    });
    return {
      getElement: function (guideId) {
        return guideElements[guideId] || null;
      },
      refresh: refreshAll,
      subscribe: function (callback) {
        refreshListeners.push(callback);
        callback(latestConfig);
        api.onCleanup(function () { var index = refreshListeners.indexOf(callback); if (index >= 0) refreshListeners.splice(index, 1); });
      }
    };
  }

  function mountGeneratedDm(api, spec, renderFn) {
    var interactionId = spec.adapterId;
    var targetIds = spec.module.spec.targetIds.slice();
    var allowedTargets = Object.create(null);
    targetIds.forEach(function (targetId) { allowedTargets[targetId] = true; });
    if (!api.getElement(targetIds[0])) {
      throw new Error("Generated DM target does not exist in the current preview");
    }
    function liveTarget(target) {
      if (!target) return api.getElement(targetIds[0]);
      if (target.isConnected) return target;
      var targetId = typeof target.getAttribute === "function"
        ? target.getAttribute("data-chart-id")
        : null;
      if (!targetId || !allowedTargets[targetId]) {
        throw new Error("Generated DM used a detached element that is not a declared target");
      }
      var current = api.getElement(targetId);
      if (!current) {
        throw new Error("Generated DM target " + targetId + " is missing after redraw");
      }
      return current;
    }
    var guidance = mountGeneratedGuidance(api, spec.guidance);
    var visualization = spec.writeBack && spec.writeBack.visualization;
    var preview = visualization && visualization.mode === "config_patch"
      ? createGeneratedPreview(api, renderFn, interactionId, guidance.refresh)
      : null;
    if (preview) api.onCleanup(preview.dispose);
    var overlayElements = [];
    api.onCleanup(function () {
      overlayElements.forEach(function (element) { if (element.parentNode) element.parentNode.removeChild(element); });
      overlayElements = [];
    });
    var restrictedApi = {
      chartRoot: api.chartRoot,
      overlayRoot: api.overlayRoot,
      data: api.data,
      config: api.config,
      getElement: function (targetId) {
        if (!allowedTargets[targetId]) {
          throw new Error("Generated DM requested an undeclared target");
        }
        return api.getElement(targetId);
      },
      getGuideElement: function (guideId) {
        return guidance.getElement(guideId);
      },
      refreshGuidance: guidance.refresh,
      onPreviewRender: guidance.subscribe,
      createOverlayElement: function (tag, attributes) {
        if (["g", "circle", "rect", "path", "line", "text", "polyline", "foreignObject", "input"].indexOf(tag) < 0) throw new Error("Unsupported overlay element");
        var element = tag === "input" ? document.createElement("input") : document.createElementNS("http://www.w3.org/2000/svg", tag);
        if (tag === "input") element.type = "text";
        Object.keys(attributes || {}).forEach(function (name) {
          if (/^on/i.test(name) || /href/i.test(name) || (tag === "input" && name === "type" && attributes[name] !== "text")) throw new Error("Unsupported overlay attribute");
          element.setAttribute(name, String(attributes[name]));
        });
        overlayElements = overlayElements.filter(function (node) { return node.isConnected; });
        overlayElements.push(element);
        return element;
      },
      pointer: function (event, target) {
        return api.pointer(event, liveTarget(target));
      },
      chartUnitsPerOverlayUnit: function (target) {
        return chartUnitsPerOverlayUnit(liveTarget(target), api.overlayRoot);
      },
      getOverlayRect: function (target) {
        return api.getOverlayRect(liveTarget(target));
      },
      pointerInOverlay: api.pointerInOverlay,
      previewConfig: function (value) {
        var changes = generatedPreviewChanges(api, spec, value);
        if (changes.length > 0) {
          api.previewConfig(changes);
          if (preview) preview.request(changes);
        }
        return changes;
      },
      cancelInteraction: function (reason) {
        if (preview) preview.restore();
        return api.cancelInteraction(
          interactionId,
          reason === "pointercancel" ? "pointercancel" : "escape"
        );
      },
      resolveClarification: function (resolution) {
        if (!resolution || typeof resolution !== "object") {
          throw new Error("Generated DM resolution must be an object");
        }
        if (preview) {
          var finalChanges = generatedPreviewChanges(api, spec, resolution.value);
          if (finalChanges.length > 0 && !preview.drawFinal(finalChanges)) return;
        }
        return api.resolveClarification({
          slotId: spec.slotId,
          adapterId: interactionId,
          displayValue: resolution.displayValue,
          value: resolution.value
        });
      },
      onCleanup: api.onCleanup,
      reportError: function (err) {
        return api.reportError(interactionId, err);
      }
    };
    var compile = new Function(
      "window", "document", "globalThis", "self", "parent", "top", "opener",
      "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "localStorage",
      "sessionStorage", "indexedDB", "navigator", "location", "Worker",
      "\"use strict\"; return (" + spec.module.code + ");"
    );
    var mount = compile(
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined
    );
    if (typeof mount !== "function" || mount.name !== "mount") {
      throw new Error("Generated DM module did not define mount(api, spec)");
    }
    var returnedCleanup = mount(restrictedApi, spec.module.spec);
    if (typeof returnedCleanup === "function") api.onCleanup(returnedCleanup);
  }

  function finishRender(
    requestId,
    root,
    render,
    data,
    config,
    clarificationInteraction,
    disableInteractions
  ) {
    try {
      var targetInventory = collectTargetInventory(root);
      var interactionFailure = disableInteractions
        ? null
        : mountInteractions(
            data,
            config,
            clarificationInteraction,
            targetInventory,
            render
          );
      post({
        type: "render_success",
        requestId: requestId,
        targetInventory: targetInventory,
        
      });
      if (interactionFailure) {
        post({
          type: "interaction_error",
          interactionId: interactionFailure.interactionId,
          error: interactionFailure.error
        });
      }
    } catch (err) {
      cleanupInteraction();
      post({
        type: "render_error",
        requestId: requestId,
        error: errorText(err)
      });
    }
  }

  function renderChart(
    requestId,
    renderCode,
    data,
    config,
    clarificationInteraction,
    disableInteractions
  ) {
    var token = ++renderToken;
    var root = document.getElementById("chart-root");
    cleanupInteraction();
    try {
      var factory = new Function(renderCode + "\n;return render;");
      var render = factory();
      if (typeof render !== "function") {
        throw new Error("normalizedRenderCode did not define a render() function");
      }
      var node = invokeRender(render, root, data, config);
      var ready = readyOf(node);
      if (!ready) {
        finishRender(requestId, root, render, data, config, clarificationInteraction, disableInteractions);
        return;
      }
      var settled = false;
      var current = function () { return !settled && token === renderToken; };
      var abandon = function (error) {
        settled = true;
        renderToken += 1;
        disposeChart();
        cleanupInteraction();
        root.innerHTML = "";
        post({ type: "render_error", requestId: requestId, error: error });
      };
      var timer = setTimeout(function () {
        if (current()) abandon("Chart layout did not finish within " + READY_LIMIT_MS + "ms.");
      }, READY_LIMIT_MS);
      ready.then(
        function () {
          if (!current()) return;
          settled = true;
          clearTimeout(timer);
          finishRender(requestId, root, render, data, config, clarificationInteraction, disableInteractions);
        },
        function (err) {
          if (!current()) return;
          clearTimeout(timer);
          abandon(errorText(err));
        }
      );
    } catch (err) {
      cleanupInteraction();
      post({
        type: "render_error",
        requestId: requestId,
        error: errorText(err)
      });
    }
  }
  function declaredInteractionTargetIds(spec) { return spec.module.spec.targetIds.slice(); }
  function mountInteractions(data, config, spec, inventory, renderFn) {
    if (!spec) return null;
    var api = createInteractionApi(data, config);
    try {
      if (spec.kind !== "generated_dm") throw new Error("Only generated DM is supported");
      activeClarificationInteractionId = spec.adapterId;
      validateInteractionTargets(spec, inventory);
      mountGeneratedDm(api, spec, renderFn);
      return null;
    } catch (error) { cleanupInteraction(); return { interactionId: spec.adapterId, error: errorText(error) }; }
  }
  window.addEventListener("message", function(event) {
    if (event.source !== parent || !event.data) return;
    var msg = event.data;
    if (msg.type === "render") { activeRequestId = msg.requestId; renderChart(msg.requestId, msg.renderCode, msg.data, msg.config, msg.clarificationInteraction, false); }
  });
  window.addEventListener("pagehide", function() { cleanupInteraction(); disposeChart(); });
  window.addEventListener("error", function(e) { post({type:"interaction_error",error:errorText(e.error || e.message)}); });
  window.addEventListener("unhandledrejection", function(e) { post({type:"interaction_error",error:errorText(e.reason)}); });
  post({type:"sandbox_ready"});
}
