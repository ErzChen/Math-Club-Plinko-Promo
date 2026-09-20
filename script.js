// CORE
const TRANSITION_MS = 5000; 
let isTransitioning = false;

function nextPage(event) {
    if (isTransitioning) return;
    isTransitioning = true;
    document.body.classList.add('is-transitioning');

    const allPages = Array.from(document.querySelectorAll('.page'));
    const currentIndex = allPages.findIndex(page => page.classList.contains('active'));
    if (currentIndex === allPages.length - 1) {
        isTransitioning = false;
        return console.error('Last Page!');
    }

    const current = allPages[currentIndex];
    const next = document.getElementById(`page${currentIndex + 1}`);

    next.style.transition = 'none';
    next.classList.add('fly-in-start');
    next.classList.add('active');
    next.getBoundingClientRect();
    next.style.transition = '';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            next.classList.remove('fly-in-start');

            current.style.zIndex = 3;
            const anim = current.animate(
                [
                    { transform: 'translateZ(0px)' },
                    { transform: 'translateZ(900px)' }
                ],
                {
                    duration: TRANSITION_MS,
                    easing: 'cubic-bezier(0.83, 0, 0.17, 1)', 
                    fill: 'forwards'
                }
            );

            anim.onfinish = () => {
                current.classList.remove('active');
                current.style.transform = '';
                current.style.zIndex = '';
                isTransitioning = false;
                document.body.classList.remove('is-transitioning');
            };
        });
    });
}

const modalOverlay = document.getElementById('modalOverlay');

function openQuestionManager() {
    modalOverlay.classList.add('open');
}

function closeQuestionManager() {
    modalOverlay.classList.remove('open');
}

let questions = [];

function escapeHtml(string) {
	return String(string)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function typeset(element) {
	if (window.renderMathInElement && element) {
		renderMathInElement(element, {
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '$', right: '$', display: false },
			],
			throwOnError: false,
		});
	}
}

function normalizeImgData(imgData) {
	if (!imgData) return null;
	if (typeof imgData === 'string')
		return { src: imgData, width: null, height: null, natW: null, natH: null };
	if (!imgData.src) return null;
	return {
		src: imgData.src,
		width: imgData.width || null,
		height: imgData.height || null,
		natW: imgData.natW || imgData.width || null,
		natH: imgData.natH || imgData.height || null,
	};
}

function fileToCompressedDataURL(file, callback, maxDim = 900, quality = 0.82) {
	if (!file || !file.type.startsWith('image/')) {
		callback(null);
		return;
	}
	const reader = new FileReader();
	reader.onload = () => {
		const img = new Image();
		img.onload = () => {
			let { width, height } = img;
			if (width > maxDim || height > maxDim) {
				const scale = maxDim / Math.max(width, height);
				width = Math.round(width * scale);
				height = Math.round(height * scale);
			}
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, width, height);
			context.drawImage(img, 0, 0, width, height);
			callback(canvas.toDataURL('image/jpeg', quality), width, height);
		};
		img.onerror = () => callback(null);
		img.src = reader.result;
	};
	reader.onerror = () => callback(null);
	reader.readAsDataURL(file);
}

function renderImgUploadField(wrapId, imgData, onChange) {
	const wrap = document.getElementById(wrapId);
	if (!wrap) return;
	const norm = normalizeImgData(imgData);

	if (norm) {
		wrap.innerHTML = `
			<div class="img-upload-row">
				<div class="img-preview-wrap">
					<img src="${norm.src}" />
					<button type="button" class="img-remove" id="${wrapId}Remove">
						<i class="fa-solid fa-xmark"></i>
					</button>
				</div>
				<div class="img-size-control">
					<label class="img-size-label">
						W
						<input type="number" class="img-size-input" id="${wrapId}Width" data-dim="width"
							min="10" max="4000" step="1" value="${norm.width || ''}" placeholder="auto" />
					</label>
					<label class="img-size-label">
						H
						<input type="number" class="img-size-input" id="${wrapId}Height" data-dim="height"
							min="10" max="4000" step="1" value="${norm.height || ''}" placeholder="auto" />
					</label>
					<span class="img-size-unit">px</span>
					<label class="img-lock-label">
						<input type="checkbox" class="img-lock-ratio" id="${wrapId}Lock" checked />
						lock ratio
					</label>
				</div>
			</div>
		`;
		document.getElementById(`${wrapId}Remove`).onclick = () => onChange(null);

		const widthInput = document.getElementById(`${wrapId}Width`);
		const heightInput = document.getElementById(`${wrapId}Height`);
		const lockBox = document.getElementById(`${wrapId}Lock`);
		const natW = norm.natW;
		const natH = norm.natH;

		widthInput.addEventListener('input', () => {
			if (!lockBox.checked || !natW || !natH) return;
			const w = parseInt(widthInput.value, 10);
			if (w > 0) heightInput.value = Math.round((w * natH) / natW);
		});
		heightInput.addEventListener('input', () => {
			if (!lockBox.checked || !natW || !natH) return;
			const h = parseInt(heightInput.value, 10);
			if (h > 0) widthInput.value = Math.round((h * natW) / natH);
		});

		const commit = () => {
			const w = parseInt(widthInput.value, 10);
			const h = parseInt(heightInput.value, 10);
			onChange({
				src: norm.src,
				width: w > 0 ? w : null,
				height: h > 0 ? h : null,
				natW,
				natH,
			});
		};
		widthInput.addEventListener('change', commit);
		heightInput.addEventListener('change', commit);
	} else {
		wrap.innerHTML = `
			<div class="img-upload-row">
				<input type="file" id="${wrapId}File" accept="image/*" />
			</div>
		`;
		wrap.querySelector('input[type=file]').onchange = (event) => {
			const file = event.target.files[0];
			if (!file) return;
			fileToCompressedDataURL(file, (result, width, height) => {
				if (result) {
					onChange({
						src: result,
						width: width || null,
						height: height || null,
						natW: width || null,
						natH: height || null,
					});
				} else {
					alert('Could not read that image file.');
				}
			});
		};
	}
}

const ladderImageFields = {
	state: { q: null },
	render() {
		renderImgUploadField('newQuestionImgWrap', this.state.q, (val) => {
			this.state.q = val;
			this.render();
		});
	},
	reset() {
		this.state.q = null;
		this.render();
	},
};

function saveQuestions() {
	try {
		localStorage.setItem('mathClubPlinkoData', JSON.stringify(questions));
	} catch (err) {}
}

function loadQuestions() {
	try {
		const saved = localStorage.getItem('mathClubPlinkoData');
		if (saved) questions = JSON.parse(saved);
	} catch (err) {}
}

function addCustomQuestion() {
	const grade = Math.max(
		9,
		Math.min(12, parseInt(document.getElementById('newGrade').value) || 9),
	);
	const question = document.getElementById('newQuestion').value.trim();
	const answer = document.getElementById('newAnswer').value.trim();
	if (!question || !answer) {
		alert('Enter at least a question and an answer.');
		return;
	}
	questions.push({
		grade,
		q: question,
		qImg: ladderImageFields.state.q || undefined,
		a: answer,
	});
	document.getElementById('newGrade').value = '';
	document.getElementById('newQuestion').value = '';
	document.getElementById('newAnswer').value = '';
	ladderImageFields.reset();
	saveQuestions();
	renderCustomLadderList();
}

function deleteCustomLadder(i) {
	questions.splice(i, 1);
	saveQuestions();
	renderCustomLadderList();
}

function renderCustomLadderList() {
	const list = document.getElementById('customLadderList');
	if (!list) return;
	if (questions.length === 0) {
		list.innerHTML =
			'<div style="color: var(--chalk-muted); font-size: 13px;">No custom questions yet.</div>';
		return;
	}
	list.innerHTML = questions
		.map((problem, i) => {
			const img = normalizeImgData(problem.qImg);
			const dims = img && img.width && img.height ? ` (${img.width}×${img.height}px)` : '';
			return `
		<div class="custom-list-item">
			${img ? `<img class="thumb" src="${img.src}" />` : ''}
			<div class="txt"><b>Grade ${problem.grade}</b> — ${escapeHtml(problem.q)}${img ? `<span class="dims">${dims}</span>` : ''}<br>${escapeHtml(problem.a)}</div>
			<button class="btn small ghost" onclick="deleteCustomLadder(${i})">Delete</button>
		</div>
	`;
		})
		.join('');
	typeset(list);
}

loadQuestions();
ladderImageFields.render();
renderCustomLadderList();

// PLINKO GAME

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