// graph/network visualization

// settings
const dpi = 192; // canvas resolution
const fps = 30; // frames per sec
const colors = [
    '#e91e63',
    '#fa750f',
    '#ffeb3b',
    '#4caf50',
    '#02b3e4',
    '#c341d8'
]; // color palette of dots, from https://www.materialpalette.com/colors
const radius = 6; // radius of dots
const spacing = 75; // average spacing between dots
const lineWidth = 2; // thickness of lines
const limitNumber = 500; // dot hard limit for performance
const greyColor = '#808080'; // color of resting dots and connecting lines
const minSpeed = 1; // px per sec
const maxSpeed = 6; // px per sec
const contain = 4; // accel. to contain dot within bounds, px per sec^2
const minAlpha = 0.25; // resting dot opacity
const maxAlpha = 1; // peak dot opacity
const alphaSpeed = 0.1; // how fast alpha transitions, in % per frame
const minDist = 10; // dist below which dots aren't visibly connected
const midDist = 30; // distance at which dots are most visibly connected
const maxDist = 100; // dist above which dots aren't visibly connected
// special animation settings
const pathMaxLength = 6; // max number of dots in a random path
const pathMinDistance = 50; // min distance between dots in a path
const pathMaxDistance = 150; // max distance between dots in a path
const pathMaxAngle = 60; // max angle between to successive lines in a path
const pathGlowTime = 2000; // time that glow lasts in milliseconds
const pathGlowCascade = 20; // milliseconds between path elements glowing
const rippleGlowSpeed = 300; // speed of ripple in px per sec
const rippleGlowTime = 500; // time that glow lasts in milliseconds
const glowInterval = 5000; // milliseconds between glows
const rippleOdds = 7; // 1/n chance that glow will be ripple, not path

// global vars
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let dots = [];
let lines = [];
let width = 0;
let height = 0;
let frameTimer = null;
let glowTimer = null;

// dot object
class Dot {
    // initialize instance
    constructor(x, y) {
        // make boundaries around initial grid point
        this.left = x - spacing / 2 + radius;
        this.top = y - spacing / 2 + radius;
        this.right = x + spacing / 2 - radius;
        this.bottom = y + spacing / 2 - radius;

        // place randomly within boundaries
        this.x = this.left + (this.right - this.left) * Math.random();
        this.y = this.top + (this.bottom - this.top) * Math.random();

        // random speed and angle
        const speed = minSpeed + (maxSpeed - minSpeed) * Math.random();
        const angle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(angle) * speed;
        this.vy = -Math.sin(angle) * speed;

        // other props
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 0;
        this.targetAlpha = minAlpha;
    }
    // get distance from this dot to specified point
    distanceTo(x, y) {
        return Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
    }
    // get angle  (in radians) from this dot to specified point
    angleTo(x, y) {
        return Math.atan2(y - this.y, x - this.x);
    }
    // get list of other dots in order of closeness to this one
    findClosest(list) {
        list = list || dots;
        const closest = [];
        for (const dot of list) {
            if (dot !== this) {
                closest.push({
                    dot: dot,
                    dist: this.distanceTo(dot.x, dot.y)
                });
            }
        }
        closest.sort((a, b) => a.dist - b.dist);
        return closest;
    }
    // calculate values
    step() {
        // bounce off boundaries
        if (this.x < this.left)
            this.vx += contain / fps;
        if (this.y < this.top)
            this.vy += contain / fps;
        if (this.x > this.right)
            this.vx -= contain / fps;
        if (this.y > this.bottom)
            this.vy -= contain / fps;

        // limit velocity
        if (this.vx < -maxSpeed)
            this.vx = -Math.abs(this.vx);
        if (this.vy < -maxSpeed)
            this.vy = -Math.abs(this.vy);
        if (this.vx > maxSpeed)
            this.vx = Math.abs(this.vx);
        if (this.vy > maxSpeed)
            this.vy = Math.abs(this.vy);

        // increment position
        this.x += this.vx / fps;
        this.y += this.vy / fps;

        // increment alpha
        this.alpha += (this.targetAlpha - this.alpha) * alphaSpeed;
    }
    // draw instance
    draw() {
        const blendAmount = (this.alpha - minAlpha) / (maxAlpha - minAlpha);
        const color = blendColors(greyColor, this.color, blendAmount);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// line object
class Line {
    // initialize instance
    constructor(startDot, endDot) {
        this.startDot = startDot;
        this.endDot = endDot;
        this.x1;
        this.y1;
        this.x2;
        this.y2;
        this.alpha = 0;
        this.targetAlpha = minAlpha;
    }
    // find line that links specified dots together
    static lookup(dotA, dotB) {
        for (const line of lines) {
            if (
                (line.startDot === dotA && line.endDot === dotB) ||
                (line.startDot === dotB && line.endDot === dotA)
            )
                return line;
        }
    }
    // get distance from this line (midpoint) to specified point
    distanceTo(x, y) {
        const midX = (this.x1 + this.x2) / 2;
        const midY = (this.y1 + this.y2) / 2;
        return Math.sqrt(Math.pow(x - midX, 2) + Math.pow(y - midY, 2));
    }
    // calculate values
    step() {
        const dist = this.startDot.distanceTo(this.endDot.x, this.endDot.y);
        const angle = this.startDot.angleTo(this.endDot.x, this.endDot.y);
        this.x1 = this.startDot.x + Math.cos(angle) * radius;
        this.y1 = this.startDot.y + Math.sin(angle) * radius;
        this.x2 = this.endDot.x - Math.cos(angle) * radius;
        this.y2 = this.endDot.y - Math.sin(angle) * radius;

        if (this.targetAlpha !== maxAlpha) {
            this.targetAlpha =
                Math.min(
                    (-minDist + dist) * (2 / (midDist - minDist)),
                    (-maxDist + dist) * (2 / (midDist - maxDist))
                ) * minAlpha;
            this.targetAlpha = Math.max(Math.min(this.targetAlpha, 1), 0);
        }

        this.alpha += (this.targetAlpha - this.alpha) * alphaSpeed;
    }
    // draw instance
    draw() {
        // for performance, skip drawing if not/barely visible
        if (this.alpha < 0.01)
            return;

        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = greyColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }
}

// create dots
function generateDots() {
    // reset
    dots = [];

    // evenly space
    const offsetX = (width % spacing) / 2;
    const offsetY = (height % spacing) / 2;
    for (let x = offsetX; x < width; x += spacing) {
        for (let y = offsetY; y < height; y += spacing)
            dots.push(new Dot(x, y));
    }

    // hard limit dots for performance
    while (dots.length > limitNumber)
        dots.splice(Math.floor(dots.length * Math.random()), 1);
}

// create lines
function generateLines() {
    // reset
    lines = [];

    // connect each pair of dots
    for (let a = 0; a < dots.length; a++) {
        const dotA = dots[a];
        for (let b = 0; b < dots.length; b++) {
            const dotB = dots[b];
            // triangular matrix to avoid duplicates and lines to self
            if (a < b)
                lines.push(new Line(dotA, dotB));
        }
    }
}

// periodically glow
function glow() {
    if (Math.floor(Math.random() * rippleOdds) === 0)
        rippleGlow();
    else
        pathGlow();
}

// glow dots and lines in ripple outward from center
function rippleGlow() {
    // reset any currently glowing elements to rest
    dots.concat(lines).forEach((element) => {
        if (element.targetAlpha === maxAlpha)
            element.targetAlpha = minAlpha;
    });

    // combine dots and lines into list
    // only include lines that are currently visible above certain threshold
    const elements = dots.concat(
        lines.filter((line) => line.targetAlpha > minAlpha * 0.5)
    );

    for (const element of elements) {
        // calc distance to center
        const dist = element.distanceTo(width / 2, height / 2);
        // calc delay based on dist
        const delay = dist * (1000 / rippleGlowSpeed);
        // glow and unglow after delays
        window.setTimeout(() => {
            element.targetAlpha = maxAlpha;
            window.setTimeout(
                () => (element.targetAlpha = minAlpha),
                rippleGlowTime
            );
        }, delay);
    }
}

// glow a random path
function pathGlow() {
    const path = getGoodPath();
    function setGlow(value) {
        let delay = 0;
        for (const element of path) {
            window.setTimeout(() => (element.targetAlpha = value), delay);
            delay += pathGlowCascade;
        }
    }
    setGlow(maxAlpha);
    window.setTimeout(() => setGlow(minAlpha), pathGlowTime);
}

// get a good random path
function getGoodPath() {
    // get a few random paths and pick longest
    const paths = [];
    for (let count = 0; count < 10; count++)
        paths.push(getPath());
    paths.sort((a, b) => b.length - a.length);
    return paths[0];
}

// get a random path through dots
function getPath() {
    // start with randomly picked dot
    if (dots.length <= 0)
        return [];
    const randomDot = dots[Math.floor(dots.length * Math.random())];
    const path = [];
    path.push(randomDot);

    // run loop to get desired length of path
    for (let count = 0; count < pathMaxLength - 1; count++) {
        // get current and previous dots
        const thisDot = path[path.length - 1];
        let prevDot;
        if (count > 0)
            prevDot = path[count - 1];

        // get list of closest dots to current dot
        let list = thisDot.findClosest();

        // remove dots that are too close or too far
        list = list.filter(
            (entry) =>
                entry.dist > pathMinDistance && entry.dist < pathMaxDistance
        );

        // remove dots whose angles are too far away from previous angle
        if (prevDot) {
            list = list.filter((entry) => {
                const nextDot = entry.dot;
                // get angle between prev line and next line
                const crossProduct =
                    (thisDot.x - prevDot.x) * (nextDot.y - thisDot.y) -
                    (thisDot.y - prevDot.y) * (nextDot.x - thisDot.x);
                const dotProduct =
                    (thisDot.x - prevDot.x) * (nextDot.x - thisDot.x) +
                    (thisDot.y - prevDot.y) * (nextDot.y - thisDot.y);
                const angle = Math.abs(Math.atan2(crossProduct, dotProduct));
                return angle < pathMaxAngle * (Math.PI / 180);
            });
        }

        // if no viable dots, end path
        if (!list || list.length < 1)
            break;

        // add top dot candidate on list to path
        path.push(list[0].dot);
    }

    // insert connecting lines between each pair of dots
    for (let index = 1; index < path.length; index++) {
        path.splice(index, 0, Line.lookup(path[index - 1], path[index]));
        index++;
    }

    return path;
}

// blend two hex colors together by an amount
function blendColors(colorA, colorB, amount) {
    const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
    const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
    const r = Math.round(rA + (rB - rA) * amount)
        .toString(16)
        .padStart(2, '0');
    const g = Math.round(gA + (gB - gA) * amount)
        .toString(16)
        .padStart(2, '0');
    const b = Math.round(bA + (bB - bA) * amount)
        .toString(16)
        .padStart(2, '0');
    return '#' + r + g + b;
}

// wipe canvas to start fresh for next frame
function clearCanvas() {
    ctx.clearRect(0, 0, width, height);
}

// update canvas DOM width/height to match CSS width/height
function resizeCanvas() {
    const scaleFactor = dpi / 96;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;
    ctx.scale(scaleFactor, scaleFactor);
}

// run one frame of simulation
function frame() {
    clearCanvas();
    dots.forEach((dot) => dot.step());
    lines.forEach((line) => line.step());
    dots.forEach((dot) => dot.draw());
    lines.forEach((line) => line.draw());
}

// start/restart simulation
function start() {
    resizeCanvas();
    generateDots();
    generateLines();
    window.clearInterval(frameTimer);
    frameTimer = window.setInterval(frame, 1000 / fps);
    window.clearInterval(glowTimer);
    glowTimer = window.setInterval(glow, glowInterval);
    window.removeEventListener('resize', start);
    window.addEventListener('resize', start);
}
window.setTimeout(start, 1000);
