/* Fantasy Forge — home page interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Header: solid on scroll, mobile menu ---------- */
  var header = $("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $(".nav-toggle", header);
    var setOpen = function (open) {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", function () { setOpen(!header.classList.contains("nav-open")); });
    $$(".site-nav a", header).forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Hero: embers + stars ---------- */
  var canvas = $(".hero-canvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var hero = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, stars = [], embers = [], running = false, rafId = 0;
    var EMBER_COLORS = ["255,196,92", "255,150,50", "255,222,150", "255,120,40"];

    var rand = function (a, b) { return a + Math.random() * (b - a); };
    var makeEmber = function (fromBottom) {
      return {
        x: rand(0, W),
        y: fromBottom ? H + rand(0, 40) : rand(0, H),
        r: rand(0.6, 2.2),
        vy: rand(0.25, 0.9),
        drift: rand(0.2, 0.9),
        phase: rand(0, Math.PI * 2),
        life: 1,
        decay: rand(0.0009, 0.0024),
        c: EMBER_COLORS[(Math.random() * EMBER_COLORS.length) | 0]
      };
    };
    var resize = function () {
      var rect = hero.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var area = W * H;
      stars = [];
      for (var i = 0; i < Math.min(220, area / 7000); i++) {
        stars.push({ x: rand(0, W), y: rand(0, H * 0.9), r: rand(0.3, 1.25), a: rand(0.15, 0.8), tw: rand(0.004, 0.02), p: rand(0, 6.28) });
      }
      embers = [];
      for (var j = 0; j < Math.min(80, area / 14000); j++) embers.push(makeEmber(false));
    };
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var a = reduceMotion ? s.a : s.a * (0.55 + 0.45 * Math.sin(s.p + t * s.tw * 0.06));
        ctx.fillStyle = "rgba(255,244,220," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      for (var k = 0; k < embers.length; k++) {
        var e = embers[k];
        if (!reduceMotion) {
          e.y -= e.vy;
          e.x += Math.sin(e.phase + e.y * 0.012) * e.drift * 0.5;
          e.life -= e.decay;
          if (e.y < -20 || e.life <= 0) { embers[k] = makeEmber(true); continue; }
        }
        var alpha = Math.max(0, Math.min(1, e.life)) * Math.min(1, (H - e.y) / 120 + 0.2);
        var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        g.addColorStop(0, "rgba(" + e.c + "," + (0.9 * alpha).toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + e.c + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 5, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    var loop = function (t) {
      draw(t);
      if (running) rafId = requestAnimationFrame(loop);
    };
    var start = function () { if (!running && !reduceMotion) { running = true; rafId = requestAnimationFrame(loop); } };
    var stop = function () { running = false; cancelAnimationFrame(rafId); };

    resize();
    draw(0);
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); draw(0); }, 150);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(hero);
    } else { start(); }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (hero.getBoundingClientRect().bottom > 0) start();
    });
  }

  /* ---------- Hero: gem tilts toward the pointer ---------- */
  var stage = $(".gem-stage");
  if (stage && finePointer && !reduceMotion) {
    var heroEl = $(".hero");
    heroEl.addEventListener("pointermove", function (e) {
      var r = heroEl.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      stage.style.setProperty("--ry", (dx * 22).toFixed(2) + "deg");
      stage.style.setProperty("--rx", (-dy * 16).toFixed(2) + "deg");
    });
    heroEl.addEventListener("pointerleave", function () {
      stage.style.setProperty("--ry", "0deg");
      stage.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------- Feature cards: spotlight follows the pointer ---------- */
  if (finePointer) {
    $$(".feature").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Screenshot carousel ---------- */
  var track = $("[data-track]");
  if (track) {
    var prev = $("[data-prev]"), next = $("[data-next]");
    var step = function () {
      var shot = $(".shot", track);
      return shot ? shot.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : 300;
    };
    var update = function () {
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Worlds: keyboard / touch focus expands a card ---------- */
  var worldsRow = $("[data-worlds]");
  if (worldsRow) {
    $$(".world", worldsRow).forEach(function (w) {
      w.addEventListener("focus", function () {
        $$(".world", worldsRow).forEach(function (o) { o.classList.toggle("is-active", o === w); });
      });
      w.addEventListener("blur", function () { w.classList.remove("is-active"); });
    });
  }

  /* ---------- Typewriter helper ---------- */
  var typeInto = function (el, text, speed, done) {
    if (reduceMotion || speed === 0) { el.textContent = text; if (done) done(); return function () {}; }
    var i = 0, cancelled = false, timer;
    el.textContent = "";
    el.classList.add("caret");
    var tick = function () {
      if (cancelled) return;
      i = Math.min(text.length, i + (Math.random() < 0.25 ? 2 : 1));
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        var ch = text.charAt(i - 1);
        timer = setTimeout(tick, /[.!?…]/.test(ch) ? speed * 9 : /[,;:—]/.test(ch) ? speed * 4 : speed);
      } else {
        el.classList.remove("caret");
        if (done) done();
      }
    };
    tick();
    return function finish() {
      if (cancelled || i >= text.length) return;
      cancelled = true; clearTimeout(timer);
      el.textContent = text; el.classList.remove("caret");
      if (done) done();
    };
  };

  /* ---------- Story preview ---------- */
  var story = $("[data-story]");
  if (story) {
    var log = $("[data-log]", story);
    var choicesEl = $("[data-choices]", story);
    var form = $("[data-input]", story);
    var input = $("input", form);
    var hpEl = $("[data-hp]", story), hpBar = $("[data-hp-bar]", story), invEl = $("[data-inv]", story);
    var toast = $("[data-toast]", story);
    var hp = 100, inventory = [], busy = false, finishTyping = null, toastTimer, started = false;

    var PLAY_URL = "https://play.google.com/store/apps/details?id=com.HinzApps.FableForge";
    var WEB_URL = "https://playfantasyforge.com/";

    var SCENES = {
      start: {
        text: "Rain lashes the stained glass of the Lantern Library. Somewhere between the endless shelves, a single book is whispering — and it knows your name. At the foot of a spiral stair, a hooded archivist lifts her candle and studies you in silence.",
        choices: [
          { label: "Ask the archivist about the whispering book", go: "ask" },
          { label: "Slip past her into the stacks", go: "sneak" },
          { label: "Conjure a light and search for another way", go: "light" }
        ]
      },
      ask: {
        text: "“Few can hear it,” the archivist murmurs. “Fewer survive reading it.” She presses a cold brass key into your palm and nods toward the stair. Far below, the whispering swells into a chant.",
        effect: { item: "Brass key" }
      },
      sneak: {
        text: "You melt into the shadows between the shelves. Loose pages drift past like moths. Then a sigil flares beneath your boots, flooding the aisle with molten light. The library knows you're here.",
        effect: { hp: -15 }
      },
      light: {
        text: "Blue fire blooms in your palm. For a heartbeat the shadows peel back, revealing a hidden door carved with a twenty-sided sigil, and a second set of wet footprints that aren't yours.",
        effect: { item: "Hidden door", map: true }
      },
      descend: {
        text: "Each step is colder than the last. At the bottom, the whispering book lies open on a lectern, its pages turning on their own, writing word by word the story of what you do next."
      },
      door: {
        text: "Behind the shelves, a door carved with a twenty-sided sigil swings inward without a sound. Beyond it, a ring of floating candles circles a single open book. Its pages are blank until ink begins to bleed across them, writing your story as it happens."
      },
      follow: {
        text: "You follow the voice through the maze of shelves until it stops, right behind you. You turn. The book hovers at eye level, open, its ink still wet with the words you just spoke."
      }
    };
    var roundTwo = function () {
      var foundDoor = inventory.indexOf("Hidden door") !== -1;
      return [
        { label: "Descend the spiral stair", go: "descend" },
        { label: foundDoor ? "Open the hidden door" : "Search the shelves for a secret passage", go: "door" },
        { label: "Follow the whispering", go: "follow" }
      ];
    };
    var ENDINGS = { descend: 1, door: 1, follow: 1 };

    var scrollLog = function () { log.scrollTop = log.scrollHeight; };
    var addLine = function (cls, text) {
      var p = document.createElement("p");
      if (cls) p.className = cls;
      if (text) p.textContent = text;
      log.appendChild(p);
      scrollLog();
      return p;
    };
    var showToast = function (msg, bad) {
      toast.textContent = msg;
      toast.classList.toggle("is-bad", !!bad);
      toast.classList.add("is-on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 2200);
    };
    var renderHud = function () {
      hpEl.textContent = hp;
      hpBar.style.setProperty("--hp", hp + "%");
      invEl.textContent = "";
      if (!inventory.length) { invEl.textContent = "Empty"; return; }
      inventory.forEach(function (item) {
        var chip = document.createElement("span");
        chip.className = "inv-chip";
        chip.textContent = item;
        invEl.appendChild(chip);
      });
    };
    var applyEffect = function (fx) {
      if (!fx) return;
      if (fx.hp) { hp = Math.max(1, hp + fx.hp); showToast("Sigil burn: " + String(fx.hp).replace("-", "−") + " HP", true); }
      if (fx.item) { inventory.push(fx.item); showToast(fx.map ? "Map updated: " + fx.item : "+ " + fx.item); }
      renderHud();
    };
    var clearChoices = function () { choicesEl.textContent = ""; };
    var renderChoices = function (list) {
      clearChoices();
      list.forEach(function (c, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        var n = document.createElement("span");
        n.className = "choice-num";
        n.textContent = String(i + 1);
        var t = document.createElement("span");
        t.textContent = c.label;
        b.appendChild(n); b.appendChild(t);
        b.addEventListener("click", function () { choose(c); });
        choicesEl.appendChild(b);
      });
    };
    var renderEnd = function () {
      clearChoices();
      var row = document.createElement("div");
      row.className = "choice-row";
      row.innerHTML =
        '<a class="btn btn-primary" href="' + PLAY_URL + '" target="_blank" rel="noopener">Continue on Google Play</a>' +
        '<a class="btn btn-ghost" href="' + WEB_URL + '" target="_blank" rel="noopener">Play in your browser</a>';
      choicesEl.appendChild(row);
      var again = document.createElement("button");
      again.type = "button";
      again.className = "restart";
      again.textContent = "Start the preview again";
      again.addEventListener("click", reset);
      choicesEl.appendChild(again);
    };
    var narrate = function (text, then) {
      busy = true;
      var p = addLine("", "");
      finishTyping = typeInto(p, text, 16, function () {
        busy = false; finishTyping = null; scrollLog();
        if (then) then();
      });
      // keep scrolled while typing
      var keep = setInterval(function () { scrollLog(); if (!busy) clearInterval(keep); }, 120);
    };
    var choose = function (c) {
      if (busy) return;
      clearChoices();
      addLine("you", c.label);
      var scene = SCENES[c.go];
      narrate(scene.text, function () {
        applyEffect(scene.effect);
        if (ENDINGS[c.go]) {
          addLine("note", "The rest of this story hasn't been written yet. In Fantasy Forge, you and the AI write it together.");
          renderEnd();
        } else {
          renderChoices(roundTwo());
        }
      });
    };
    var reset = function () {
      if (finishTyping) finishTyping();
      hp = 100; inventory = []; renderHud();
      log.textContent = "";
      clearChoices();
      narrate(SCENES.start.text, function () { renderChoices(SCENES.start.choices); });
    };

    // Clicking the log skips the typewriter
    log.addEventListener("click", function () { if (finishTyping) finishTyping(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (!val) return;
      if (finishTyping) finishTyping();
      input.value = "";
      addLine("you", val);
      var pathsLeft = !!$(".choice", choicesEl);
      addLine("note", "This preview is scripted" + (pathsLeft ? ", so pick one of the paths below" : "") +
        ". In Fantasy Forge, the AI Game Master answers anything you type, including “" + val + "”.");
    });

    // Begin when the panel scrolls into view
    var begin = function () { if (started) return; started = true; reset(); };
    if ("IntersectionObserver" in window) {
      var storyIO = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { begin(); storyIO.disconnect(); }
      }, { threshold: 0.35 });
      storyIO.observe(story);
    } else { begin(); }
  }

  /* ---------- Game editor: cycles through example adventures ---------- */
  var editor = $("[data-editor]");
  if (editor && !reduceMotion) {
    var GAMES = [
      {
        title: "Waves of Redemption",
        blurb: "Set sail into a world of swirling seas and shadowed alliances, where loyalty is tested and legends are forged.",
        genres: ["Adventure", "Piracy", "Moral choice"],
        events: ["Ready the crew of the frigate HMS Vanguard", "Spot pirate sails on the horizon", "Board the enemy ship amid cannon fire"]
      },
      {
        title: "Cosmic Odyssey: Starfleet",
        blurb: "Command a battered starship at the edge of charted space, where every jump could be your last.",
        genres: ["Sci-fi", "Space combat", "Exploration"],
        events: ["Answer a distress call from Zeta-9", "Negotiate with a salvager fleet", "Escape the collapsing asteroid field"]
      },
      {
        title: "The Whispering Woods",
        blurb: "An ancient forest remembers every traveller who ever entered it. Not all of them found their way out.",
        genres: ["Fantasy", "Mystery", "Horror"],
        events: ["Follow the lanterns off the old road", "Bargain with the Hollow Witch", "Break the curse before the last moon"]
      }
    ];
    var titleEl = $("[data-ed-title]", editor), blurbEl = $("[data-ed-blurb]", editor);
    var genresEl = $("[data-ed-genres]", editor), eventsEl = $("[data-ed-events]", editor), publish = $("[data-ed-publish]", editor);
    var idx = 0, edTimer = null, edVisible = false, edRunning = false;

    var show = function (game) {
      edRunning = true;
      genresEl.textContent = ""; eventsEl.textContent = "";
      titleEl.textContent = game.title;
      typeInto(blurbEl, game.blurb, 22, function () {
        game.genres.forEach(function (g, i) {
          setTimeout(function () {
            var c = document.createElement("span"); c.className = "chip"; c.textContent = g; genresEl.appendChild(c);
          }, i * 220);
        });
        game.events.forEach(function (ev, i) {
          setTimeout(function () {
            var li = document.createElement("li");
            var b = document.createElement("b"); b.textContent = String(i + 1);
            li.appendChild(b); li.appendChild(document.createTextNode(ev));
            eventsEl.appendChild(li);
            if (i === game.events.length - 1) {
              setTimeout(function () {
                publish.classList.remove("flash"); void publish.offsetWidth; publish.classList.add("flash");
                edRunning = false;
                schedule(4200);
              }, 700);
            }
          }, 700 + i * 420);
        });
      });
    };
    var schedule = function (delay) {
      clearTimeout(edTimer);
      edTimer = setTimeout(function () {
        if (!edVisible || document.hidden) { edTimer = null; return; }
        idx = (idx + 1) % GAMES.length;
        show(GAMES[idx]);
      }, delay);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        edVisible = entries[0].isIntersecting;
        if (edVisible && !edTimer && !edRunning) schedule(2600);
      }, { threshold: 0.4 }).observe(editor);
    }
  }
})();
