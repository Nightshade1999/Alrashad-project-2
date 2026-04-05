"use client"

/**
 * Biostatistics Utility Library (Alrashad StatSphere)
 * Implements core medical statistics: Chi-Square, T-Test, Pearson Correlation.
 */

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * Calculate basic descriptive statistics for a numeric array.
 */
export function getDescriptiveStats(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) return { count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];

  const sqDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1]
  };
}

/**
 * Pearson Correlation Coefficient (r)
 * Measures linear correlation between two numeric variables.
 */
export function calculatePearson(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return { r: 0, p: 1 };

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const r = num / Math.sqrt(denX * denY || 1);
  
  // Estimate p-value (Simplified calculation for r)
  const df = n - 2;
  const t = Math.abs(r) * Math.sqrt(df / (1 - r * r || 0.0001));
  const p = tToP(t, df); 

  return { r, p };
}

/**
 * Independent Samples T-Test
 * Compares means between two groups.
 */
export function calculateTTest(groupA: number[], groupB: number[]) {
  const n1 = groupA.length;
  const n2 = groupB.length;
  if (n1 < 2 || n2 < 2) return { t: 0, p: 1, meanA: 0, meanB: 0 };

  const statsA = getDescriptiveStats(groupA);
  const statsB = getDescriptiveStats(groupB);

  const v1 = Math.pow(statsA.stdDev, 2);
  const v2 = Math.pow(statsB.stdDev, 2);

  const t = (statsA.mean - statsB.mean) / Math.sqrt((v1 / n1) + (v2 / n2) || 0.0001);
  const df = n1 + n2 - 2;
  const p = tToP(Math.abs(t), df);

  return { t, p, meanA: statsA.mean, meanB: statsB.mean };
}

/**
 * Chi-Square Test of Independence
 * Tests association between two categorical variables.
 */
export function calculateChiSquare(data: {x: string, y: string}[]) {
  const xValues = Array.from(new Set(data.map(d => d.x)));
  const yValues = Array.from(new Set(data.map(d => d.y)));
  
  if (xValues.length < 2 || yValues.length < 2) return { chi2: 0, p: 1, df: 0 };

  // 1. Observed Frequencies
  const observed: Record<string, Record<string, number>> = {};
  xValues.forEach(xv => {
    observed[xv] = {};
    yValues.forEach(yv => observed[xv][yv] = 0);
  });

  data.forEach(d => {
    if (observed[d.x] && observed[d.x][d.y] !== undefined) {
      observed[d.x][d.y]++;
    }
  });

  // 2. Row/Col Totals
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  xValues.forEach(xv => {
    rowTotals[xv] = Object.values(observed[xv]).reduce((a, b) => a + b, 0);
    grandTotal += rowTotals[xv];
  });

  yValues.forEach(yv => {
    colTotals[yv] = xValues.reduce((a, xv) => a + observed[xv][yv], 0);
  });

  // 3. Expected Frequencies & Chi2 Statistic
  let chi2 = 0;
  xValues.forEach(xv => {
    yValues.forEach(yv => {
      const expected = (rowTotals[xv] * colTotals[yv]) / (grandTotal || 1);
      if (expected > 0) {
        chi2 += Math.pow(observed[xv][yv] - expected, 2) / expected;
      }
    });
  });

  const df = (xValues.length - 1) * (yValues.length - 1);
  const p = chi2ToP(chi2, df);

  return { chi2, p, df, observed, rowTotals, colTotals, grandTotal, xValues, yValues };
}

/**
 * Probability Approximation Functions (Internal Math)
 */

// Simple Approximation of Student's T distribution p-value
function tToP(t: number, df: number): number {
  const x = df / (df + t * t);
  // Using an approximation of the incomplete beta function for symmetry
  // This is a simplified version suitable for UI display
  if (t > 10) return 0.0001;
  const p = Math.pow(x, df / 2) / (1 + x); 
  return Math.min(Math.max(p, 0.0001), 1);
}

// Simple Approximation of Chi-Square distribution p-value
function chi2ToP(chi2: number, df: number): number {
  if (chi2 === 0) return 1;
  if (df <= 0) return 1;
  
  // Wilson-Hilferty transformation for Chi-Square to Normal
  const z = Math.pow(chi2 / df, 1/3) - (1 - 2/(9*df));
  const den = Math.sqrt(2/(9*df));
  const normZ = z / den;
  
  // Standard Normal CDF approximation
  const p = 0.5 * (1 - erf(Math.abs(normZ) / Math.sqrt(2)));
  return normZ > 0 ? p * 2 : 1 - p * 2; // Two-tailed approx
}

// Error function approximation
function erf(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}
