const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const distanceEl = document.getElementById('distance');
const comboEl = document.getElementById('combo');
const finalScoreEl = document.getElementById('finalScore');
const finalDistanceEl = document.getElementById('finalDistance');

let width, height;
let gameRunning = false;
let gameTime = 0;

const AUTUMN_COLORS = {
    leaves: ['#ff4500', '#ff8c00', '#ffa500', '#ffd700', '#cd853f', '#d2691e', '#8b4513', '#a0522d'],
    trunk: ['#3d2b1f', '#4a3728', '#5d4037', '#6d4c41'],
    ground: ['#2d1b0e', '#3d2b1f', '#4a3728'],
    sky: ['#1a0f05', '#2d1b0e', '#3d2b1f'],
    fog: ['rgba(255,140,0,0.08)', 'rgba(255,165,0,0.06)', 'rgba(210,105,30,0.05)']
};

const player = {
    x: 0, y: 0,
    targetX: 0,
    width: 24, height: 40,
    speed: 0,
    maxSpeed: 8,
    dashSpeed: 20,
    dashing: false,
    dashCooldown: 0,
    trail: [],
    color: '#8b4513',
    cloakColor: '#cd853f'
};

const trail = {
    segments: [],
    width: 120,
    curveOffset: 0,
    scrollSpeed: 4,
    nextSegmentY: 0
};

const leaves = [];
const particles = [];
const trees = [];
const backgroundTrees = [];
const fireflies = [];

let score = 0;
let distance = 0;
let combo = 1;
let comboTimer = 0;
let maxCombo = 1;

const keys = { left: false, right: false, space: false };

function resize() {
    width = Math.min(window.innerWidth, 800);
    height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    player.x = width / 2;
    player.targetX = width / 2;
    player.y = height - 100;
    trail.nextSegmentY = height;
}
window.addEventListener('resize', resize);
resize();

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choose(arr) { return arr[randInt(0, arr.length - 1)]; }

function initGame() {
    score = 0;
    distance = 0;
    combo = 1;
    comboTimer = 0;
    maxCombo = 1;
    gameTime = 0;
    player.x = width / 2;
    player.targetX = width / 2;
    player.speed = 0;
    player.dashing = false;
    player.dashCooldown = 0;
    player.trail = [];
    trail.segments = [];
    trail.curveOffset = 0;
    trail.scrollSpeed = 4;
    trail.nextSegmentY = height;
    leaves.length = 0;
    particles.length = 0;
    trees.length = 0;
    backgroundTrees.length = 0;
    fireflies.length = 0;

    for (let i = 0; i < 15; i++) {
        generateTrailSegment(height - i * 80);
    }
    for (let i = 0; i < 20; i++) {
        spawnTree(true);
    }
    for (let i = 0; i < 30; i++) {
        spawnTree(false);
    }
    for (let i = 0; i < 15; i++) {
        fireflies.push({
            x: rand(0, width),
            y: rand(0, height),
            offset: rand(0, Math.PI * 2),
            speed: rand(0.5, 1.5),
            brightness: rand(0.3, 1),
            color: choose(['#ffd700', '#ffeb3b', '#fff9c4', '#ff8c00'])
        });
    }
    updateUI();
}

function generateTrailSegment(y) {
    const curve = Math.sin(trail.curveOffset) * width * 0.3;
    const centerX = width / 2 + curve;
    trail.segments.push({
        y: y,
        centerX: centerX,
        leftX: centerX - trail.width / 2,
        rightX: centerX + trail.width / 2,
        decorations: generateDecorations(centerX, y)
    });
    trail.curveOffset += 0.15;
    if (trail.segments.length === 1) {
        for (let i = 0; i < 3; i++) spawnLeavesOnTrail(trail.segments[0]);
    }
}

function generateDecorations(centerX, y) {
    const decos = [];
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const offsetX = rand(trail.width * 0.3, trail.width * 0.6) * side;
        decos.push({
            x: centerX + offsetX,
            y: y + rand(-30, 30),
            type: choose(['rock', 'mushroom', 'fern', 'log']),
            size: rand(8, 20),
            rotation: rand(-0.3, 0.3),
            color: choose(AUTUMN_COLORS.ground)
        });
    }
    return decos;
}

function spawnLeavesOnTrail(segment) {
    const count = randInt(1, 3);
    for (let i = 0; i < count; i++) {
        const t = Math.random();
        const x = lerp(segment.leftX + 15, segment.rightX - 15, t);
        leaves.push({
            x: x,
            y: segment.y + rand(-10, 10),
            vx: rand(-0.5, 0.5),
            vy: rand(0.2, 0.8),
            rotation: rand(0, Math.PI * 2),
            rotSpeed: rand(-0.02, 0.02),
            size: rand(8, 14),
            color: choose(AUTUMN_COLORS.leaves),
            collected: false,
            wobble: rand(0, Math.PI * 2),
            wobbleSpeed: rand(0.02, 0.05)
        });
    }
}

function spawnTree(foreground) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const trailEdge = side === -1 ? trail.segments[0]?.leftX || width * 0.2 : trail.segments[0]?.rightX || width * 0.8;
    const x = trailEdge + side * rand(50, 200);
    const height_ = rand(150, 300);
    trees.push({
        x: x,
        y: height,
        height: height_,
        trunkWidth: rand(12, 25),
        branches: generateBranches(height_),
        leaves: generateTreeLeaves(height_),
        foreground: foreground,
        parallax: foreground ? 1 : 0.4,
        swayOffset: rand(0, Math.PI * 2),
        swaySpeed: rand(0.005, 0.015)
    });
}

function generateBranches(treeHeight) {
    const branches = [];
    const count = randInt(3, 6);
    for (let i = 0; i < count; i++) {
        const yRatio = rand(0.2, 0.8);
        const side = Math.random() < 0.5 ? -1 : 1;
        branches.push({
            yRatio: yRatio,
            angle: side * rand(0.3, 1.2),
            length: rand(treeHeight * 0.15, treeHeight * 0.35),
            thickness: rand(3, 8),
            subBranches: randInt(0, 2)
        });
    }
    return branches;
}

function generateTreeLeaves(treeHeight) {
    const leafClusters = [];
    const count = randInt(8, 15);
    for (let i = 0; i < count; i++) {
        leafClusters.push({
            x: rand(-treeHeight * 0.4, treeHeight * 0.4),
            y: rand(-treeHeight * 0.8, -treeHeight * 0.1),
            size: rand(15, 35),
            color: choose(AUTUMN_COLORS.leaves),
            density: rand(0.5, 1)
        });
    }
    return leafClusters;
}

function updateTrail() {
    trail.scrollSpeed = 4 + distance * 0.0008;
    trail.scrollSpeed = Math.min(trail.scrollSpeed, 12);

    for (let i = trail.segments.length - 1; i >= 0; i--) {
        trail.segments[i].y += trail.scrollSpeed;
        if (trail.segments[i].y > height + 100) {
            trail.segments.splice(i, 1);
        }
    }

    while (trail.segments.length < 20 || trail.segments[trail.segments.length - 1].y > -100) {
        generateTrailSegment(trail.segments[trail.segments.length - 1].y - 80);
        if (trail.segments.length % 3 === 0) {
            spawnLeavesOnTrail(trail.segments[trail.segments.length - 1]);
        }
    }

    distance += trail.scrollSpeed * 0.1;
}

function updatePlayer() {
    if (keys.left) player.targetX -= 6;
    if (keys.right) player.targetX += 6;

    player.targetX = Math.max(trail.segments[0]?.leftX + 20 || 20, Math.min(trail.segments[0]?.rightX - 20 || width - 20, player.targetX));

    if (keys.space && player.dashCooldown <= 0 && !player.dashing) {
        player.dashing = true;
        player.dashCooldown = 60;
        createDashParticles();
    }

    if (player.dashing) {
        player.speed = lerp(player.speed, player.dashSpeed, 0.3);
        if (player.speed > player.dashSpeed * 0.95) player.dashing = false;
    } else {
        player.speed = lerp(player.speed, player.maxSpeed, 0.1);
    }

    player.x = lerp(player.x, player.targetX, 0.15);

    player.trail.unshift({ x: player.x, y: player.y + player.height * 0.5, time: gameTime });
    if (player.trail.length > 20) player.trail.pop();

    if (player.dashCooldown > 0) player.dashCooldown--;
}

function checkLeafCollection() {
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;

    for (const leaf of leaves) {
        if (!leaf.collected &&
            leaf.x + leaf.size > playerLeft &&
            leaf.x - leaf.size < playerRight &&
            leaf.y + leaf.size > playerTop &&
            leaf.y - leaf.size < playerBottom) {
            leaf.collected = true;
            collectLeaf(leaf);
        }
    }

    leaves.forEach(leaf => {
        leaf.y += leaf.vy + trail.scrollSpeed * 0.3;
        leaf.x += leaf.vx + Math.sin(leaf.wobble) * 0.5;
        leaf.wobble += leaf.wobbleSpeed;
        leaf.rotation += leaf.rotSpeed;
        if (leaf.y > height + 50) leaf.collected = true;
    });

    for (let i = leaves.length - 1; i >= 0; i--) {
        if (leaves[i].collected) leaves.splice(i, 1);
    }
}

function collectLeaf(leaf) {
    score += 10 * combo;
    comboTimer = 60;
    combo = Math.min(combo + 0.1, 10);
    maxCombo = Math.max(maxCombo, combo);
    createLeafParticles(leaf.x, leaf.y, leaf.color);
    updateUI();
}

function updateCombo() {
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) combo = 1;
    }
    comboEl.classList.toggle('hidden', combo <= 1.1);
    comboEl.textContent = `Combo: x${combo.toFixed(1)}`;
}

function createLeafParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: rand(-3, 3),
            vy: rand(-5, -1),
            life: 1,
            decay: rand(0.02, 0.04),
            size: rand(3, 8),
            color,
            rotation: rand(0, Math.PI * 2),
            rotSpeed: rand(-0.1, 0.1),
            gravity: 0.15
        });
    }
}

function createDashParticles() {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: player.x + rand(-10, 10),
            y: player.y + player.height * 0.5 + rand(-10, 10),
            vx: rand(-4, 4),
            vy: rand(-2, 2),
            life: 1,
            decay: rand(0.03, 0.06),
            size: rand(4, 12),
            color: choose(['#ffd700', '#ff8c00', '#ffa500', '#fff8dc']),
            rotation: rand(0, Math.PI * 2),
            rotSpeed: rand(-0.2, 0.2),
            gravity: 0
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy + (p.gravity || 0);
        p.vy += p.gravity || 0;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function updateTrees() {
    for (const tree of trees) {
        tree.y += trail.scrollSpeed * tree.parallax;
        if (tree.y > height + tree.height + 100) {
            const idx = trees.indexOf(tree);
            trees.splice(idx, 1);
            spawnTree(tree.foreground);
        }
    }
    for (const tree of backgroundTrees) {
        tree.y += trail.scrollSpeed * tree.parallax;
        if (tree.y > height + tree.height + 100) {
            const idx = backgroundTrees.indexOf(tree);
            backgroundTrees.splice(idx, 1);
            spawnTree(false);
        }
    }
}

function updateFireflies() {
    for (const fly of fireflies) {
        fly.y += trail.scrollSpeed * 0.3;
        fly.x += Math.sin(gameTime * 0.01 + fly.offset) * 0.5;
        if (fly.y > height + 50) {
            fly.y = -50;
            fly.x = rand(0, width);
        }
    }
}

function updateUI() {
    scoreEl.textContent = `Leaves: ${score}`;
    distanceEl.textContent = `Distance: ${Math.floor(distance)}m`;
}

function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, AUTUMN_COLORS.sky[0]);
    gradient.addColorStop(0.5, AUTUMN_COLORS.sky[1]);
    gradient.addColorStop(1, AUTUMN_COLORS.sky[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 3; i++) {
        const fogGrad = ctx.createLinearGradient(0, height * (0.3 + i * 0.2), 0, height * (0.5 + i * 0.2));
        fogGrad.addColorStop(0, AUTUMN_COLORS.fog[i]);
        fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, height * (0.3 + i * 0.2), width, height * 0.3);
    }
}

function drawBackgroundTrees() {
    for (const tree of backgroundTrees) {
        drawTree(tree, 0.3);
    }
}

function drawForegroundTrees() {
    for (const tree of trees) {
        if (tree.foreground) drawTree(tree, 1);
    }
}

function drawTree(tree, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const sway = Math.sin(gameTime * tree.swaySpeed + tree.swayOffset) * 8;
    const baseX = tree.x + sway;
    const baseY = tree.y;

    ctx.strokeStyle = choose(AUTUMN_COLORS.trunk);
    ctx.lineWidth = tree.trunkWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + sway * 0.5, baseY - tree.height * 0.5, baseX + sway, baseY - tree.height);
    ctx.stroke();

    for (const branch of tree.branches) {
        const bx = baseX + sway * (1 - branch.yRatio);
        const by = baseY - tree.height * branch.yRatio;
        const endX = bx + Math.cos(branch.angle) * branch.length;
        const endY = by + Math.sin(branch.angle) * branch.length;

        ctx.strokeStyle = choose(AUTUMN_COLORS.trunk);
        ctx.lineWidth = branch.thickness;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        for (let s = 0; s < branch.subBranches; s++) {
            const t = rand(0.3, 0.8);
            const sbx = lerp(bx, endX, t);
            const sby = lerp(by, endY, t);
            const sendX = sbx + Math.cos(branch.angle + rand(-0.5, 0.5)) * branch.length * 0.5;
            const sendY = sby + Math.sin(branch.angle + rand(-0.5, 0.5)) * branch.length * 0.5;
            ctx.lineWidth = branch.thickness * 0.5;
            ctx.beginPath();
            ctx.moveTo(sbx, sby);
            ctx.lineTo(sendX, sendY);
            ctx.stroke();
        }
    }

    for (const cluster of tree.leaves) {
        const cx = baseX + cluster.x + sway * 0.3;
        const cy = baseY - tree.height + cluster.y;
        drawLeafCluster(cx, cy, cluster.size, cluster.color, cluster.density);
    }
    ctx.restore();
}

function drawLeafCluster(x, y, size, color, density) {
    const count = Math.floor(size * density * 0.3);
    for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const dist = rand(0, size);
        const lx = x + Math.cos(angle) * dist;
        const ly = y + Math.sin(angle) * dist * 0.6;
        const leafSize = rand(4, 10);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rand(0, Math.PI * 2));
        ctx.fillStyle = color;
        ctx.globalAlpha = rand(0.6, 1);
        ctx.beginPath();
        ctx.ellipse(0, 0, leafSize, leafSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawTrail() {
    for (let i = trail.segments.length - 1; i >= 0; i--) {
        const seg = trail.segments[i];
        const nextSeg = trail.segments[i + 1];

        const trailGrad = ctx.createLinearGradient(0, seg.y, 0, seg.y + 80);
        trailGrad.addColorStop(0, choose(AUTUMN_COLORS.ground));
        trailGrad.addColorStop(1, choose(AUTUMN_COLORS.ground).replace(')', ',0.7)').replace('rgb', 'rgba'));
        ctx.fillStyle = trailGrad;

        ctx.beginPath();
        if (nextSeg) {
            ctx.moveTo(seg.leftX, seg.y);
            ctx.quadraticCurveTo((seg.leftX + nextSeg.leftX) / 2, (seg.y + nextSeg.y) / 2, nextSeg.leftX, nextSeg.y);
            ctx.lineTo(nextSeg.rightX, nextSeg.y);
            ctx.quadraticCurveTo((seg.rightX + nextSeg.rightX) / 2, (seg.y + nextSeg.y) / 2, seg.rightX, seg.y);
        } else {
            ctx.moveTo(seg.leftX, seg.y);
            ctx.lineTo(seg.rightX, seg.y);
            ctx.lineTo(seg.rightX, seg.y + 80);
            ctx.lineTo(seg.leftX, seg.y + 80);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(seg.leftX, seg.y);
        if (nextSeg) ctx.quadraticCurveTo((seg.leftX + nextSeg.leftX) / 2, (seg.y + nextSeg.y) / 2, nextSeg.leftX, nextSeg.y);
        else ctx.lineTo(seg.leftX, seg.y + 80);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(seg.rightX, seg.y);
        if (nextSeg) ctx.quadraticCurveTo((seg.rightX + nextSeg.rightX) / 2, (seg.y + nextSeg.y) / 2, nextSeg.rightX, nextSeg.y);
        else ctx.lineTo(seg.rightX, seg.y + 80);
        ctx.stroke();

        for (const deco of seg.decorations) {
            if (deco.y > seg.y - 50 && deco.y < seg.y + 130) {
                drawDecoration(deco);
            }
        }
    }
}

function drawDecoration(deco) {
    ctx.save();
    ctx.translate(deco.x, deco.y);
    ctx.rotate(deco.rotation);
    ctx.fillStyle = deco.color;
    switch (deco.type) {
        case 'rock':
            ctx.beginPath();
            ctx.ellipse(0, 0, deco.size, deco.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'mushroom':
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-2, 0, 4, deco.size);
            ctx.fillStyle = choose(['#ff6b6b', '#ffd93d', '#fff']);
            ctx.beginPath();
            ctx.ellipse(0, 0, deco.size * 0.8, deco.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'fern':
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * 4);
                ctx.quadraticCurveTo(deco.size * 0.5, i * 4 - 5, deco.size, i * 4);
                ctx.strokeStyle = '#2d5a27';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            break;
        case 'log':
            ctx.fillStyle = '#3d2b1f';
            ctx.fillRect(-deco.size, -deco.size * 0.3, deco.size * 2, deco.size * 0.6);
            ctx.strokeStyle = '#2d1b0e';
            ctx.lineWidth = 1;
            ctx.strokeRect(-deco.size, -deco.size * 0.3, deco.size * 2, deco.size * 0.6);
            break;
    }
    ctx.restore();
}

function drawLeaves() {
    for (const leaf of leaves) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.fillStyle = leaf.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-leaf.size * 0.8, 0);
        ctx.quadraticCurveTo(0, -leaf.size * 0.3, leaf.size * 0.8, 0);
        ctx.stroke();
        ctx.restore();
    }
}

function drawPlayer() {
    for (let i = player.trail.length - 1; i >= 0; i--) {
        const t = player.trail[i];
        const age = gameTime - t.time;
        const alpha = Math.max(0, 1 - age / 20) * 0.3;
        const size = lerp(player.width, 0, age / 20);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = player.cloakColor;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(player.x, player.y + player.height * 0.5);

    const sway = Math.sin(gameTime * 0.15) * 3;
    ctx.rotate(sway * 0.02);

    ctx.fillStyle = player.cloakColor;
    ctx.beginPath();
    ctx.moveTo(0, -player.height * 0.4);
    ctx.quadraticCurveTo(-player.width * 0.6, -player.height * 0.1, -player.width * 0.4, player.height * 0.4);
    ctx.quadraticCurveTo(0, player.height * 0.2, player.width * 0.4, player.height * 0.4);
    ctx.quadraticCurveTo(player.width * 0.6, -player.height * 0.1, 0, -player.height * 0.4);
    ctx.fill();

    ctx.fillStyle = '#2d1b0e';
    ctx.beginPath();
    ctx.arc(0, -player.height * 0.45, player.width * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d2691e';
    ctx.beginPath();
    ctx.arc(-6, -player.height * 0.48, 3, 0, Math.PI * 2);
    ctx.arc(6, -player.height * 0.48, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-player.width * 0.15, -player.height * 0.1, player.width * 0.3, player.height * 0.5);

    if (player.dashing) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-25, 20);
        ctx.moveTo(15, 10);
        ctx.lineTo(25, 20);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawFireflies() {
    for (const fly of fireflies) {
        ctx.save();
        ctx.globalAlpha = fly.brightness * (0.5 + Math.sin(gameTime * 0.05 + fly.offset) * 0.5);
        ctx.fillStyle = fly.color;
        ctx.shadowColor = fly.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    drawSky();
    drawBackgroundTrees();
    drawTrail();
    drawLeaves();
    drawParticles();
    drawPlayer();
    drawForegroundTrees();
    drawFireflies();
}

function gameLoop() {
    if (!gameRunning) return;
    gameTime++;
    updateTrail();
    updatePlayer();
    checkLeafCollection();
    updateCombo();
    updateParticles();
    updateTrees();
    updateFireflies();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    initGame();
    gameLoop();
}

function endGame() {
    gameRunning = false;
    finalScoreEl.textContent = `Leaves collected: ${score}`;
    finalDistanceEl.textContent = `Distance traveled: ${Math.floor(distance)}m`;
    gameOverScreen.classList.remove('hidden');
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === ' ') { e.preventDefault(); keys.space = true; }
});
document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === ' ') keys.space = false;
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    if (x < width / 2) keys.left = true;
    else keys.right = true;
});
canvas.addEventListener('touchend', e => {
    keys.left = false;
    keys.right = false;
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    player.targetX = Math.max(trail.segments[0]?.leftX + 20 || 20, Math.min(trail.segments[0]?.rightX - 20 || width - 20, x));
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (startScreen.classList.contains('hidden') === false || gameOverScreen.classList.contains('hidden') === false)) {
        startGame();
    }
});