import Octokat from "octokat";

export default class GitHubWriteback {
  constructor(user, repo, token, filename, root = "") {
    this.user = user;
    this.repo = repo;
    this.token = token;
    this.filename = filename;
    this.root = root;
  }

  async write(content, path) {
    const github = new Octokat({ token: this.token });
    const repo = await github.repos(this.user, this.repo);
    const main = await repo.git.refs(`heads/${this.branch || "master"}`).fetch();
    const blob = await repo.git.blobs.create({ content: btoa(content), encoding: "base64" });
    const destPath = `${this.root ? `${this.root}/` : ""}${path || this.filename}`;
    const tree = await repo.git.trees.create({
      tree: [{ path: destPath, sha: blob.sha, mode: "100644", type: "blob" }],
      base_tree: main.object.sha
    });
    const commit = await repo.git.commits.create({ message: `Update`, tree: tree.sha, parents: [main.object.sha] });
    console.log(commit);
    main.update({ sha: commit.sha });
  }
}
