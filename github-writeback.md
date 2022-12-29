# Using GitHub Writeback

*After* you've deployed your webspace to a static hosting provider (like [GitHub Pages](https://pages.github.com/)) pulling from a GitHub repo, you can automatically save your changes back while you edit it live, on the web, by plugging in GitHub credentials:

![image](https://user-images.githubusercontent.com/220020/209758238-e097a2f9-ddaf-44cf-beb0-33b05dcd0802.png)

The tricky part is creating the **GitHub Personal Access Token**. To get one:

- Click on your profile image in the top right on GitHub and go to **Settings**:

![image](https://user-images.githubusercontent.com/220020/209758352-c677c0cd-81a3-4187-a29b-31565c8594a1.png)

- Scroll all the way down and on the left click **Developer Settings**:

![image](https://user-images.githubusercontent.com/220020/209758413-19b732b6-7c9c-4e6b-a195-b928a2722c1a.png)

- Then choose **fine-grained tokens**:

![image](https://user-images.githubusercontent.com/220020/209758531-8b372422-f49e-4924-aed0-09d87e143af5.png)

- Now, proceed to select **only select repositories** and find your particular webspace repo. **Don't** add other repositories since they are unneeded, and it's better security practice to avoid unnecessary permissions.

![image](https://media.discordapp.net/attachments/723384793034784901/1057525527235285012/repo_access.png)

- We will now be selecting the required permission for the personal access token, which is, **Contents** : 

![image](https://media.discordapp.net/attachments/723384793034784901/1057529193627385926/contents.png)

- Then **generate new token**

![image](https://user-images.githubusercontent.com/220020/209758560-0335d355-7e1c-4551-9f71-7ecb62b4680c.png)

- Ta-da! You are now the owner of a very special Personal Access Token. Plug this into the webspaces dialog and changes to your world will start landing back into GitHub.

### Recap

Profile > Settings > Developer Settings > Fine-Grained Tokens(Beta) > Only Select Repo + add perms > Generate and Use!

