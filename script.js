
let currentScale = 60; 
let offsetX = 0;       
let offsetY = 0;       
let functions = [];
let colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffff00'];

let dragging = false;
let lastClientX = 0;
let lastClientY = 0;

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const theoryDiv = document.getElementById('theory');
const inputTextarea = document.getElementById('input');
const calculateButton = document.getElementById('calculate');
const outputDiv = document.querySelector('.output');
const modeToggle = document.getElementById('modeToggle');
const body = document.body;

function fitCanvasAndGetSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || canvas.clientWidth || 600;
    const cssH = rect.height || canvas.clientHeight || 600;
    
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    return { w: cssW, h: cssH, dpr };
}

function scrollToOutput() {
    outputDiv.scrollIntoView({ behavior: 'smooth' });
}

function calculate() {
    const input = inputTextarea.value.trim();
    theoryDiv.innerHTML = '';
    functions = [];

    if (input === '') {
        theoryDiv.innerHTML = '<p>Please enter math expressions. Try simple terms like x^2, sin(x), e^(2*x).</p>';
        drawAll();
        scrollToOutput();
        return;
    }

    const lines = input.split('\n').map(l => l.trim()).filter(l => l !== '');
    let hasSomething = false;

    lines.forEach((rawExpr, index) => {
        let expr = rawExpr.replace(/y\s*=/i, '').trim();
        
        expr = expr.replace(/\be\b/g, 'e');           
        expr = expr.replace(/\bpi\b/gi, 'pi');        

        const isFunc = /\bx\b/i.test(expr);

        try {
            if (!isFunc) {
                
                const constVal = math.evaluate(expr);
                const fobj = { evaluate: () => constVal };
                functions.push({ f: fobj, color: colors[index % colors.length] });
                theoryDiv.innerHTML += `<p>The expression "${rawExpr}" is a constant: ${constVal} (horizontal line).</p>`;
           
                let table = '<table><tr><th>x</th><th>f(x)</th></tr>';
                for (let xVal = -2; xVal <= 2; xVal++) {
                    table += `<tr><td>${xVal}</td><td>${constVal.toFixed(4)}</td></tr>`;
                }
                table += '</table>';
                theoryDiv.innerHTML += table;
                hasSomething = true;
            } else {
                
                const compiled = math.compile(expr);
                functions.push({ f: compiled, color: colors[index % colors.length] });
                theoryDiv.innerHTML += `<p style="color:${colors[index % colors.length]}">f(x) = ${rawExpr}</p>`;
   
                let table = '<table><tr><th>x</th><th>f(x)</th></tr>';
                for (let xVal = -2; xVal <= 2; xVal++) {
                    let fx;
                    try {
                        fx = compiled.evaluate({ x: xVal });
                        if (!isFinite(fx)) table += `<tr><td>${xVal}</td><td>NaN</td></tr>`;
                        else table += `<tr><td>${xVal}</td><td>${Number(fx).toFixed(4)}</td></tr>`;
                    } catch {
                        table += `<tr><td>${xVal}</td><td>NaN</td></tr>`;
                    }
                }
                table += '</table>';
                theoryDiv.innerHTML += table;
                hasSomething = true;
            }
        } catch (err) {
            theoryDiv.innerHTML += `<p>Error with "${rawExpr}": ${err.message}</p>`;
        }
    });

    if (!hasSomething) {
        theoryDiv.innerHTML += '<p>No valid functions found.</p>';
    }

    drawAll();
    scrollToOutput();
}

calculateButton.addEventListener('click', calculate);

inputTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        calculate();
    }
});

modeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
    drawAll();
});

canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    canvas.style.cursor = 'grabbing';
    
    if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch {}
});

canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastClientX;
    const dy = e.clientY - lastClientY;
   
    offsetX += dx / currentScale;
    offsetY += dy / currentScale;

    lastClientX = e.clientX;
    lastClientY = e.clientY;
    drawAll();
});

canvas.addEventListener('mouseup', (e) => {
    dragging = false;
    canvas.style.cursor = 'default';
    if (canvas.releasePointerCapture) try { canvas.releasePointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('mouseleave', () => {
    dragging = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const { w, h } = fitCanvasAndGetSize();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = currentScale;
    
    const zoomFactor = Math.exp(-e.deltaY * 0.0012); 
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(20, Math.min(200, newScale)); 
  
    const centerX = w / 2;
    const centerY = h / 2;

    offsetX = offsetX + (mouseX - centerX) * (1 / newScale - 1 / oldScale);
    offsetY = offsetY + (centerY - mouseY) * (1 / newScale - 1 / oldScale);

    currentScale = newScale;
    drawAll();
}, { passive: false });


window.addEventListener('resize', () => {
    drawAll();
});

function drawGrid(w, h) {    
    ctx.fillStyle = body.classList.contains('dark-mode') ? '#252a41' : '#f0f0f0';
    ctx.fillRect(0, 0, w, h);

    const step = currentScale; 
    const originX = w / 2 + offsetX * currentScale;
    const originY = h / 2 + offsetY * currentScale;
    
    ctx.strokeStyle = body.classList.contains('dark-mode') ? '#3b3f57' : '#e0e0e0';
    ctx.lineWidth = 1;
    
    const startV = Math.floor(( -originX ) / step) - 1;
    const endV = Math.ceil((w - originX) / step) + 1;
    for (let i = startV; i <= endV; i++) {
        const x = originX + i * step;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    
    const startH = Math.floor(( -originY ) / step) - 1;
    const endH = Math.ceil((h - originY) / step) + 1;
    for (let j = startH; j <= endH; j++) {
        const y = originY + j * step;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    ctx.strokeStyle = body.classList.contains('dark-mode') ? '#e6e6e6' : '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    ctx.stroke();

    
    ctx.font = '14px Arial';
    ctx.fillStyle = body.classList.contains('dark-mode') ? '#e6e6e6' : '#000';

    
    const xStart = Math.floor(-offsetX - w / (2 * currentScale));
    const xEnd = Math.ceil(-offsetX + w / (2 * currentScale));
    for (let xi = xStart; xi <= xEnd; xi++) {
        if (xi === 0) continue;
        const px = originX + xi * currentScale;
        ctx.fillText(xi.toString(), px - 8, originY + 18);
    }

    const yStart = Math.floor(-offsetY - h / (2 * currentScale));
    const yEnd = Math.ceil(-offsetY + h / (2 * currentScale));
    for (let yi = yStart; yi <= yEnd; yi++) {
        if (yi === 0) continue;
        const py = originY - yi * currentScale;
        ctx.fillText(yi.toString(), originX + 8, py + 6);
    }
}

function plotFunction(f, color, w, h) {
    const originX = w / 2 + offsetX * currentScale;
    const originY = h / 2 + offsetY * currentScale;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    let first = true;
    let lastPy = null;

    for (let px = 0; px < Math.ceil(w); px++) {
        
        const mathX = (px - originX) / currentScale;

        let yVal;
        try {
            
            if (typeof f.evaluate === 'function') yVal = f.evaluate({ x: mathX });
            else yVal = f(mathX);
        } catch {
            yVal = NaN;
        }

        if (!isFinite(yVal)) {
            
            first = true;
            lastPy = null;
            continue;
        }

        const py = originY - yVal * currentScale;
        
        if (py < -10000 || py > 10000) {
            first = true;
            lastPy = null;
            continue;
        }
        if (first) {
            ctx.moveTo(px + 0.5, py + 0.5); 
            first = false;
        } else {
            
            if (lastPy !== null && Math.abs(py - lastPy) > 200) {
                ctx.moveTo(px + 0.5, py + 0.5);
            } else {
                ctx.lineTo(px + 0.5, py + 0.5);
            }
        }
        lastPy = py;
    }

    ctx.stroke();
}

function drawAll() {
    const { w, h } = fitCanvasAndGetSize();
    
    drawGrid(w, h);
  
    for (const fo of functions) {
        plotFunction(fo.f, fo.color, w, h);
    }
}
drawAll();
