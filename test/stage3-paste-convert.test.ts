import { describe, it, expect } from 'vitest';
import {
  isLikelyRomanPunjabi,
  convertRomanPunjabiToGurmukhi,
} from '../src/core/transliteration/textConverter';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';

describe('Stage 3: Roman Punjabi to Gurmukhi Conversion Engine', () => {
  describe('Detection: isLikelyRomanPunjabi', () => {
    it('detects common Roman Punjabi sentences as Roman Punjabi', () => {
      expect(isLikelyRomanPunjabi('tusi kiddan ho?')).toBe(true);
      expect(isLikelyRomanPunjabi('main theek haan, tusi sunao')).toBe(true);
      expect(isLikelyRomanPunjabi('mera naam jeet hai')).toBe(true);
      expect(isLikelyRomanPunjabi('oh pind gaya si')).toBe(true);
      expect(isLikelyRomanPunjabi('vadiya kam kita')).toBe(true);
      expect(isLikelyRomanPunjabi('reha')).toBe(true);
    });

    it('returns false for pure English sentences without Punjabi markers', () => {
      expect(isLikelyRomanPunjabi('The quick brown fox jumps over the lazy dog.')).toBe(false);
      expect(isLikelyRomanPunjabi('Screenplay scene heading inside the conference room.')).toBe(false);
      expect(isLikelyRomanPunjabi('Hello world from the application.')).toBe(false);
    });

    it('returns false for already Gurmukhi text', () => {
      expect(isLikelyRomanPunjabi('ਤੁਸੀਂ ਕਿੱਦਾਂ ਹੋ?')).toBe(false);
      expect(isLikelyRomanPunjabi('ਮੇਰਾ ਨਾਮ ਜੀਤ ਹੈ।')).toBe(false);
    });

    it('returns false for empty or whitespace text', () => {
      expect(isLikelyRomanPunjabi('')).toBe(false);
      expect(isLikelyRomanPunjabi('   \n  \t ')).toBe(false);
    });
  });

  describe('Full Passage & Paragraph Conversion Quality', () => {
    it('preserves line breaks and paragraph spacing exactly', () => {
      const input = `tusi kiddan ho?\n\nmain theek haan.\nassi kal milange.`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator);

      expect(result.convertedText).toContain('\n\n');
      const lines = result.convertedText.split('\n');
      expect(lines.length).toBe(4);
      expect(lines[0]).toContain('ਕਿੱਦਾਂ');
      expect(lines[1]).toBe('');
      expect(lines[2]).toContain('ਠੀਕ');
    });

    it('preserves punctuation and special characters exactly', () => {
      const input = `kiddan? vadiya! "haanji", (zarur)... te [hor dasso] - 100% ok.`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator);

      expect(result.convertedText).toContain('?');
      expect(result.convertedText).toContain('!');
      expect(result.convertedText).toContain('"');
      expect(result.convertedText).toContain('(');
      expect(result.convertedText).toContain(')');
      expect(result.convertedText).toContain('[');
      expect(result.convertedText).toContain(']');
      expect(result.convertedText).toContain('-');
      expect(result.convertedText).toContain('%');
    });

    it('preserves numbers (Western and Gurmukhi digits)', () => {
      const input = `kamra number 402 vich 5 bande san.`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator);

      expect(result.convertedText).toContain('402');
      expect(result.convertedText).toContain('5');
    });

    it('preserves recognized English words when mixed with Roman Punjabi', () => {
      const input = `oh hospital gaya car vich phone karan layi.`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator, { preserveEnglish: true });

      expect(result.convertedText).toContain('hospital');
      expect(result.convertedText).toContain('car');
      expect(result.convertedText).toContain('phone');
    });

    it('correctly handles the corrected "reha" and "vadiya" in full paragraphs', () => {
      const input = `oh kam kar reha si te sab kuch vadiya chal reha hai.`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator);

      expect(result.convertedText).toContain('ਰਿਹਾ');
      expect(result.convertedText).not.toContain('ਹਿਾ');
    });

    it('provides alternative suggestions for uncertain words', () => {
      const input = `koi anjaan shabad xyzabc jo dictionary ch nahi hai`;
      const result = convertRomanPunjabiToGurmukhi(input, defaultTransliterator);

      const uncertainToken = result.tokens.find((t) => t.original === 'xyzabc');
      expect(uncertainToken).toBeDefined();
      expect(uncertainToken?.isUncertain).toBe(true);
      expect(uncertainToken?.suggestions.length).toBeGreaterThan(0);
    });
  });
});
