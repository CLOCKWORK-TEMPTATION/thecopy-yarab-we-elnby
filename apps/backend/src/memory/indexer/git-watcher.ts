/* eslint-disable @typescript-eslint/no-explicit-any -- experimental memory module */
/**
 * Git Watcher
 * مراقب تغييرات Git
 */

import { EventEmitter } from "eventemitter3";
import simpleGit, { SimpleGit } from "simple-git";

import { logger } from "@/lib/logger";

import type { GitChangeEvent } from "../types";

export class GitWatcher extends EventEmitter {
  private git: SimpleGit;
  private repoPath: string;
  private lastCheckedCommit: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(repoPath: string) {
    super();
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async initialize(): Promise<void> {
    try {
      // Check if this is a git repo
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`Path ${this.repoPath} is not a git repository`);
      }

      this.lastCheckedCommit = await this.getCurrentCommit();
      logger.info(
        `GitWatcher initialized at commit ${this.lastCheckedCommit?.slice(0, 7)}`,
      );
    } catch (error) {
      logger.error("Failed to initialize GitWatcher", { error });
      throw error;
    }
  }

  async getCurrentCommit(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.hash ?? "";
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current ?? "unknown";
  }

  /**
   * بدء مراقبة التغييرات (polling)
   */
  startWatching(intervalMs = 5000): void {
    if (this.pollingInterval) return;

    logger.info(`Started watching git changes every ${intervalMs}ms`);

    this.pollingInterval = setInterval(() => {
      void this.checkForChangesSafely();
    }, intervalMs);
  }

  private async checkForChangesSafely(): Promise<void> {
    try {
      const changes = await this.checkForChanges();
      if (changes.length > 0) {
        logger.info(`Detected ${changes.length} changes`);
      }
    } catch (error) {
      logger.error("Error checking for changes", { error });
    }
  }

  stopWatching(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info("Stopped watching git changes");
    }
  }

  async checkForChanges(): Promise<GitChangeEvent[]> {
    const currentCommit = await this.getCurrentCommit();

    if (currentCommit === this.lastCheckedCommit) {
      return [];
    }

    logger.info(
      `Commit changed: ${this.lastCheckedCommit?.slice(0, 7)} → ${currentCommit.slice(0, 7)}`,
    );

    const events: GitChangeEvent[] = [];

    try {
      // Get log between commits
      const log = this.lastCheckedCommit
        ? await this.git.log({
            from: this.lastCheckedCommit,
            to: currentCommit,
          })
        : await this.git.log({
            to: currentCommit,
          });

      for (const commit of log.all) {
        // Get files changed in this commit
        const showResult = await this.git.show([
          "--name-status",
          "--pretty=format:",
          commit.hash,
        ]);
        const lines = showResult.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          const parts = line.split("\t");
          const status = parts[0];
          const filePath = parts[parts.length - 1];
          const oldPath = parts.length > 2 ? parts[1] : undefined;
          if (!status || !filePath) {
            continue;
          }

          let type: GitChangeEvent["type"] = "modified";
          if (status.startsWith("A")) type = "added";
          else if (status.startsWith("D")) type = "deleted";
          else if (status.startsWith("R")) type = "renamed";

          const event: GitChangeEvent = {
            type,
            filePath,
            commitHash: commit.hash,
            commitMessage: commit.message,
            author: commit.author_name,
            timestamp: new Date(commit.date),
            ...(oldPath ? { oldPath } : {}),
          };

          events.push(event);
          this.emit("change", event);
        }
      }
    } catch (error) {
      logger.error("Error getting changes", { error });
    }

    this.lastCheckedCommit = currentCommit;
    return events;
  }

  /**
   * الحصول على تاريخ الملف
   */
  async getFileHistory(filePath: string, maxCount = 10): Promise<any[]> {
    try {
      const log = await this.git.log({
        file: filePath,
        maxCount,
      });
      return log.all.map((commit) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      }));
    } catch (error) {
      logger.error(`Error getting history for ${filePath}`, { error });
      return [];
    }
  }

  /**
   * الحصول على الملفات المتغيرة في working directory
   */
  async getWorkingDirectoryChanges(): Promise<{
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    try {
      const status = await this.git.status();
      return {
        modified: status.modified,
        added: status.not_added,
        deleted: status.deleted,
        untracked: status.not_added,
      };
    } catch (error) {
      logger.error("Error getting working directory changes", { error });
      return { modified: [], added: [], deleted: [], untracked: [] };
    }
  }

  /**
   * الحصول على معلومات عن المستودع
   */
  async getRepoInfo(): Promise<{
    currentBranch: string;
    lastCommit: string;
    totalCommits: number;
    remoteUrl?: string;
  }> {
    try {
      const [branch, commit, remote] = await Promise.all([
        this.getCurrentBranch(),
        this.getCurrentCommit(),
        this.git
          .getRemotes(true)
          .then(
            (remotes) =>
              remotes.find((remote) => remote.name === "origin")?.refs?.fetch,
          ),
      ]);

      const log = await this.git.log({ maxCount: 1 });

      return {
        currentBranch: branch,
        lastCommit: commit,
        totalCommits: log.total,
        ...(remote ? { remoteUrl: remote } : {}),
      };
    } catch (error) {
      logger.error("Error getting repo info", { error });
      throw error;
    }
  }
}

export const createGitWatcher = (repoPath: string) => new GitWatcher(repoPath);
