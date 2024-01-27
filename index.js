const core = require('@actions/core');
const github = require('@actions/github');
const {Octokit} = require('@octokit/core');

async function run() {
  const octokit = new Octokit({
    auth: process.env.GH_TOKEN
  })
  const labels = JSON.parse(core.getInput('labels'))
  let prefix = '';
  for (const label of labels) {
    switch (label['name']) {
      case 'add site':
        prefix = 'Add';
        break;
      case 'update site':
        prefix = 'Update';
        break;
    }
  }

  if (prefix === '') {
    console.log('No matching label. Exiting')
    return 0;
  }

  const data = JSON.parse(JSON.parse(core.getInput('data')))
  const site_name = data['site-name']?.text
  const repo = decodeURIComponent(core.getInput('repository'))
  return await octokit.request(`PATCH /repos/${repo}/issues/{issue_number}`, {
    issue_number: core.getInput('issue_number'),
    title: `${prefix} ${site_name}`,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

run().catch(error => {
  console.error(error);
  core.setFailed(error.message)
});