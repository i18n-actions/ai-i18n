import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config/loader';
import type { ActionConfig } from './config/types';
import type { TranslationUnit, ExtractResult, TranslationRequest } from './types/translation';
import { extractFromPattern, extractFromFile } from './extractors/factory';
import { diffAgainstStore, getUnitsNeedingTranslation } from './differ/differ';
import {
  createHashStore,
  addToHashStore,
  serializeHashStore,
  parseHashStore,
} from './differ/hasher';
import { createOrchestrator } from './translators/factory';
import { writeTranslations, createTranslationFile } from './formatters/factory';
import { createGitClient } from './git/client';
import { createLoopDetector, shouldSkipFromEnv } from './git/commit-detector';
import { ReportBuilder, publishToActions, createErrorEntry } from './reporter/reporter';
import { generateMarkdownReport } from './reporter/markdown';
import { logger } from './utils/logger';
import { I18nTranslateError } from './utils/errors';
import { getOutputFilePath } from './utils/output-path';

const HASH_STORE_FILE = '.i18n-hashes.json';

/**
 * Main entry point for the GitHub Action
 */
async function run(): Promise<void> {
  const reportBuilder = new ReportBuilder();

  try {
    // Check environment skip conditions
    const envSkip = shouldSkipFromEnv();
    if (envSkip.skip) {
      logger.info(`Skipping translation: ${envSkip.reason}`);
      core.setOutput('skipped', 'true');
      core.setOutput('skip-reason', envSkip.reason);
      return;
    }

    // Load configuration
    logger.info('Loading configuration...');
    const config = loadConfig();

    reportBuilder.setConfig({
      provider: config.provider.provider,
      model: config.provider.model,
      sourceLanguage: config.files.sourceLanguage,
      targetLanguages: config.files.targetLanguages,
    });

    // Check for commit loop
    if (config.git.enabled) {
      const gitClient = createGitClient(config.git);
      const loopDetector = createLoopDetector(gitClient, config.git.commitMessage);

      const { proceed, reason } = await loopDetector.shouldProceed();
      if (!proceed) {
        logger.info(`Skipping to prevent loop: ${reason}`);
        core.setOutput('skipped', 'true');
        core.setOutput('skip-reason', reason);
        return;
      }
    }

    // Run the translation pipeline
    const report = await runPipeline(config, reportBuilder);

    // Publish report
    publishToActions(report);

    // Set markdown report output
    const markdownReport = generateMarkdownReport(report);
    core.setOutput('report', markdownReport);

    // Check for failures
    if (report.errors.length > 0) {
      core.setFailed(`Translation completed with ${report.errors.length} error(s)`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Action failed: ${message}`);

    if (error instanceof I18nTranslateError) {
      reportBuilder.addError(createErrorEntry(error, error.code));
    }

    core.setFailed(message);
  }
}

/**
 * Run the translation pipeline
 */
async function runPipeline(
  config: ActionConfig,
  reportBuilder: ReportBuilder
): Promise<ReturnType<ReportBuilder['build']>> {
  const updatedFiles: string[] = [];

  // Load or create hash store
  const hashStore = loadHashStore();

  // Create translator orchestrator
  const orchestrator = createOrchestrator(config.provider, {
    batchSize: config.translation.batchSize,
    rateLimitPerMinute: config.translation.rateLimitPerMinute,
  });

  // Validate translator
  await orchestrator.validate();

  // Process each target language
  for (const targetLanguage of config.files.targetLanguages) {
    logger.group(`Translating to ${targetLanguage}`);

    try {
      const files = await processLanguage(
        config,
        targetLanguage,
        orchestrator,
        hashStore,
        reportBuilder
      );
      updatedFiles.push(...files);
    } catch (error) {
      logger.error(`Failed to process ${targetLanguage}: ${error}`);
      reportBuilder.addError(
        createErrorEntry(
          error instanceof Error ? error : new Error(String(error)),
          'LANGUAGE_PROCESSING_ERROR',
          undefined,
          targetLanguage
        )
      );
    }

    logger.groupEnd();
  }

  // Save hash store
  saveHashStore(hashStore);

  // Commit changes if enabled and not dry run
  if (config.git.enabled && !config.dryRun && updatedFiles.length > 0) {
    await commitChanges(config, updatedFiles, reportBuilder);
  } else if (config.dryRun) {
    logger.info('Dry run mode - skipping commit');
  }

  return reportBuilder.build();
}

/**
 * Process a single target language
 */
async function processLanguage(
  config: ActionConfig,
  targetLanguage: string,
  orchestrator: ReturnType<typeof createOrchestrator>,
  hashStore: ReturnType<typeof createHashStore>,
  reportBuilder: ReportBuilder
): Promise<string[]> {
  const updatedFiles: string[] = [];

  // Extract translation units from files
  const extractResults = await extractFromPattern(config.files.pattern, targetLanguage, {
    format: config.files.format === 'auto' ? undefined : config.files.format,
    exclude: config.files.exclude,
  });

  if (extractResults.length === 0) {
    logger.warning(`No files found for pattern: ${config.files.pattern}`);
    return [];
  }

  logger.info(`Found ${extractResults.length} file(s) to process`);

  // Process each file
  for (const extractResult of extractResults) {
    try {
      const outputFilePath = await processFile(
        config,
        extractResult,
        targetLanguage,
        orchestrator,
        hashStore,
        reportBuilder
      );

      if (outputFilePath) {
        updatedFiles.push(outputFilePath);
      }
    } catch (error) {
      logger.error(`Failed to process ${extractResult.filePath}: ${error}`);
      reportBuilder.addError(
        createErrorEntry(
          error instanceof Error ? error : new Error(String(error)),
          'FILE_PROCESSING_ERROR',
          undefined,
          extractResult.filePath
        )
      );
    }
  }

  return updatedFiles;
}

/**
 * Process a single file
 */
async function processFile(
  config: ActionConfig,
  extractResult: ExtractResult,
  targetLanguage: string,
  orchestrator: ReturnType<typeof createOrchestrator>,
  hashStore: ReturnType<typeof createHashStore>,
  reportBuilder: ReportBuilder
): Promise<string | null> {
  logger.info(`Processing ${extractResult.filePath}`);

  // Generate the language-specific output file path
  const outputFilePath = getOutputFilePath(
    extractResult.filePath,
    targetLanguage,
    config.files.sourceLanguage
  );

  // Diff against hash store to find changes
  const diffResult = diffAgainstStore(extractResult.filePath, extractResult.units, hashStore);

  // Get units that need translation
  const unitsToTranslate = getUnitsNeedingTranslation(diffResult);

  if (unitsToTranslate.length === 0) {
    logger.info(`No changes detected in ${extractResult.filePath}`);
    reportBuilder.addFileReport({
      filePath: outputFilePath,
      targetLanguage,
      unitsProcessed: extractResult.units.length,
      unitsTranslated: 0,
      unitsFailed: 0,
      unitsSkipped: extractResult.units.length,
    });
    return null;
  }

  logger.info(`Found ${unitsToTranslate.length} unit(s) to translate`);

  // Create translation request
  const request: TranslationRequest = {
    units: unitsToTranslate,
    sourceLanguage: config.files.sourceLanguage,
    targetLanguage,
    context: config.translation.context,
    preserveFormatting: config.translation.preserveFormatting,
    preservePlaceholders: config.translation.preservePlaceholders,
  };

  // Translate
  const response = await orchestrator.translate(request);

  reportBuilder.addTokenUsage(response.usage);

  // Merge translations with original units
  const translationMap = new Map(response.translations.map(t => [t.id, t.target]));
  const updatedUnits: TranslationUnit[] = extractResult.units.map(unit => {
    const translation = translationMap.get(unit.id);
    return translation ? { ...unit, target: translation } : unit;
  });

  // Write to language-specific output file if not dry run
  if (!config.dryRun) {
    const absoluteOutputPath = path.resolve(outputFilePath);

    if (fs.existsSync(absoluteOutputPath)) {
      // Output file exists - read it and merge translations
      const existingContent = fs.readFileSync(absoluteOutputPath, 'utf-8');
      const existingExtract = extractFromFile(outputFilePath, targetLanguage, {
        format: config.files.format === 'auto' ? undefined : config.files.format,
      });

      // Merge new translations with existing content
      const mergedUnits = mergeTranslationUnits(existingExtract.units, updatedUnits);

      await writeTranslations(
        outputFilePath,
        existingContent,
        mergedUnits,
        existingExtract,
        { markAsTranslated: true }
      );
    } else {
      // Output file doesn't exist - create it
      logger.info(`Creating new translation file: ${outputFilePath}`);
      createTranslationFile(
        outputFilePath,
        updatedUnits,
        extractResult.formatInfo.format,
        config.files.sourceLanguage,
        targetLanguage,
        { markAsTranslated: true }
      );
    }

    // Update hash store
    addToHashStore(hashStore, extractResult.filePath, extractResult.units);
  }

  // Report
  const skipped = extractResult.units.length - unitsToTranslate.length;
  const failed = unitsToTranslate.length - response.translations.length;

  reportBuilder.addFileReport({
    filePath: outputFilePath,
    targetLanguage,
    unitsProcessed: extractResult.units.length,
    unitsTranslated: response.translations.length,
    unitsFailed: failed,
    unitsSkipped: skipped,
  });

  return response.translations.length > 0 ? outputFilePath : null;
}

/**
 * Merge translation units, preferring new translations over existing ones
 */
function mergeTranslationUnits(
  existingUnits: TranslationUnit[],
  newUnits: TranslationUnit[]
): TranslationUnit[] {
  const newUnitsMap = new Map(newUnits.map(u => [u.id, u]));

  // Start with existing units, update with new translations
  const result: TranslationUnit[] = [];
  const processedIds = new Set<string>();

  // First, process all existing units and update them if new translations exist
  for (const existing of existingUnits) {
    const newUnit = newUnitsMap.get(existing.id);
    if (newUnit && newUnit.target) {
      // Update with new translation
      result.push({ ...existing, target: newUnit.target, source: newUnit.source });
    } else {
      // Keep existing
      result.push(existing);
    }
    processedIds.add(existing.id);
  }

  // Then, add any new units that weren't in the existing file
  for (const newUnit of newUnits) {
    if (!processedIds.has(newUnit.id)) {
      result.push(newUnit);
    }
  }

  return result;
}

/**
 * Commit changes to git
 */
async function commitChanges(
  config: ActionConfig,
  files: string[],
  reportBuilder: ReportBuilder
): Promise<void> {
  logger.group('Committing changes');

  try {
    const gitClient = createGitClient(config.git);

    // Check if git is available
    const isRepo = await gitClient.checkRepository();
    if (!isRepo) {
      logger.warning('Not in a git repository - skipping commit');
      return;
    }

    // Configure user if specified
    await gitClient.configureUser();

    // Include hash store file in commit
    const filesToCommit = [...files];
    if (fs.existsSync(HASH_STORE_FILE)) {
      filesToCommit.push(HASH_STORE_FILE);
    }

    // Stage and commit
    const result = await gitClient.stageAndCommit(filesToCommit);

    logger.info(`Created commit: ${result.sha}`);
    core.setOutput('commit-sha', result.sha);
  } catch (error) {
    logger.error(`Failed to commit: ${error}`);
    reportBuilder.addError(
      createErrorEntry(
        error instanceof Error ? error : new Error(String(error)),
        'GIT_COMMIT_ERROR'
      )
    );
  }

  logger.groupEnd();
}

/**
 * Load hash store from file
 */
function loadHashStore(): ReturnType<typeof createHashStore> {
  try {
    if (fs.existsSync(HASH_STORE_FILE)) {
      const content = fs.readFileSync(HASH_STORE_FILE, 'utf-8');
      return parseHashStore(content);
    }
  } catch (error) {
    logger.warning(`Failed to load hash store: ${error}`);
  }

  return createHashStore();
}

/**
 * Save hash store to file
 */
function saveHashStore(store: ReturnType<typeof createHashStore>): void {
  try {
    const content = serializeHashStore(store);
    fs.writeFileSync(HASH_STORE_FILE, content, 'utf-8');
    logger.debug('Saved hash store');
  } catch (error) {
    logger.warning(`Failed to save hash store: ${error}`);
  }
}

// Run the action
run().catch(error => {
  core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
