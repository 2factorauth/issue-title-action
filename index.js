const core = require('@actions/core');
const github = require('@actions/github');
const {Octokit} = require('@octokit/core');

async function run() {
  const octokit = new Octokit({
    auth: core.getInput('token')
  })
  const labels = JSON.parse(core.getInput('labels'))
  let prefix = '';
  for (const label of labels) {
    switch (label.name) {
      case 'add site':
        prefix = 'Add';
        break;
      case 'update site':
        prefix = 'Update';
        break;
    }
  }
  const data = JSON.parse(core.getInput('data'))
  const site_name = data['site-name'].text
  return await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner: core.getInput('owner'),
    repo: core.getInput('repository'),
    issue_number: core.getInput('issue_number'),
    title: `${prefix} ${site_name}`,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

run().catch(error => core.setFailed(error.message));