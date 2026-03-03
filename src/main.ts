import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, parseYaml } from './config/loader';
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
import { I18nTranslateError, ValidationError } from './utils/errors';
import { getOutputFilePath } from './utils/output-path';

const HASH_STORE_FILE = '.i18n-hashes.json';

/**
 * Convert absolute file path to relative path from cwd.
 * This ensures hash store keys are portable across different environments.
 */
function toRelativePath(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(process.cwd(), absolutePath);
  // Normalize to forward slashes for cross-platform consistency
  return relativePath.replace(/\\/g, '/');
}

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

    if (error instanceof ValidationError) {
      logger.error(`Validation issues:\n${error.formatIssues()}`);
    }

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

  // Snapshot hash store before processing — all languages should diff against
  // the same baseline, not see updates from earlier languages
  const hashStoreSnapshot = JSON.parse(JSON.stringify(hashStore)) as typeof hashStore;

  // Load glossary once for all languages
  const glossary = loadGlossary(config.translation.glossaryFile);

  // Process each target language
  for (const targetLanguage of config.files.targetLanguages) {
    logger.group(`Translating to ${targetLanguage}`);

    const languageGlossary = glossary[targetLanguage];

    try {
      const files = await processLanguage(
        config,
        targetLanguage,
        orchestrator,
        hashStoreSnapshot,
        hashStore,
        reportBuilder,
        languageGlossary
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
  diffHashStore: ReturnType<typeof createHashStore>,
  updateHashStore: ReturnType<typeof createHashStore>,
  reportBuilder: ReportBuilder,
  glossary?: Record<string, string>
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
        diffHashStore,
        updateHashStore,
        reportBuilder,
        glossary
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
  diffHashStore: ReturnType<typeof createHashStore>,
  updateHashStore: ReturnType<typeof createHashStore>,
  reportBuilder: ReportBuilder,
  glossary?: Record<string, string>
): Promise<string | null> {
  logger.info(`Processing ${extractResult.filePath}`);

  // Generate the language-specific output file path
  const outputFilePath = getOutputFilePath(
    extractResult.filePath,
    targetLanguage,
    config.files.sourceLanguage
  );

  // Diff against hash store to find changes
  // Use relative path for portable hash store keys
  const relativeFilePath = toRelativePath(extractResult.filePath);
  const diffResult = diffAgainstStore(relativeFilePath, extractResult.units, diffHashStore);

  // Get units that need translation (new or modified)
  let unitsToTranslate = getUnitsNeedingTranslation(diffResult);

  // Read target file early — needed for both reviewed-unit filtering and merge step
  const absoluteOutputPath = path.resolve(outputFilePath);
  let existingExtract: ExtractResult | null = null;

  if (fs.existsSync(absoluteOutputPath)) {
    existingExtract = extractFromFile(outputFilePath, targetLanguage, {
      format: config.files.format === 'auto' ? undefined : config.files.format,
    });

    // Filter out reviewed units that are "new" (not modified)
    // If the source text changed (modified), always retranslate regardless of review state
    const reviewedIds = new Set(
      existingExtract.units.filter(isReviewedUnit).map(u => u.id)
    );

    if (reviewedIds.size > 0) {
      const changeTypeMap = new Map(
        diffResult.entries.map(e => [e.unit.id, e.changeType])
      );

      const beforeCount = unitsToTranslate.length;
      unitsToTranslate = unitsToTranslate.filter(unit => {
        const changeType = changeTypeMap.get(unit.id);
        // Always retranslate modified units (source text changed)
        if (changeType === 'modified') {
          return true;
        }
        // Skip new units that are already reviewed in the target
        if (changeType === 'new' && reviewedIds.has(unit.id)) {
          return false;
        }
        return true;
      });

      const skippedReviewed = beforeCount - unitsToTranslate.length;
      if (skippedReviewed > 0) {
        logger.info(
          `Skipped ${skippedReviewed} reviewed unit(s) that don't need retranslation`
        );
      }
    }
  }

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
    glossary,
  };

  // Translate
  const response = await orchestrator.translate(request);

  reportBuilder.addTokenUsage(response.usage);

  logger.info(
    `Received ${response.translations.length} translation(s) for ${unitsToTranslate.length} unit(s)`
  );

  // Merge translations with original units
  const translationMap = new Map(response.translations.map(t => [t.id, t.target]));
  const updatedUnits: TranslationUnit[] = extractResult.units.map(unit => {
    const translation = translationMap.get(unit.id);
    return translation ? { ...unit, target: translation } : unit;
  });

  // Log how many units actually got translations
  const unitsWithTargets = updatedUnits.filter(u => u.target).length;
  logger.info(`Units with translations after merge: ${unitsWithTargets}/${updatedUnits.length}`);

  // Write to language-specific output file if not dry run
  if (!config.dryRun) {
    if (existingExtract) {
      // Output file exists - merge translations with existing content
      const existingContent = fs.readFileSync(absoluteOutputPath, 'utf-8');

      logger.info(
        `Output file exists with ${existingExtract.units.length} units, merging with ${updatedUnits.length} updated units`
      );

      // Merge new translations with existing content
      const mergedUnits = mergeTranslationUnits(existingExtract.units, updatedUnits);

      const mergedWithTargets = mergedUnits.filter(u => u.target).length;
      logger.info(
        `After merging with existing: ${mergedWithTargets}/${mergedUnits.length} units have targets`
      );

      await writeTranslations(outputFilePath, existingContent, mergedUnits, existingExtract, {
        markAsTranslated: true,
      });
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

    // Update hash store only for units that successfully got translations
    const successfullyTranslatedUnits = updatedUnits.filter(u => u.target);
    if (successfullyTranslatedUnits.length > 0) {
      addToHashStore(updateHashStore, relativeFilePath, successfullyTranslatedUnits);
      logger.info(
        `Updated hash store with ${successfullyTranslatedUnits.length}/${extractResult.units.length} translated units`
      );
    }
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

/**
 * Load glossary file and return parsed per-language glossary map.
 * Returns an empty object if no glossary file is configured or the file doesn't exist.
 */
function loadGlossary(
  glossaryFile: string | undefined
): Record<string, Record<string, string>> {
  if (!glossaryFile) {
    return {};
  }

  const absolutePath = path.resolve(glossaryFile);
  if (!fs.existsSync(absolutePath)) {
    logger.warning(`Glossary file not found: ${absolutePath}`);
    return {};
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = parseYaml(content);

    // Validate structure: top-level keys are language codes, values are Record<string, string>
    const glossary: Record<string, Record<string, string>> = {};
    for (const [lang, entries] of Object.entries(parsed)) {
      if (typeof entries === 'object' && entries !== null && !Array.isArray(entries)) {
        const terms: Record<string, string> = {};
        for (const [term, translation] of Object.entries(entries as Record<string, unknown>)) {
          if (typeof translation === 'string') {
            terms[term] = translation;
          }
        }
        if (Object.keys(terms).length > 0) {
          glossary[lang] = terms;
        }
      }
    }

    const langCount = Object.keys(glossary).length;
    const termCount = Object.values(glossary).reduce(
      (sum, terms) => sum + Object.keys(terms).length,
      0
    );
    logger.info(`Loaded glossary: ${termCount} term(s) across ${langCount} language(s)`);
    return glossary;
  } catch (error) {
    logger.warning(
      `Failed to parse glossary file: ${error instanceof Error ? error.message : String(error)}`
    );
    return {};
  }
}

/**
 * Check whether a translation unit has been reviewed/finalized by a human translator.
 */
function isReviewedUnit(unit: TranslationUnit): boolean {
  const state = unit.metadata.state?.toLowerCase();
  if (state === 'reviewed' || state === 'final') {
    return true;
  }
  if (unit.metadata.approved === true) {
    return true;
  }
  return false;
}

// Run the action
run().catch(error => {
  core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
