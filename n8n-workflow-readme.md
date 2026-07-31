# Commit Multiple Files to GitHub — n8n Workflow Setup Guide

An end-to-end guide to building an n8n workflow that takes a natural-language chat
request, uses an AI agent to generate **one or more** source files, and commits each
of them to a GitHub repository (creating new files or updating existing ones).

---

## 1. What this workflow does

```
Chat message ──▶ AI Agent (+ OpenAI model + Output Parser)
             ──▶ Resolve Repo Target (Set)
             ──▶ Has Repo Target? (IF)
                   ├─ true  ──▶ Split Files ──▶ Check File Exists (GitHub: get)
                   │                                 ├─ exists  ──▶ Update a file (GitHub: edit)
                   │                                 └─ missing ──▶ Create a file (GitHub: create)
                   └─ false ──▶ Missing Repo Message (Set)
```

**Flow summary**

1. You send a chat message such as *"Create a Flask hello-world app with `app.py`
   and `requirements.txt`. Push to repo `my-app`, owner `devopsguy94`, branch `main`."*
2. The **AI Agent** writes the code and extracts the repo target, returning a
   structured object with a `files` array.
3. **Resolve Repo Target** fills in defaults (owner/repo/branch) when you didn't
   specify them.
4. **Has Repo Target?** checks a repository is known. If not, it returns a helpful
   message instead of failing.
5. **Split Files** turns the `files` array into one item per file.
6. For each file, **Check File Exists** looks it up in the repo:
   - If it exists → **Update a file**.
   - If it doesn't (GitHub returns an error) → **Create a file**.

---

## 2. Prerequisites

Before building, make sure you have:

- An **n8n instance** (Cloud or self-hosted) you can log into.
- A **GitHub account** and a repository you want to push to.
- A **GitHub Personal Access Token** (see step 3).
- An **OpenAI API key** (or use n8n's built-in AI credits if available on your plan).

---

## 3. Create the credentials

### 3a. GitHub credential

1. In GitHub, go to **Settings → Developer settings → Personal access tokens**.
   - **Fine-grained token** (recommended): give it access to the target
     repository with **Contents: Read and write** permission.
   - Or a **classic token** with the `repo` scope.
2. Copy the token (you will not see it again).
3. In n8n, open **Credentials → New → GitHub API**.
4. Set:
   - **Access Token**: paste the token.
   - **Server**: `https://api.github.com` (default; change only for GitHub Enterprise).
5. Save. Name it something like `GitHub account`.

### 3b. OpenAI credential

1. Get an API key from <https://platform.openai.com/api-keys>.
2. In n8n, open **Credentials → New → OpenAI API**.
3. Paste the key and save (e.g. `OpenAI account`).

> If your n8n plan includes AI credits, you can select those instead of your own
> OpenAI key when configuring the chat model node.

---

## 4. Build the workflow node by node

Create a new workflow, then add the following nodes.

### Node 1 — When chat message received (Chat Trigger)

- **Node type:** `@n8n/n8n-nodes-langchain.chatTrigger`
- Leave options at defaults. This is a **private** chat trigger, so you test it
  with the **Open chat** button on the canvas (no public URL needed).

### Node 2 — OpenAI Chat Model (sub-node)

- **Node type:** `@n8n/n8n-nodes-langchain.lmChatOpenAi`
- **Model:** `gpt-5-mini` (or another available chat model).
- **Credential:** the OpenAI credential from step 3b.
- This attaches to the AI Agent as its language model.

### Node 3 — Code Output Parser (sub-node)

- **Node type:** `@n8n/n8n-nodes-langchain.outputParserStructured`
- **Schema type:** Manual.
- **Input schema** (this is what makes multi-file support work):

```json
{
  "type": "object",
  "properties": {
    "owner": { "type": "string", "description": "GitHub owner/org. Empty string if not provided." },
    "repository": { "type": "string", "description": "Repo name. Empty string if not provided." },
    "branch": { "type": "string", "description": "Branch to commit to. Empty = default branch." },
    "commitMessage": { "type": "string", "description": "Concise commit message for all files." },
    "files": {
      "type": "array",
      "description": "One entry per file to commit.",
      "items": {
        "type": "object",
        "properties": {
          "filePath": { "type": "string", "description": "Full path incl. filename and extension." },
          "fileContent": { "type": "string", "description": "The full raw source code of this file." }
        },
        "required": ["filePath", "fileContent"]
      }
    }
  },
  "required": ["owner", "repository", "branch", "commitMessage", "files"]
}
```

### Node 4 — AI Agent

- **Node type:** `@n8n/n8n-nodes-langchain.agent`
- **Enable** "Require Specific Output Format" (`hasOutputParser`).
- **System message:**

```
You are a coding assistant. When the user asks for code, write the complete,
working source file(s). A single request may involve MULTIPLE files (e.g. an app
plus its config, or several modules) — produce one entry per file. The user will
also tell you the GitHub repository name and branch (and possibly the owner/org)
to push the code to. Extract those values. Return: owner (org/user, empty string
if not given), repository (repo name, empty string if not given), branch (empty
string if not specified), a single concise commitMessage describing the change
across all files, and files: an array where each entry has filePath (full path
incl. filename and extension) and fileContent (the complete raw code). Put ONLY
the raw code in each fileContent — no markdown fences or explanation.
```

- **Attach sub-nodes:** the OpenAI Chat Model (model) and the Code Output Parser
  (output parser).

### Node 5 — Resolve Repo Target (Set)

- **Node type:** `n8n-nodes-base.set`
- **Keep other fields:** on (`includeOtherFields: true`).
- Add these string/array assignments:

| Field         | Type   | Value (expression) |
|---------------|--------|--------------------|
| `eff_owner`   | string | `{{ $json.output.owner \|\| $vars.DEFAULT_OWNER \|\| 'devopsguy94' }}` |
| `eff_repo`    | string | `{{ $json.output.repository \|\| $vars.DEFAULT_REPO }}` |
| `eff_branch`  | string | `{{ $json.output.branch \|\| $vars.DEFAULT_BRANCH \|\| '' }}` |
| `eff_commit`  | string | `{{ $json.output.commitMessage }}` |
| `eff_files`   | array  | `{{ $json.output.files }}` |

> Optional: define `DEFAULT_OWNER`, `DEFAULT_REPO`, `DEFAULT_BRANCH` in
> **workflow variables** so you don't have to repeat them in every chat message.

### Node 6 — Has Repo Target? (IF)

- **Node type:** `n8n-nodes-base.if`
- **Condition:** `{{ $json.eff_repo }}` **is not empty** (string).
- **True** output → Split Files.
- **False** output → Missing Repo Message.

### Node 7 — Split Files (Split Out)

- **Node type:** `n8n-nodes-base.splitOut`
- **Field to split out:** `eff_files`
- **Include:** `All other fields` (so owner/repo/branch/commit travel with each file item).

This converts the `files` array into one item per file. After this node, each
item exposes the current file at `$json.eff_files.filePath` and
`$json.eff_files.fileContent`.

### Node 8 — Check File Exists (GitHub)

- **Node type:** `n8n-nodes-base.github`
- **Resource:** File · **Operation:** Get
- **Owner:** `{{ $json.eff_owner }}` (name mode)
- **Repository:** `{{ $json.eff_repo }}` (name mode)
- **File Path:** `{{ $json.eff_files.filePath }}`
- **As Binary Property:** off
- **Additional Parameters → Reference:** `{{ $json.eff_branch }}`
- **Settings → On Error:** **Continue (using error output)**.
  - The **success** output means the file exists → wire to **Update a file**.
  - The **error** output means the file is missing → wire to **Create a file**.
- **Credential:** the GitHub credential from step 3a.

### Node 9 — Update a file (GitHub)

- **Node type:** `n8n-nodes-base.github`
- **Resource:** File · **Operation:** Edit
- **Owner:** `{{ $('Split Files').item.json.eff_owner }}`
- **Repository:** `{{ $('Split Files').item.json.eff_repo }}`
- **File Path:** `{{ $('Split Files').item.json.eff_files.filePath }}`
- **File Content:** `{{ $('Split Files').item.json.eff_files.fileContent }}`
- **Commit Message:** `{{ $('Split Files').item.json.eff_commit }}`
- **Additional Parameters → Branch:** `{{ $('Split Files').item.json.eff_branch }}`
- **Credential:** the GitHub credential.

### Node 10 — Create a file (GitHub)

- Same as Update a file but **Operation:** Create.
- All field values are identical to Node 9 (they reference `Split Files`).

> Both GitHub write nodes read from `$('Split Files')` instead of `$json` so the
> per-file values stay correct after the IF/error branch split.

### Node 11 — Missing Repo Message (Set)

- **Node type:** `n8n-nodes-base.set`
- One string field `message`:

```
I generated the code but couldn't push it: no GitHub repository was specified.
Please include the repository (and owner/org) in your request, e.g. "...push
these files to repo my-app owner my-org on branch main", or set DEFAULT_OWNER /
DEFAULT_REPO in workflow variables.
```

---

## 5. Wire the connections

```
When chat message received → AI Agent → Resolve Repo Target → Has Repo Target?
Has Repo Target? [true]  → Split Files → Check File Exists
Check File Exists [success/main] → Update a file
Check File Exists [error]        → Create a file
Has Repo Target? [false] → Missing Repo Message
OpenAI Chat Model  ⇒ AI Agent (ai_languageModel)
Code Output Parser ⇒ AI Agent (ai_outputParser)
```

---

## 6. Test the workflow

1. Click **Open chat** on the canvas (the trigger is private, so there's no URL).
2. Send a request that names multiple files and a repo, for example:

   > Create a simple Python Flask hello world app with two files: `app.py` and
   > `requirements.txt`. Push to repo `my-app` owner `devopsguy94` on branch `main`.

3. Watch the execution:
   - **Split Files** should show 2 items.
   - Each file should route to **Create a file** (new) or **Update a file** (existing).
4. Check your GitHub repo — both files should be committed on the target branch.

**Tip:** Test the "no repo" path too by omitting the repository — you should get
the Missing Repo Message instead of an error.

---

## 7. Notes & troubleshooting

- **Empty `files` array:** if the AI returns no files, Split Files emits nothing
  and no commit happens. Rephrase the request to clearly ask for file(s).
- **Wrong branch / 404 on Check File Exists:** confirm the branch exists and the
  token has access to the repo.
- **All files show as "create" even when they exist:** verify the GitHub node's
  **On Error → Continue (using error output)** setting and that Update is wired to
  the success output, Create to the error output.
- **Rate limits / large files:** GitHub's Contents API commits one file per call;
  this workflow makes one create/update call per file.
- **Defaults:** set `DEFAULT_OWNER`, `DEFAULT_REPO`, `DEFAULT_BRANCH` in workflow
  variables to avoid repeating them in every message.

---

## 8. Going live

- **Publish** the workflow when you're happy with testing.
- Optionally add an **error workflow** (per-workflow setting) to get notified if a
  run fails.
```

This is provided as a build/setup reference. The private Chat Trigger has no public URL — end users interact via **Open chat** on the canvas.
