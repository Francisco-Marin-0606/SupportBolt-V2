const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;

async function checkBranches() {
  try {
    console.log('🔍 Consultando repositorio:', `${owner}/${repo}\n`);

    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100
    });

    console.log('📋 Ramas encontradas:\n');

    for (const branch of branches) {
      const { data: branchDetail } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: branch.name
      });

      console.log(`  🌿 ${branch.name}`);
      console.log(`     SHA: ${branch.commit.sha.substring(0, 7)}`);
      console.log(`     Último commit: ${branchDetail.commit.commit.message.split('\n')[0]}`);
      console.log(`     Autor: ${branchDetail.commit.commit.author.name}`);
      console.log(`     Fecha: ${new Date(branchDetail.commit.commit.author.date).toLocaleString()}`);
      console.log(`     Protegida: ${branch.protected ? '✅' : '❌'}`);
      console.log('');
    }

    const { data: repo_info } = await octokit.repos.get({
      owner,
      repo
    });

    console.log(`📌 Rama por defecto del repositorio: ${repo_info.default_branch}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBranches();
