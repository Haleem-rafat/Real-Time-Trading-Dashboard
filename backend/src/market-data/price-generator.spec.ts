import { boxMuller, nextPrice } from './price-generator';

/**
 * Deterministic Linear Congruential Generator (LCG) — used to make
 * tests reproducible without coupling to Math.random.
 */
function makeLcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('price-generator', () => {
  describe('boxMuller', () => {
    it('produces samples with mean ≈ 0 and std ≈ 1', () => {
      const rng = makeLcg(42);
      const samples = Array.from({ length: 5000 }, () => boxMuller(rng));
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance =
        samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
      const std = Math.sqrt(variance);
      expect(Math.abs(mean)).toBeLessThan(0.1);
      expect(std).toBeGreaterThan(0.9);
      expect(std).toBeLessThan(1.1);
    });
  });

  describe('nextPrice', () => {
    it('always returns a positive price even with extreme volatility', () => {
      let p = 100;
      for (let i = 0; i < 1000; i++) {
        p = nextPrice(p, 0.5);
        expect(p).toBeGreaterThan(0);
      }
    });

    it('produces a deterministic sequence with a deterministic RNG', () => {
      const seq1: number[] = [];
      const rng1 = makeLcg(7);
      let p1 = 100;
      for (let i = 0; i < 5; i++) {
        p1 = nextPrice(p1, 0.02, 0, rng1);
        seq1.push(p1);
      }

      const seq2: number[] = [];
      const rng2 = makeLcg(7);
      let p2 = 100;
      for (let i = 0; i < 5; i++) {
        p2 = nextPrice(p2, 0.02, 0, rng2);
        seq2.push(p2);
      }

      expect(seq1).toEqual(seq2);
    });

    it('respects volatility (low vol = small drift)', () => {
      const rng = makeLcg(123);
      let p = 100;
      const start = p;
      for (let i = 0; i < 100; i++) {
        p = nextPrice(p, 0.001, 0, rng);
      }
      // With volatility 0.1% over 100 steps, drift should be modest
      expect(Math.abs(p - start)).toBeLessThan(20);
    });

    it('drift parameter pulls price in the expected direction', () => {
      // Strong positive drift should reliably push price up over many ticks
      let p = 100;
      for (let i = 0; i < 200; i++) {
        p = nextPrice(p, 0.001, 0.01); // 1% drift per tick
      }
      expect(p).toBeGreaterThan(100);
    });
  });
});
