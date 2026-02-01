/* global globalThis */
(function () {
  async function request(url, method, pat, body) {
    const headers = {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('github request error', error)
      data = text;
    }
    console.info('github request result', res)
    if (!res.ok) {
      const err = new Error(res);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function testPAT(pat) {
    const me = await request('https://api.github.com/user', 'GET', pat);
    return !!me && !!me.login;
  }

  async function starRepo(owner, repo, pat) {
    await request(`https://api.github.com/user/starred/${owner}/${repo}`, 'PUT', pat);
    return true;
  }

  async function unstarRepo(owner, repo, pat) {
    await request(`https://api.github.com/user/starred/${owner}/${repo}`, 'DELETE', pat);
    return true;
  }

  async function createPrivateGist(pat, description, filesObj) {
    const body = {
      description: description || 'better-star data',
      public: false,
      files: filesObj,
    };
    const gist = await request('https://api.github.com/gists', 'POST', pat, body);
    return gist && gist.id;
  }

  async function getGist(pat, gistId) {
    const res = await request(`https://api.github.com/gists/${gistId}`, 'GET', pat);
    console.log('getGistRes', res)
    return res
  }

  async function patchGistFiles(pat, gistId, filesObj) {
    const body = { files: filesObj };
    const gist = await request(`https://api.github.com/gists/${gistId}`, 'PATCH', pat, body);
    return gist;
  }

  async function readGistFileContent(pat, gistId, fileName) {
    const gist = await getGist(pat, gistId);
    const file = gist && gist.files && gist.files[fileName];
    if (!file) return null;
    const url = file.raw_url;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  }

  const api = {
    request,
    testPAT,
    starRepo,
    unstarRepo,
    createPrivateGist,
    getGist,
    patchGistFiles,
    readGistFileContent,
  };

  globalThis.BetterStar = globalThis.BetterStar || {};
  globalThis.BetterStar.github = api;
})();
