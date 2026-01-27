import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { GitError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { GitConfig } from '../config/types';

/**
 * Result of a git commit operation
 */
export interface CommitResult {
  sha: string;
  summary: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Options for git operations
 */
export interface GitClientOptions {
  baseDir?: string;
  timeout?: number;
}

/**
 * Git client wrapper for translation commits
 */
export class GitClient {
  private git: SimpleGit;
  private config: GitConfig;

  constructor(config: GitConfig, options?: GitClientOptions) {
    this.config = config;

    const gitOptions: Partial<SimpleGitOptions> = {
      baseDir: options?.baseDir ?? process.cwd(),
      binary: 'git',
      maxConcurrentProcesses: 1,
      timeout: {
        block: options?.timeout ?? 10000,
      },
    };

    this.git = simpleGit(gitOptions);
  }

  /**
   * Check if git is available and we're in a repository
   */
  async checkRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      logger.warning('Not in a git repository or git not available');
      return false;
    }
  }

  /**
   * Configure git user if specified
   */
  async configureUser(): Promise<void> {
    if (this.config.userName) {
      await this.git.addConfig('user.name', this.config.userName, false, 'local');
      logger.debug(`Set git user.name to ${this.config.userName}`);
    }

    if (this.config.userEmail) {
      await this.git.addConfig('user.email', this.config.userEmail, false, 'local');
      logger.debug(`Set git user.email to ${this.config.userEmail}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return result.trim();
    } catch (error) {
      throw new GitError(
        `Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'revparse',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.modified.length > 0 || status.created.length > 0 || status.staged.length > 0;
    } catch (error) {
      throw new GitError(
        `Failed to check git status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'status',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Stage files for commit
   */
  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) {
      logger.warning('No files to stage');
      return;
    }

    try {
      await this.git.add(files);
      logger.debug(`Staged ${files.length} files`);
    } catch (error) {
      throw new GitError(
        `Failed to stage files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'add',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Commit staged changes
   */
  async commit(message?: string): Promise<CommitResult> {
    const commitMessage = message ?? this.config.commitMessage;

    try {
      const result = await this.git.commit(commitMessage);

      logger.info(`Created commit: ${result.commit}`);

      return {
        sha: result.commit,
        summary:
          result.summary.changes > 0 ? `${result.summary.changes} files changed` : 'No changes',
        filesChanged: result.summary.changes,
        insertions: result.summary.insertions,
        deletions: result.summary.deletions,
      };
    } catch (error) {
      throw new GitError(
        `Failed to create commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'commit',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Stage files and commit in one operation
   */
  async stageAndCommit(files: string[], message?: string): Promise<CommitResult> {
    await this.stageFiles(files);
    return this.commit(message);
  }

  /**
   * Get the last commit message
   */
  async getLastCommitMessage(): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return log.latest?.message ?? '';
    } catch (error) {
      throw new GitError(
        `Failed to get last commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'log',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the last commit SHA
   */
  async getLastCommitSha(): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return log.latest?.hash ?? '';
    } catch (error) {
      throw new GitError(
        `Failed to get last commit SHA: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'log',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if a branch exists
   */
  async branchExists(branchName: string): Promise<boolean> {
    try {
      const branches = await this.git.branch();
      return branches.all.includes(branchName);
    } catch {
      return false;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branchName);
      logger.info(`Created and switched to branch: ${branchName}`);
    } catch (error) {
      throw new GitError(
        `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'checkout',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Switch to an existing branch
   */
  async checkoutBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkout(branchName);
      logger.debug(`Switched to branch: ${branchName}`);
    } catch (error) {
      throw new GitError(
        `Failed to checkout branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'checkout',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get list of modified files
   */
  async getModifiedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return [...status.modified, ...status.created];
    } catch (error) {
      throw new GitError(
        `Failed to get modified files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'status',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the diff for staged files
   */
  async getStagedDiff(): Promise<string> {
    try {
      return await this.git.diff(['--cached']);
    } catch (error) {
      throw new GitError(
        `Failed to get staged diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'diff',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Reset changes to specific files
   */
  async resetFiles(files: string[]): Promise<void> {
    try {
      await this.git.checkout(['--', ...files]);
      logger.debug(`Reset ${files.length} files`);
    } catch (error) {
      throw new GitError(
        `Failed to reset files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'checkout',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Create a git client instance
 */
export function createGitClient(config: GitConfig, options?: GitClientOptions): GitClient {
  return new GitClient(config, options);
}
