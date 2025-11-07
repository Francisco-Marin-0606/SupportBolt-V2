import { NextRequest, NextResponse } from 'next/server';
import { GitHubPersistentService } from '@/services/githubPersistentService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, owner, repo, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is not configured' },
        { status: 500 }
      );
    }

    const repoOwner = owner || process.env.GITHUB_REPO_OWNER;
    const repoName = repo || process.env.GITHUB_REPO_NAME;

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'Repository owner and name are required' },
        { status: 400 }
      );
    }

    const github = new GitHubPersistentService(
      githubToken,
      repoOwner,
      repoName,
      params.repositoryId
    );

    let result;

    switch (action) {
      case 'create_branch':
        if (!params.branchName) {
          return NextResponse.json(
            { error: 'branchName is required' },
            { status: 400 }
          );
        }
        result = await github.createBranch(params.branchName, params.fromBranch);
        break;

      case 'merge':
        if (!params.base || !params.head) {
          return NextResponse.json(
            { error: 'base and head branches are required' },
            { status: 400 }
          );
        }
        result = await github.mergeBranches(params.base, params.head, params.message);
        break;

      case 'compare':
        if (!params.base || !params.head) {
          return NextResponse.json(
            { error: 'base and head branches are required' },
            { status: 400 }
          );
        }
        result = await github.compareBranches(params.base, params.head);
        break;

      case 'branch_status':
        if (!params.branch) {
          return NextResponse.json(
            { error: 'branch is required' },
            { status: 400 }
          );
        }
        result = await github.getBranchStatus(params.branch);
        break;

      case 'branch_info':
        if (!params.branch) {
          return NextResponse.json(
            { error: 'branch is required' },
            { status: 400 }
          );
        }
        result = await github.getBranchInfo(params.branch);
        break;

      case 'list_branches':
        result = await github.listBranches();
        break;

      case 'create_pr':
        if (!params.head || !params.base || !params.title) {
          return NextResponse.json(
            { error: 'head, base, and title are required' },
            { status: 400 }
          );
        }
        result = await github.createPullRequest(
          params.head,
          params.base,
          params.title,
          params.body
        );
        break;

      case 'delete_branch':
        if (!params.branchName) {
          return NextResponse.json(
            { error: 'branchName is required' },
            { status: 400 }
          );
        }
        result = await github.deleteBranch(params.branchName);
        break;

      case 'get_commits':
        if (!params.base || !params.head) {
          return NextResponse.json(
            { error: 'base and head branches are required' },
            { status: 400 }
          );
        }
        result = await github.getCommitsBetweenBranches(params.base, params.head);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Git API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is not configured' },
        { status: 500 }
      );
    }

    const repoOwner = searchParams.get('owner') || process.env.GITHUB_REPO_OWNER;
    const repoName = searchParams.get('repo') || process.env.GITHUB_REPO_NAME;

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'Repository owner and name are required' },
        { status: 400 }
      );
    }

    const github = new GitHubPersistentService(
      githubToken,
      repoOwner,
      repoName
    );

    let result;

    switch (action) {
      case 'list_branches':
        result = await github.listBranches();
        break;

      case 'branch_status':
        const branch = searchParams.get('branch');
        if (!branch) {
          return NextResponse.json(
            { error: 'branch parameter is required' },
            { status: 400 }
          );
        }
        result = await github.getBranchStatus(branch);
        break;

      case 'branch_info':
        const branchName = searchParams.get('branch');
        if (!branchName) {
          return NextResponse.json(
            { error: 'branch parameter is required' },
            { status: 400 }
          );
        }
        result = await github.getBranchInfo(branchName);
        break;

      case 'compare':
        const base = searchParams.get('base');
        const head = searchParams.get('head');
        if (!base || !head) {
          return NextResponse.json(
            { error: 'base and head parameters are required' },
            { status: 400 }
          );
        }
        result = await github.compareBranches(base, head);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Git API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred'
      },
      { status: 500 }
    );
  }
}
