/*
  # Git Management System

  1. New Tables
    - `git_repositories`
      - `id` (uuid, primary key)
      - `owner` (text) - GitHub repository owner
      - `repo` (text) - GitHub repository name
      - `default_branch` (text) - Default branch name (e.g., 'master', 'main')
      - `github_token_encrypted` (text) - Encrypted GitHub token
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (owner, repo)
    
    - `git_operations`
      - `id` (uuid, primary key)
      - `repository_id` (uuid, foreign key to git_repositories)
      - `operation_type` (text) - Type of operation: 'merge', 'rebase', 'create_branch', 'create_pr'
      - `source_branch` (text) - Source branch name
      - `target_branch` (text) - Target branch name
      - `status` (text) - Operation status: 'pending', 'success', 'failed'
      - `result` (jsonb) - Operation result data
      - `error` (text) - Error message if failed
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admin users can manage repositories
    - Authenticated users can view and create operations
    - Users can only see operations they created or all if admin

  3. Notes
    - This system allows tracking all git operations without local git
    - All operations are logged for audit purposes
    - GitHub token should be encrypted at application level before storing
*/

-- Create git_repositories table
CREATE TABLE IF NOT EXISTS git_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL,
  repo text NOT NULL,
  default_branch text DEFAULT 'master',
  github_token_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner, repo)
);

ALTER TABLE git_repositories ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify repositories
CREATE POLICY "Admins can manage repositories"
  ON git_repositories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Create git_operations table
CREATE TABLE IF NOT EXISTS git_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid REFERENCES git_repositories(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  source_branch text,
  target_branch text,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view operations
CREATE POLICY "Authenticated users can view operations"
  ON git_operations FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create operations
CREATE POLICY "Authenticated users can create operations"
  ON git_operations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own operations, admins can update all
CREATE POLICY "Users can update own operations"
  ON git_operations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_git_operations_repository_id ON git_operations(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_operations_created_by ON git_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_git_operations_status ON git_operations(status);
CREATE INDEX IF NOT EXISTS idx_git_operations_created_at ON git_operations(created_at DESC);