const core = require('@actions/core');
const {Octokit} = require('@octokit/core');
const {JSDOM} = require('jsdom');

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
  const issue = core.getInput('issue_number')
  const domain = data['site-url']?.text.replace(/[<>]/g, '');

  // Check if adult website
  if (await checkRating(domain)) {

    await comment(repo, issue, core.getInput('adult_reply'))

    await closeIssue(repo, issue)
  }

  // Check if above 200K
  if (core.getInput('similarweb_key'))
    if (await checkRank(domain) > 200_000) {
    await comment(repo, issue, core.getInput('rank_reply'))
    await closeIssue(repo, issue)
  }

  return await octokit.request(`PATCH /repos/${repo}/issues/{issue_number}`, {
    issue_number: core.getInput('issue_number'), title: `${prefix} ${site_name}`, headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

async function closeIssue(repo, issue) {
  return await octokit.request(`PATCH /repos/{repo}/issues/{issue_number}`, {
    issue_number: issue, repo: repo, headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

/**
 * Post a comment to the issue
 * @param repo
 * @param issue
 * @param text
 * @returns {Promise<void>}
 */
async function comment(repo, issue, text) {
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: '2factorauth', repo: repo, issue_number: issue, body: text, headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

/**
 * Check if a URL responds with adult content.
 * @param url URL to check.
 * @returns {Promise<boolean>} returns true on adult content.
 */
async function checkRating(url) {
  const res = await fetch(url)

  // Silently fail if url is unreachable
  if(res.status !== 200) return false;

  const html = await res.text();
  const dom = new JSDOM(html);
  const {document} = dom.window;

  const ratingMetaTags = document.querySelectorAll('meta[name="rating"]');

  if (ratingMetaTags.length > 0) {
    const ratings = Array.from(ratingMetaTags).map(tag => tag.getAttribute('content'));
    return ratings.some(rating => ['adult', 'mature', 'RTA-5042-1996-1400-1577-RTA'].includes(rating));
  }
  return false
}

run().catch(error => {
  console.error(error);
  core.setFailed(error.message)
});

/**
 * Fetch the SimilarWeb global ranking of a domain.
 * @param domain domain to fetch rank for
 * @returns {Promise<number>} Returns the SimilarWeb rank
 */
async function checkRank(domain) {
  const res = await fetch(`https://api.similarweb.com/v1/similar-rank/${domain}/rank?api_key=${api_key}`)

  // Return rank 999,999 on failure
  if (res.status !== 200) return 999_999;

  const data = await res.json();
  return data['similar_rank']['rank']
}
