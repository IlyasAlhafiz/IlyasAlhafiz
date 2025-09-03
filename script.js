(() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highEl = document.getElementById("highscore");
  const speedLabel = document.getElementById("speedLabel");
  const btnPause = document.getElementById("btnPause");
  const btnReset = document.getElementById("btnReset");
  const btnSlow = document.getElementById("btnSlow");
  const btnNormal = document.getElementById("btnNormal");
  const btnFast = document.getElementById("btnFast");
  const modalTpl = document.getElementById("gameOverTpl");

  const CELL = 20;                       // ukuran grid
  const GRID = canvas.width / CELL;      // 480/20 = 24
  const SPEEDS = { slow: 160, normal: 110, fast: 70 };
  let speed = SPEEDS.normal;

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // State
  let dir = { x: 1, y: 0 };              // arah awal ke kanan
  let snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
  let food = spawnFood();
  let score = 0;
  let paused = false;
  let loopId = null;
  const HS_KEY = "snake-hs";
  highEl.textContent = localStorage.getItem(HS_KEY) ?? 0;

  function spawnFood() {
    let f;
    do {
      f = { x: rand(0, GRID - 1), y: rand(0, GRID - 1) };
    } while (snake.some(s => s.x === f.x && s.y === f.y));
    return f;
  }

  // Input
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") turn(0, -1);
    if (k === "arrowdown" || k === "s") turn(0, 1);
    if (k === "arrowleft" || k === "a") turn(-1, 0);
    if (k === "arrowright" || k === "d") turn(1, 0);
    if (k === "p") togglePause();
    if (k === "r") reset();
  });

  btnPause.onclick = togglePause;
  btnReset.onclick = reset;

  btnSlow.onclick = () => setSpeed("slow");
  btnNormal.onclick = () => setSpeed("normal");
  btnFast.onclick = () => setSpeed("fast");

  function setSpeed(mode) {
    speed = SPEEDS[mode];
    speedLabel.textContent = mode === "slow" ? "Lambat" : mode === "fast" ? "Cepat" : "Normal";
    [btnSlow, btnNormal, btnFast].forEach(b => b.classList.remove("active"));
    (mode === "slow" ? btnSlow : mode === "fast" ? btnFast : btnNormal).classList.add("active");
    if (!paused) {
      clearInterval(loopId);
      loopId = setInterval(tick, speed);
    }
  }

  function turn(x, y) {
    // cegah balik arah 180°
    if (snake.length > 1 && (x === -dir.x && y === -dir.y)) return;
    dir = { x, y };
  }

  function togglePause() {
    paused = !paused;
    if (paused) {
      clearInterval(loopId);
      btnPause.textContent = "▶️ Lanjut (P)";
    } else {
      btnPause.textContent = "⏸️ Jeda (P)";
      clearInterval(loopId);
      loopId = setInterval(tick, speed);
    }
  }

  function reset() {
    clearInterval(loopId);
    dir = { x: 1, y: 0 };
    snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
    food = spawnFood();
    score = 0;
    scoreEl.textContent = score;
    paused = false;
    btnPause.textContent = "⏸️ Jeda (P)";
    loopId = setInterval(tick, speed);
    draw();
  }

  function gameOver() {
    clearInterval(loopId);
    const hs = Math.max(Number(localStorage.getItem(HS_KEY) ?? 0), score);
    localStorage.setItem(HS_KEY, hs);
    highEl.textContent = hs;

    // Tampilkan modal
    const modal = modalTpl.content.firstElementChild.cloneNode(true);
    modal.querySelector("#finalScore").textContent = score;
    modal.querySelector("#playAgain").onclick = () => {
      document.body.removeChild(modal);
      reset();
    };
    modal.querySelector("#closeModal").onclick = () => {
      document.body.removeChild(modal);
    };
    document.body.appendChild(modal);
  }

  function tick() {
    // posisi baru head
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // tabrak dinding / badan
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    // gerak
    snake.unshift(head);

    // makan
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      food = spawnFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid halus
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#ffffff";
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(canvas.width, i * CELL + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // food glow
    const foodX = food.x * CELL, foodY = food.y * CELL;
    const grad = ctx.createRadialGradient(foodX + CELL/2, foodY + CELL/2, 2, foodX + CELL/2, foodY + CELL/2, 14);
    grad.addColorStop(0, "rgba(245, 158, 11, .9)");  // kuning
    grad.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(foodX - 6, foodY - 6, CELL + 12, CELL + 12);

    // food
    ctx.fillStyle = "#f59e0b";
    roundRect(ctx, foodX + 3, foodY + 3, CELL - 6, CELL - 6, 4, true);

    // snake
    snake.forEach((seg, i) => {
      const x = seg.x * CELL, y = seg.y * CELL;
      const hue = 145; // hijau
      const light = 35 + Math.min(i * 1.5, 20);
      ctx.fillStyle = `hsl(${hue} 70% ${light}%)`;
      roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 6, true);
      // highlight
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#fff";
      roundRect(ctx, x + 3, y + 3, CELL - 8, 6, 3, true);
      ctx.globalAlpha = 1;
    });
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  // mulai
  reset();
})();
