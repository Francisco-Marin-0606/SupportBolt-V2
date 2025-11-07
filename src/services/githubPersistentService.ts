import { Octokit } from "@octokit/rest";
import { createClient } from '@supabase/supabase-js';

interface GitOperation {
  operation_type: string;
  source_branch?: string;
  target_branch?: string;
  status: 'pending' | 'success' | 'failed';
  result?: any;
  error?: string;
}

export class GitHubPersistentService {
  private octokit: Octokit;
  private supabase;
  private owner: string;
  private repo: string;
  private repositoryId?: string;

  constructor(token: string, owner: string, repo: string, repositoryId?: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    this.repositoryId = repositoryId;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async logOperation(operation: GitOperation) {
    if (!this.repositoryId) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('git_operations')
      .insert({
        repository_id: this.repositoryId,
        ...operation
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to log operation:', error);
      return null;
    }

    return data;
  }

  private async updateOperation(id: string, updates: Partial<GitOperation>) {
    const { error } = await this.supabase
      .from('git_operations')
      .update({
        ...updates,
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update operation:', error);
    }
  }

  async createBranch(branchName: string, fromBranch: string = 'master') {
    const operation = await this.logOperation({
      operation_type: 'create_branch',
      source_branch: fromBranch,
      target_branch: branchName,
      status: 'pending'
    });

    try {
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${fromBranch}`
      });

      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      });

      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'success',
          result: { sha: ref.object.sha }
        });
      }

      return { success: true, sha: ref.object.sha };
    } catch (error: any) {
      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'failed',
          error: error.message
        });
      }
      throw error;
    }
  }

  async mergeBranches(base: string, head: string, commitMessage?: string) {
    const operation = await this.logOperation({
      operation_type: 'merge',
      source_branch: head,
      target_branch: base,
      status: 'pending'
    });

    try {
      const { data } = await this.octokit.repos.merge({
        owner: this.owner,
        repo: this.repo,
        base,
        head,
        commit_message: commitMessage || `Merge ${head} into ${base}`
      });

      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'success',
          result: { sha: data.sha, merged: true }
        });
      }

      return { success: true, sha: data.sha };
    } catch (error: any) {
      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'failed',
          error: error.message
        });
      }
      throw error;
    }
  }

  async compareBranches(base: string, head: string) {
    const { data } = await this.octokit.repos.compareCommits({
      owner: this.owner,
      repo: this.repo,
      base,
      head
    });

    return {
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
      status: data.status,
      total_commits: data.total_commits,
      commits: data.commits.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name,
        date: c.commit.author?.date
      }))
    };
  }

  async getBranchStatus(branch: string) {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch
      });

      return {
        name: data.name,
        sha: data.commit.sha,
        protected: data.protected,
        lastCommit: {
          message: data.commit.commit.message,
          author: data.commit.commit.author?.name,
          date: data.commit.commit.author?.date
        }
      };
    } catch (error: any) {
      throw new Error(`Branch ${branch} not found: ${error.message}`);
    }
  }

  async createPullRequest(head: string, base: string, title: string, body?: string) {
    const operation = await this.logOperation({
      operation_type: 'create_pr',
      source_branch: head,
      target_branch: base,
      status: 'pending'
    });

    try {
      const { data } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        head,
        base,
        body: body || ''
      });

      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'success',
          result: { pr_number: data.number, url: data.html_url }
        });
      }

      return {
        success: true,
        pr_number: data.number,
        url: data.html_url
      };
    } catch (error: any) {
      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'failed',
          error: error.message
        });
      }
      throw error;
    }
  }

  async listBranches() {
    const { data } = await this.octokit.repos.listBranches({
      owner: this.owner,
      repo: this.repo,
      per_page: 100
    });

    return data.map(branch => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected
    }));
  }

  async deleteBranch(branchName: string) {
    const operation = await this.logOperation({
      operation_type: 'delete_branch',
      target_branch: branchName,
      status: 'pending'
    });

    try {
      await this.octokit.git.deleteRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`
      });

      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'success',
          result: { deleted: true }
        });
      }

      return { success: true, deleted: true };
    } catch (error: any) {
      if (operation) {
        await this.updateOperation(operation.id, {
          status: 'failed',
          error: error.message
        });
      }
      throw error;
    }
  }

  async getCommitsBetweenBranches(base: string, head: string) {
    const comparison = await this.compareBranches(base, head);
    return comparison.commits;
  }

  async getBranchInfo(branch: string) {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch
      });

      return {
        name: data.name,
        sha: data.commit.sha,
        protected: data.protected,
        commit: {
          sha: data.commit.sha,
          message: data.commit.commit.message,
          author: data.commit.commit.author?.name,
          date: data.commit.commit.author?.date,
          url: data.commit.html_url
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get branch info: ${error.message}`);
    }
  }
}
