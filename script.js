const canvas = document.getElementById('board');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const ctx = canvas.getContext('2d');

const TOP_SPACE_PX = 200;
const GAP_PX = 50;
const PEG_RADIUS = 6;
const START_PEGS = 5;

const BALL_RADIUS = 10;
const GRAVITY = 0.15;
const BOUNCE_DAMPING = 0.75;

let pegs = [];
let boardLeft = 0;
let boardRight = 0;

let slots = [];
let slotPercents = [];
let score = 0;

let ball = {};

function buildPegs() {
    pegs = [];
    const usableHeight = canvas.height - TOP_SPACE_PX - GAP_PX;
    const rows = Math.floor(usableHeight / GAP_PX);
    const maxColumns = Math.floor(canvas.width / GAP_PX);

    let maxRowWidth = 0;

    for (let i = 0; i < rows; i++) {
        const pegRow = [];
        const y = i * GAP_PX + TOP_SPACE_PX;

        const countInRow = Math.min(START_PEGS + i, maxColumns);
        const rowWidth = (countInRow - 1) * GAP_PX;
        maxRowWidth = Math.max(maxRowWidth, rowWidth);

        const startX = (canvas.width - rowWidth) / 2;

        for (let j = 0; j < countInRow; j++) {
            pegRow.push([startX + j * GAP_PX, y]);
        }
        pegs.push(pegRow);
    }

    boardLeft = (canvas.width - maxRowWidth - GAP_PX) / 2;
    boardRight = boardLeft + maxRowWidth + GAP_PX;
}

function drawPegs(ctx) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boardLeft, 0);
    ctx.lineTo(boardLeft, canvas.height);
    ctx.moveTo(boardRight, 0);
    ctx.lineTo(boardRight, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#ccc';
    for (const row of pegs) {
        for (const [x, y] of row) {
            ctx.beginPath();
            ctx.arc(x, y, PEG_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function buildSlots() {
    slots = [];
    for (let i = 0; i < pegs[pegs.length - 1].length; i++) {
        slots.push({ left: boardLeft + i * GAP_PX, right: boardLeft + (i + 1) * GAP_PX });
    }

    const mid = (slots.length - 1) / 2;
    slotPercents = slots.map((_, i) => Math.round(Math.abs(i - mid)) / mid);
}

function drawSlots(ctx) {
    const bottomRowY = pegs[pegs.length - 1][0][1];
    const top = bottomRowY + GAP_PX / 2;

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    for (let i = 1; i < slots.length; i++) {
        ctx.beginPath();
        ctx.moveTo(slots[i].left, top);
        ctx.lineTo(slots[i].left, canvas.height);
        ctx.stroke();
    }

    slots.forEach((slot, i) => {
        const width = slot.right - slot.left;
        const hue = 120 -  120 * (1 - slotPercents[i]);
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(slot.left + ctx.lineWidth / 2, canvas.height - GAP_PX, GAP_PX - ctx.lineWidth, GAP_PX);
    });
}

function checkSlotCollisions() {
    const bottomRowY = pegs[pegs.length - 1][0][1];
    const dividerTop = bottomRowY + GAP_PX / 2;

    if (ball.y < dividerTop) return;

    for (let i = 1; i < slots.length; i++) {
        const dividerX = slots[i].left;
        const dx = ball.x - dividerX;

        if (Math.abs(dx) < BALL_RADIUS) {
            ball.x = dividerX + Math.sign(dx || 1) * BALL_RADIUS;
            ball.vx *= -BOUNCE_DAMPING;
        }
    }
}

function startGame() {
    ball = {
        x: canvas.width / 2,
        y: TOP_SPACE_PX - GAP_PX,
        vx: Math.random() - 0.5,
        vy: 0
    };
}

function updateBalls() {
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - BALL_RADIUS < boardLeft) {
        ball.x = boardLeft + BALL_RADIUS;
        ball.vx *= -BOUNCE_DAMPING;
    } else if (ball.x + BALL_RADIUS > boardRight) {
        ball.x = boardRight - BALL_RADIUS;
        ball.vx *= -BOUNCE_DAMPING;
    }

    for (const row of pegs) {
        for (const [px, py] of row) {
            const dx = ball.x - px;
            const dy = ball.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = BALL_RADIUS + PEG_RADIUS;

            if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                ball.x += nx * overlap;
                ball.y += ny * overlap;

                const dot = ball.vx * nx + ball.vy * ny;
                ball.vx -= 2 * dot * nx;
                ball.vy -= 2 * dot * ny;

                ball.vx = ball.vx * BOUNCE_DAMPING + (Math.random() - 0.5) / 2;
                ball.vy *= BOUNCE_DAMPING;
            }
        }
    }

    checkSlotCollisions();

    if (ball.y + BALL_RADIUS > canvas.height - GAP_PX) {
        const slotIndex = slots.findIndex(slot => ball.x >= slot.left && ball.x < slot.right);
        if (slotIndex !== -1) {
            console.log(`score: ${slotPercents[slotIndex]}`);
        }
        ball = {};
    }
}

function drawBalls(ctx) {
    if (ball.x === undefined) return;
    ctx.fillStyle = '#f15';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPegs(ctx);
    drawSlots(ctx);
    updateBalls();
    drawBalls(ctx);
    requestAnimationFrame(gameLoop);
}

buildPegs();
buildSlots();
gameLoop();