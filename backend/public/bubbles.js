/* =========================================================
   Background bubble animation
   Creates a fixed, full-viewport layer behind the page and
   fills it with a handful of bubbles. Each bubble's size,
   position, speed, drift and opacity are randomized once
   via CSS custom properties; the actual rising motion is
   handled by the infinite CSS animation in bubbles.css.
========================================================= */
(function () {
  var BUBBLE_COUNT = 10;

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createBubble() {
    var bubble = document.createElement('span');
    bubble.className = 'bubble';

    var size = randomBetween(16, 64);
    var left = randomBetween(2, 98);
    var duration = randomBetween(14, 30);
    var delay = -Math.random() * duration; // negative delay: bubbles are already mid-flight on load
    var drift = randomBetween(-40, 40);
    var opacity = randomBetween(0.35, 0.75);

    bubble.style.setProperty('--bubble-size', size.toFixed(1) + 'px');
    bubble.style.setProperty('--bubble-left', left.toFixed(1) + '%');
    bubble.style.setProperty('--bubble-duration', duration.toFixed(1) + 's');
    bubble.style.setProperty('--bubble-drift', drift.toFixed(1) + 'px');
    bubble.style.setProperty('--bubble-opacity', opacity.toFixed(2));
    bubble.style.animationDelay = delay.toFixed(1) + 's';

    return bubble;
  }

  function createBubbleLayer() {
    // Respect reduced-motion preference: skip the animated layer entirely
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    var layer = document.createElement('div');
    layer.className = 'bubble-bg';
    layer.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < BUBBLE_COUNT; i++) {
      layer.appendChild(createBubble());
    }

    document.body.appendChild(layer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createBubbleLayer);
  } else {
    createBubbleLayer();
  }
})();