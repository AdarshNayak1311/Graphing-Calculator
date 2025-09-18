let currentScale = 60;
let offsetX = 0;
let offsetY = 0;
let functions = [];
let colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffff00'];
let dragging = false;
let startDragX = 0;
let startDragY = 0;

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const theoryDiv = document.getElementById('theory');
const inputTextarea = document.getElementById('input');
const calculateButton = document.getElementById('calculate');
const outputDiv = document.querySelector('.output');
const modeToggle = document.getElementById('modeToggle');
const body = document.body;

// Zooming
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1 - e.deltaY * 0.001;
    currentScale *= zoomFactor;
    currentScale = Math.min(Math.max(currentScale, 20), 200); // limits
    drawAll();
});

// Dragging
canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    startDragX = e.clientX;
    startDragY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (dragging) {
        offsetX += (e.clientX - startDragX) / currentScale;
        offsetY += (startDragY - e.clientY) / currentScale;
        startDragX = e.clientX;
        startDragY = e.clientY;
        drawAll();
    }
});

canvas.addEventListener('mouseup', () => { dragging = false; });
canvas.addEventListener('mouseleave', () => { dragging = false; });

// Enter key triggers calculation
inputTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        calculateButton.click();
    }
});

// Toggle dark/light mode
modeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
    drawAll();
});

// Scroll to output
function scrollToOutput() {
    outputDiv.scrollIntoView({ behavior: 'smooth' });
}

// Calculate & parse expressions
const calculate = function() {
    const input = inputTextarea.value.trim();
    theoryDiv.innerHTML = '';
    functions = [];

    if (input === '') {
        theoryDiv.innerHTML = '<p>Please enter math expressions. Try simple terms like x^2 for x squared, sin(x) for sine, or e^(2*x) for an exponential.</p>';
        drawAll();
        scrollToOutput();
        return;
    }

    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    let hasFunction = false;

    lines.forEach((rawExpr, index) => {
        let expr = rawExpr.replace(/y\s*=/, '').trim();

        // Replace constants
        expr = expr.replace(/\be\b/g, 'E');       // math.js constant e
        expr = expr.replace(/\bpi\b/gi, 'pi');    // math.js constant pi

        let isFunc = expr.toLowerCase().includes('x');

        try {
            let f;

            if (!isFunc) {
                // Constant: create a function that returns this value
                const constantValue = math.evaluate(expr);
                f = function(x) { return constantValue; };

                theoryDiv.innerHTML += `<p>The expression "${rawExpr}" is a constant: ${constantValue}. It will be plotted as a horizontal line.</p>`;
                hasFunction = true;
            } else {
                // Normal function: compile with math.js
                f = math.compile(expr);
                theoryDiv.innerHTML += `<p style="color: ${colors[index % colors.length]};">The function f(x) = ${rawExpr} describes a relationship where x determines y:</p>`;
                hasFunction = true;
            }

            // Add to functions array for plotting
            functions.push({ f, color: colors[index % colors.length] });

            // Create table for x = -2 to 2
            let table = '<table><tr><th>x</th><th>f(x)</th></tr>';
            for (let xVal = -2; xVal <= 2; xVal++) {
                let fx;
                try {
                    fx = isFunc ? f.evaluate({ x: xVal }) : f(xVal);
                    table += `<tr><td>${xVal}</td><td>${fx.toFixed(4)}</td></tr>`;
                } catch {
                    table += `<tr><td>${xVal}</td><td>NaN</td></tr>`;
                }
            }
            table += '</table>';
            theoryDiv.innerHTML += table;
        } catch (e) {
            theoryDiv.innerHTML += `<p>Error with "${rawExpr}": ${e.message}. Check your syntax.</p>`;
        }
    });

    if (!hasFunction) {
        ctx.font = '20px Arial';
        ctx.fillText('No graph to display.', 20, 300);
    }

    drawAll();
    scrollToOutput();
};

calculateButton.addEventListener('click', calculate);

// Draw grid and axes
function drawGrid() {
    const w = canvas.width;
    const h = canvas.height;
    const step = currentScale;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = body.classList.contains('dark-mode') ? '#252a41' : '#f0f0f0';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    const originX = w/2 + offsetX*currentScale;
    const originY = h/2 + offsetY*currentScale;

    // Vertical grid
    for (let x = originX % step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let x = originX % step; x > 0; x -= step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // Horizontal grid
    for (let y = originY % step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    for (let y = originY % step; y > 0; y -= step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    ctx.stroke();

    // Axis numbers
    ctx.font = '16px Arial';
    ctx.fillStyle = body.classList.contains('dark-mode') ? '#e6e6e6' : '#000';
    const xStart = Math.floor(-offsetX - w/(2*currentScale));
    const xEnd = Math.ceil(-offsetX + w/(2*currentScale));
    const yStart = Math.floor(-offsetY - h/(2*currentScale));
    const yEnd = Math.ceil(-offsetY + h/(2*currentScale));

    for (let i = xStart; i <= xEnd; i++) {
        if (i === 0) continue;
        const px = originX + i*currentScale;
        ctx.fillText(i, px - 8, originY + 20);
    }
    for (let i = yStart; i <= yEnd; i++) {
        if (i === 0) continue;
        const py = originY - i*currentScale;
        ctx.fillText(i, originX + 10, py + 5);
    }
}

// Plot functions
function plotFunction(f, color) {
    const w = canvas.width;
    const h = canvas.height;
    const xMin = -w / (2 * currentScale) - offsetX;
    const xMax = w / (2 * currentScale) - offsetX;
    const step = (xMax - xMin) / w;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    let first = true;
    for (let px = 0; px < w; px++) {
        const x = xMin + px * step;
        let y;
        try {
            // Use evaluate() if it exists (math.js), otherwise call function
            y = typeof f.evaluate === 'function' ? f.evaluate({ x }) : f(x);

            if (isNaN(y) || y === Infinity || y === -Infinity) continue;
        } catch {
            continue;
        }

        const py = h / 2 - (y + offsetY) * currentScale;
        if (py < -1000 || py > h + 1000) continue;

        if (first) {
            ctx.moveTo(px, py);
            first = false;
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
}

// Draw everything
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    functions.forEach(funcObj => plotFunction(funcObj.f, funcObj.color));
}
