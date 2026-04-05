import { describe, it, expect } from 'vitest';
import { GM_LABELS, FALLBACK_RACES, FALLBACK_CLASSES } from '../constants';

describe('constants', () => {
  describe('GM_LABELS', () => {
    it('contains all five GM levels', () => {
      expect(Object.keys(GM_LABELS)).toHaveLength(5);
    });

    it('maps level 0 to Player', () => {
      expect(GM_LABELS[0]).toBe('Player');
    });

    it('maps level 3 to Administrator', () => {
      expect(GM_LABELS[3]).toBe('Administrator');
    });

    it('maps level 4 to Console', () => {
      expect(GM_LABELS[4]).toBe('Console');
    });
  });

  describe('FALLBACK_RACES', () => {
    it('contains the 10 playable WotLK races', () => {
      expect(Object.keys(FALLBACK_RACES)).toHaveLength(10);
    });

    it('maps known race IDs correctly', () => {
      expect(FALLBACK_RACES[1]).toBe('Human');
      expect(FALLBACK_RACES[2]).toBe('Orc');
      expect(FALLBACK_RACES[10]).toBe('Blood Elf');
      expect(FALLBACK_RACES[11]).toBe('Draenei');
    });
  });

  describe('FALLBACK_CLASSES', () => {
    it('contains the 10 WotLK classes', () => {
      expect(Object.keys(FALLBACK_CLASSES)).toHaveLength(10);
    });

    it('maps known class IDs correctly', () => {
      expect(FALLBACK_CLASSES[1]).toBe('Warrior');
      expect(FALLBACK_CLASSES[6]).toBe('Death Knight');
      expect(FALLBACK_CLASSES[11]).toBe('Druid');
    });

    it('does not include class ID 10 (no class with that ID in WotLK)', () => {
      expect(FALLBACK_CLASSES[10]).toBeUndefined();
    });
  });
});
