import {
  ReportBuilder,
  formatDuration,
  createErrorEntry,
  getStatusEmoji,
  getReportSummary,
} from '../../../src/reporter/reporter';

describe('Reporter', () => {
  describe('ReportBuilder', () => {
    it('should build a report', () => {
      const builder = new ReportBuilder();

      builder.setConfig({
        provider: 'anthropic',
        model: 'claude-3-haiku',
        sourceLanguage: 'en',
        targetLanguages: ['de', 'fr'],
      });

      builder.addFileReport({
        filePath: 'messages.json',
        targetLanguage: 'de',
        unitsProcessed: 10,
        unitsTranslated: 8,
        unitsFailed: 1,
        unitsSkipped: 1,
      });

      const report = builder.build();

      expect(report.config.provider).toBe('anthropic');
      expect(report.config.model).toBe('claude-3-haiku');
      expect(report.files.length).toBe(1);
      expect(report.summary.totalFiles).toBe(1);
      expect(report.summary.translatedUnits).toBe(8);
      expect(report.summary.failedUnits).toBe(1);
    });

    it('should track multiple files', () => {
      const builder = new ReportBuilder();

      builder.setConfig({
        provider: 'openai',
        sourceLanguage: 'en',
        targetLanguages: ['de'],
      });

      builder.addFileReport({
        filePath: 'a.json',
        targetLanguage: 'de',
        unitsProcessed: 5,
        unitsTranslated: 5,
        unitsFailed: 0,
        unitsSkipped: 0,
      });

      builder.addFileReport({
        filePath: 'b.json',
        targetLanguage: 'de',
        unitsProcessed: 10,
        unitsTranslated: 8,
        unitsFailed: 2,
        unitsSkipped: 0,
      });

      const report = builder.build();

      expect(report.summary.totalFiles).toBe(2);
      expect(report.summary.totalUnits).toBe(15);
      expect(report.summary.translatedUnits).toBe(13);
      expect(report.summary.failedUnits).toBe(2);
    });

    it('should track errors', () => {
      const builder = new ReportBuilder();

      builder.setConfig({
        provider: 'anthropic',
        sourceLanguage: 'en',
        targetLanguages: ['de'],
      });

      builder.addError({
        message: 'Translation failed',
        code: 'TRANSLATION_ERROR',
        unitId: 'greeting',
        filePath: 'messages.json',
        timestamp: new Date(),
      });

      const report = builder.build();

      expect(report.errors.length).toBe(1);
      expect(report.errors[0]?.code).toBe('TRANSLATION_ERROR');
    });

    it('should calculate duration', () => {
      const builder = new ReportBuilder();

      builder.setConfig({
        provider: 'anthropic',
        sourceLanguage: 'en',
        targetLanguages: ['de'],
      });

      // Simulate some time passing
      const report = builder.build();

      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(report.startTime).toBeDefined();
      expect(report.endTime).toBeDefined();
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90000)).toBe('1m 30s');
    });

    it('should format hours', () => {
      expect(formatDuration(3700000)).toBe('1h 1m');
    });
  });

  describe('createErrorEntry', () => {
    it('should create error entry from Error', () => {
      const error = new Error('Test error');
      const entry = createErrorEntry(error, 'TEST_CODE', 'unit-1', 'test.json');

      expect(entry.message).toBe('Test error');
      expect(entry.code).toBe('TEST_CODE');
      expect(entry.unitId).toBe('unit-1');
      expect(entry.filePath).toBe('test.json');
      expect(entry.timestamp).toBeDefined();
    });
  });

  describe('getStatusEmoji', () => {
    it('should return warning for reports with errors', () => {
      const report = {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 1000,
        config: { provider: 'anthropic', sourceLanguage: 'en', targetLanguages: ['de'] },
        files: [],
        summary: { totalFiles: 1, totalUnits: 10, translatedUnits: 5, failedUnits: 5, skippedUnits: 0 },
        errors: [{ message: 'error', code: 'ERR', timestamp: new Date() }],
      };

      expect(getStatusEmoji(report)).toBe('⚠️');
    });

    it('should return empty for no translations', () => {
      const report = {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 1000,
        config: { provider: 'anthropic', sourceLanguage: 'en', targetLanguages: ['de'] },
        files: [],
        summary: { totalFiles: 0, totalUnits: 0, translatedUnits: 0, failedUnits: 0, skippedUnits: 0 },
        errors: [],
      };

      expect(getStatusEmoji(report)).toBe('📭');
    });

    it('should return success for good reports', () => {
      const report = {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 1000,
        config: { provider: 'anthropic', sourceLanguage: 'en', targetLanguages: ['de'] },
        files: [],
        summary: { totalFiles: 1, totalUnits: 10, translatedUnits: 10, failedUnits: 0, skippedUnits: 0 },
        errors: [],
      };

      expect(getStatusEmoji(report)).toBe('✅');
    });
  });

  describe('getReportSummary', () => {
    it('should generate summary string', () => {
      const report = {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 1000,
        config: { provider: 'anthropic', sourceLanguage: 'en', targetLanguages: ['de'] },
        files: [],
        summary: { totalFiles: 2, totalUnits: 20, translatedUnits: 15, failedUnits: 0, skippedUnits: 5 },
        errors: [],
      };

      const summary = getReportSummary(report);

      expect(summary).toContain('15/20');
      expect(summary).toContain('2 files');
    });
  });
});
