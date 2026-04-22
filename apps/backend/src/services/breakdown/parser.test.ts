import { describe, expect, it } from 'vitest';
import { parseScreenplay } from './parser';

describe('parseScreenplay', () => {
  it('يقسم السيناريو العربي والإنجليزي ويستخرج بيانات الرأس', () => {
    const result = parseScreenplay(`
مشهد داخلي غرفة المعيشة - نهار - يوم 2
يجلس أحمد على الأريكة.

INT. GARAGE - NIGHT
Khaled enters carrying a metal case.
`);

    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]?.headerData.sceneNumber).toBe(1);
    expect(result.scenes[0]?.headerData.sceneType).toBe('INT');
    expect(result.scenes[0]?.headerData.timeOfDay).toBe('DAY');
    expect(result.scenes[0]?.headerData.storyDay).toBe(2);
    expect(result.scenes[1]?.headerData.location).toContain('GARAGE');
    expect(result.scenes[1]?.headerData.timeOfDay).toBe('NIGHT');
    expect(result.totalPages).toBeGreaterThan(0);
  });

  it('يتجاهل النص السابق لأول رأس مشهد', () => {
    const result = parseScreenplay(`
ملاحظة إنتاجية
هذه ليست بداية مشهد

مشهد خارجي الشارع - ليل
تتحرك سيارة في الشارع.
`);

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]?.headerData.sceneType).toBe('EXT');
    expect(result.scenes[0]?.content).toContain('تتحرك سيارة');
  });
});
