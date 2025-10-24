document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const calculateBtn = document.getElementById('calculateBtn');
    const equationInput = document.getElementById('equationInput');
    const solutionDiv = document.getElementById('solution');
    const graphCanvas = document.getElementById('graphCanvas');
    let chart = null;
    const isDarkMode = () => document.body.classList.contains('dark');

    // Quadratic formula fallback
    function solveQuadratic(a, b, c) {
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return [];
        const sqrtD = Math.sqrt(discriminant);
        const root1 = (-b + sqrtD) / (2 * a);
        const root2 = (-b - sqrtD) / (2 * a);
        return discriminant === 0 ? [root1] : [root1, root2].sort((x, y) => x - y);
    }

    // Bisection method for root finding
    function bisection(func, a, b, tol = 1e-6, maxIter = 100) {
        let fa = func(a);
        let fb = func(b);
        if (fa * fb > 0 || isNaN(fa) || isNaN(fb)) return null;
        let iter = 0;
        while (Math.abs(b - a) > tol && iter < maxIter) {
            let c = (a + b) / 2;
            let fc = func(c);
            if (isNaN(fc)) return null;
            if (fa * fc < 0) {
                b = c;
                fb = fc;
            } else {
                a = c;
                fa = fc;
            }
            iter++;
        }
        return (a + b) / 2;
    }

    function findRootsNumerically(expr, xMin, xMax, steps = 1000) {
        const roots = [];
        let prevX = null;
        let prevY = null;
        const step = (xMax - xMin) / steps;
        for (let i = 0; i <= steps; i++) {
            const x = xMin + i * step;
            let y;
            try {
                y = math.evaluate(expr, { x: x });
            } catch (e) {
                y = NaN;
            }
            if (prevX !== null && prevY !== null && !isNaN(prevY) && !isNaN(y) && prevY * y < 0) {
                const root = bisection((xx) => {
                    try {
                        return math.evaluate(expr, { x: xx });
                    } catch (e) {
                        return NaN;
                    }
                }, prevX, x);
                if (root !== null && !isNaN(root)) {
                    roots.push(root);
                }
            }
            prevX = x;
            prevY = y;
        }
        // Remove duplicates and sort
        return roots.filter((root, index, self) => 
            index === self.findIndex(r => Math.abs(r - root) < 1e-4)
        ).sort((a, b) => a - b);
    }

    // Check if quadratic
    function isQuadratic(expr) {
        const poly = math.simplify(expr);
        const terms = poly.toString().split('+').map(t => t.trim());
        const x2Terms = terms.filter(t => t.includes('x^2'));
        const xTerms = terms.filter(t => t.includes('x') && !t.includes('x^2'));
        const constTerms = terms.filter(t => !t.includes('x'));
        return x2Terms.length === 1 && (xTerms.length <= 1 || xTerms.length === 0) && constTerms.length <= 1;
    }

    // Extract coefficients for quadratic
    function getQuadraticCoeffs(expr) {
        try {
            const parsed = math.parse(expr);
            const coeffs = math.polyCoeffs(parsed.compile().evaluate({x: 'x'})); // Wait, better way
            // Simple regex or use mathjs derivative
            const deriv2 = math.derivative(expr, 'x', 2).evaluate({x: 1}); // a = coeff of x^2
            const deriv1 = math.derivative(expr, 'x').evaluate({x: 0}); // b approx, but better
            // Actually, evaluate at points
            const a = math.derivative(expr, 'x', 2).evaluate({x: 0}) / 2;
            const b = math.derivative(expr, 'x').evaluate({x: 0});
            const c = math.evaluate(expr, {x: 0});
            return {a, b, c};
        } catch (e) {
            return null;
        }
    }

    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark');
        if (chart) {
            chart.destroy();
            chart = null;
        }
    });

    calculateBtn.addEventListener('click', function() {
        const equation = equationInput.value.trim();
        if (!equation) {
            solutionDiv.innerHTML = '<strong style="color: #dc3545;">Please enter an equation or function.</strong>';
            return;
        }

        try {
            let eqForSolve = equation.replace(/\s/g, '');
            let expr = eqForSolve;
            let isEquation = eqForSolve.includes('=');
            let solutions = [];
            if (isEquation) {
                const parts = eqForSolve.split('=');
                if (parts.length === 2) {
                    expr = `${parts[0]} - ${parts[1]}`;
                } else if (parts.length > 2) {
                    throw new Error('Invalid equation format. Use one "=" sign.');
                } else {
                    eqForSolve += ' = 0';
                }

                // Attempt to solve symbolically first
                try {
                    solutions = math.solve(eqForSolve, 'x');
                    if (!Array.isArray(solutions)) {
                        solutions = [solutions];
                    }
                    solutions = solutions.filter(s => !isNaN(s) && isFinite(s));
                } catch (solveError) {
                    console.warn('Symbolic solving failed:', solveError.message);
                    // Check if quadratic and use formula
                    if (isQuadratic(expr)) {
                        const coeffs = getQuadraticCoeffs(expr);
                        if (coeffs) {
                            solutions = solveQuadratic(coeffs.a, coeffs.b, coeffs.c);
                        }
                    }
                    // Fallback to numerical if still no
                    if (solutions.length === 0) {
                        let xMinNum = -10, xMaxNum = 10;
                        if (expr.includes('sin') || expr.includes('cos') || expr.includes('tan') || expr.includes('csc') || expr.includes('sec') || expr.includes('cot')) {
                            xMinNum = -4 * Math.PI;
                            xMaxNum = 4 * Math.PI;
                        } else if (expr.includes('log')) {
                            xMinNum = 0.1;
                            xMaxNum = 10;
                        }
                        solutions = findRootsNumerically(expr, xMinNum, xMaxNum);
                    }
                }
            }

            // Replace common aliases for mathjs
            expr = expr.replace(/cosec\(/g, 'csc(').replace(/sec\(/g, 'sec(').replace(/cot\(/g, 'cot(');

            // Display solutions first for equations
            if (isEquation) {
                if (solutions.length > 0) {
                    const formattedSolutions = solutions.map(s => Math.round(s * 1000)/1000).join(', ');
                    solutionDiv.innerHTML = `<strong>Roots of the equation:</strong> x = ${formattedSolutions}`;
                } else {
                    solutionDiv.innerHTML = `<strong>No real solutions found.</strong><p>Graph plotted above. Check for roots visually.</p>`;
                }
            } else {
                solutionDiv.innerHTML = `<strong>Function: y = ${expr}</strong><p>Graph plotted above.</p>`;
            }

            // Set range based on function
            let xMin = -10, xMax = 10;
            let steps = 1000;
            let yClip = null;
            const isTrig = expr.includes('sin') || expr.includes('cos') || expr.includes('tan') || expr.includes('csc') || expr.includes('sec') || expr.includes('cot');
            if (isTrig) {
                xMin = -4 * Math.PI;
                xMax = 4 * Math.PI;
                steps = 4000;
                if (expr.includes('tan') || expr.includes('cot') || expr.includes('csc') || expr.includes('sec')) {
                    yClip = 10;
                } else {
                    yClip = 2;
                }
            } else if (expr.includes('log')) {
                xMin = 0.01;
                xMax = 10;
            } else if (expr.includes('exp') || expr.includes('e^')) {
                xMin = -5;
                xMax = 5;
                steps = 1000;
            }
            const xValues = [];
            const yValues = [];
            let validY = [];
            for (let i = 0; i <= steps; i++) {
                const x = xMin + (xMax - xMin) * i / steps;
                xValues.push(x);
                try {
                    let y = math.evaluate(expr, { x: x });
                    if (!isNaN(y) && isFinite(y)) {
                        if (yClip && Math.abs(y) > yClip) {
                            yValues.push(null);
                        } else {
                            yValues.push(y);
                            validY.push(y);
                        }
                    } else {
                        yValues.push(null);
                    }
                } catch (e) {
                    yValues.push(null);
                }
            }

            if (validY.length === 0) {
                throw new Error('No valid points could be calculated for the function.');
            }

            let minY = Math.min(...validY);
            let maxY = Math.max(...validY);
            let yMin, yMax;
            if (minY === maxY) {
                // Constant function
                yMin = minY - 1;
                yMax = maxY + 1;
            } else {
                yMin = minY * 1.1;
                yMax = maxY * 1.1;
            }
            if (yClip !== null) {
                yMin = Math.min(yMin, -yClip * 1.2);
                yMax = Math.max(yMax, yClip * 1.2);
            }

            // Destroy previous chart
            if (chart) {
                chart.destroy();
            }

            // Chart configuration
            const gridColor = isDarkMode() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)';
            const axisColor = isDarkMode() ? '#ffffff' : '#000000';
            const lineColor = isDarkMode() ? '#0dcaf0' : '#007bff';
            const fillColor = isDarkMode() ? 'rgba(13, 202, 240, 0.1)' : 'rgba(0, 123, 255, 0.1)';
            const textColor = isDarkMode() ? '#e9ecef' : '#333333';
            const tickColor = isDarkMode() ? '#adb5bd' : '#6c757d';
            const rootColor = isDarkMode() ? '#ff6b6b' : '#dc3545';

            let datasets = [
                // X-axis (vertical line at x=0)
                {
                    type: 'line',
                    label: '',
                    data: [
                        { x: 0, y: yMin },
                        { x: 0, y: yMax }
                    ],
                    borderColor: axisColor,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                    order: 0,
                    spanGaps: false
                },
                // Y-axis (horizontal line at y=0)
                {
                    type: 'line',
                    label: '',
                    data: xValues.map(x => ({ x, y: 0 })),
                    borderColor: axisColor,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                    order: 0,
                    spanGaps: true
                },
                // Main function
                {
                    type: 'line',
                    label: isEquation ? `f(x) = 0 where roots are solutions `:` y = ${expr}`,
                    data: xValues.map((x, i) => ({ x, y: yValues[i] })),
                    borderColor: lineColor,
                    backgroundColor: fillColor,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    order: 1,
                    spanGaps: false  // Do not span gaps for discontinuities
                }
            ];

            // Add roots as points if equation
            if (isEquation && solutions.length > 0) {
                const rootData = solutions.map(root => ({x: root, y: 0}));
                datasets.push({
                    type: 'scatter',
                    label: 'Roots',
                    data: rootData,
                    backgroundColor: rootColor,
                    borderColor: rootColor,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false,
                    order: 2
                });
            }

            chart = new Chart(graphCanvas, {
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            min: xMin,
                            max: xMax,
                            title: {
                                display: true,
                                text: 'X',
                                color: textColor,
                                font: { size: 18, weight: 'bold' }
                            },
                            ticks: {
                                color: tickColor,
                                stepSize: Math.ceil((xMax - xMin) / 12),
                                font: { size: 16, weight: 'normal' },
                                maxTicksLimit: 15
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: false,
                                lineWidth: 1,
                                drawOnChartArea: true,
                                zeroLineColor: axisColor,
                                zeroLineWidth: 2
                            }
                        },
                        y: {
                            min: yMin,
                            max: yMax,
                            title: {
                                display: true,
                                text: 'Y',
                                color: textColor,
                                font: { size: 18, weight: 'bold' }
                            },
                            ticks: {
                                color: tickColor,
                                font: { size: 16, weight: 'normal' },
                                maxTicksLimit: 15
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: false,
                                lineWidth: 1,
                                drawOnChartArea: true,
                                zeroLineColor: axisColor,
                                zeroLineWidth: 2
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: textColor,
                                font: { size: 14 }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDarkMode() ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                            titleColor: textColor,
                            bodyColor: textColor,
                            cornerRadius: 6,
                            font: { size: 13 },
                            callbacks: {
                                title: function(context) {
                                    return `x: ${context[0].parsed.x.toFixed(3)}`;
                                },
                                label: function(context) {
                                    if (context.datasetIndex === datasets.length - 1 && isEquation) {
                                        return 'Root';
                                    }
                                    return `y: ${context.parsed.y ? context.parsed.y.toFixed(3) : 'N/A'}`;
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });

            // Scroll to results
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            solutionDiv.innerHTML = `<strong style="color: #dc3545;">Error:</strong> ${error.message}`;
        }
    });

    // Allow Enter key to calculate
    equationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculateBtn.click();
        }
    });
});
