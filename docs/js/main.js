(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var toggle = document.getElementById("theme-toggle");
  var navToggle = document.getElementById("nav-toggle");
  var rail = document.querySelector(".rail");
  var nav = document.getElementById("site-nav");
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeMeta) themeMeta.setAttribute("content", theme === "light" ? "#f4f0e6" : "#10130f");
    if (toggle) {
      var toLight = theme !== "light";
      toggle.setAttribute("aria-label", toLight ? "Switch to light mode" : "Switch to dark mode");
      toggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
    try {
      localStorage.setItem("theme", theme);
    } catch (err) {
      /* Private mode can block storage. The toggle still works for this view. */
    }
  }

  applyTheme(root.getAttribute("data-theme") || "dark");

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
    });
  }

  function setNavOpen(open) {
    if (!rail || !navToggle) return;
    rail.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    var label = navToggle.querySelector(".visually-hidden");
    if (label) label.textContent = open ? "Close menu" : "Menu";
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      setNavOpen(!rail.classList.contains("is-open"));
    });
  }

  if (nav) {
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNavOpen(false);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setNavOpen(false);
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('#site-nav a[href^="#"]'));
  var sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var active = null;
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (active === entry.target) return;
          active = entry.target;
          links.forEach(function (link) {
            var on = link.getAttribute("href") === "#" + entry.target.id;
            if (on) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 }
    );
    sections.forEach(function (section) { spy.observe(section); });
  }

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!motion.matches && "IntersectionObserver" in window) {
    var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add("is-in");
      } else {
        el.classList.add("will-reveal");
        revealObserver.observe(el);
      }
    });
  }

  var canvas = document.getElementById("field");
  if (!canvas || motion.matches) {
    if (canvas && motion.matches) canvas.remove();
    return;
  }

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var tokens = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var running = true;

  function roundedRect(context, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function readColor(name, alpha) {
    var raw = getComputedStyle(root).getPropertyValue(name).trim();
    if (!raw) raw = "224, 181, 106";
    return "rgba(" + raw + ", " + alpha + ")";
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.max(18, Math.min(42, Math.round((width * height) / 42000)));
    tokens = [];
    for (var i = 0; i < count; i += 1) {
      tokens.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        w: 7 + Math.random() * 16,
        h: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function frame(time) {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    var fill = readColor("--token", 0.28);
    var stroke = readColor("--signal", 0.16);

    for (var i = 0; i < tokens.length; i += 1) {
      var a = tokens[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < -20) a.x = width + 20;
      if (a.x > width + 20) a.x = -20;
      if (a.y < -20) a.y = height + 20;
      if (a.y > height + 20) a.y = -20;

      for (var j = i + 1; j < tokens.length; j += 1) {
        var b = tokens[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.hypot(dx, dy);
        if (dist < 150) {
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = (1 - dist / 150) * 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    tokens.forEach(function (token) {
      var pulse = 0.55 + Math.sin(time / 1400 + token.phase) * 0.25;
      ctx.save();
      ctx.translate(token.x, token.y);
      ctx.rotate(token.phase / 8);
      ctx.fillStyle = fill;
      ctx.globalAlpha = pulse;
      roundedRect(ctx, -token.w / 2, -token.h / 2, token.w, token.h, 1.5);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    var hidden = document.hidden;
    if (hidden) {
      running = false;
      return;
    }
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });

  motion.addEventListener("change", function (event) {
    if (event.matches) {
      running = false;
      canvas.remove();
    }
  });
})();
