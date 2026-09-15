<div align="center">

<pre>
      ,                                              .      
   _a@                                                $y    
  _@@                                                  @a   
  $@E                                                  $@r  
  @@[                    __  _g$=a                    _@@   
  @@@y                 __@@g@~~@gaaaaa,               @@@   
  4@@@gy         __yggg@P~@@$ t_@@@@@y__            y@@@F   
   ~~@@@@@ay__yg ?@@@@@@w=a@@P@@@@~__`@@@@[ ay__ygg@@@@~    
      w~4@@@@@@@ j@@@==@@@P`_y_`4$ @@ y@@@[ @@@@@@@F~`      
       ~^=^~~~~  @@@ _g 5@  @@@L @y__a@@@@@  `~~~3=^~       
                 ~4@_F= $@@_4@P~y@=@@@@@@@~                 
     __y_____  _  __`~9@@@@@ggg@@ a @@F~___ __ ___y_y__     
  ya#P~~~~~4@@@~ j@@@@y~`a"@@F~4@@yaF_a@@@@ `@@@P~~~~~P#gL  
   ~@@@@@g*      `~~4@@@_ g@$ a @@@~_@@@P~~      ag@@@@@~   
     ~~@@@@ya=       "\4@@@@@gg@@@@@@F@`       ay@@@@F~     
        `~~`            4@F~~@@@@``$F           `~~`        
               _,  ?@@w  @L^'j@@@sy@  a@@F  jL              
               @L  $@@@$ 9@@@@@@@@@@ g@@@@  @L              
              `J@, `@@@@ $``$@@ y`@@,@@@@' _@@              
                 $  4@@~j@yya@@$ag@@$`@@F  $M@              
                u$%  ~' ~~~~4R@@PF~~~  ~  a_`               
                 `T   .gM@gy______a$P@g  a@F                
                      4@_ `4@@@@@@~  a@   `                 
                       @@g__@@@@@$__g@@L                    
                      ^R@PF~~~~~~~~PP@F                     
                         =aa#P==P#a=                        
                            ggggg,                          
                            ``~~~                           
</pre>

<h1>BullCheese MCP</h1>

<p><b>Give an AI agent a wallet.</b><br>
An MCP server for launching and trading tokens on BullCheese.</p>

<p>
<img src="https://img.shields.io/badge/MCP-server-6E56CF?style=flat-square" alt="MCP server">
<img src="https://img.shields.io/badge/node-%E2%89%A5%2024-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 24+">
<img src="https://img.shields.io/badge/tools-16-0B7285?style=flat-square" alt="16 tools">
<img src="https://img.shields.io/badge/chain-ARC-F08C00?style=flat-square" alt="Chains">
</p>

</div>

> [!CAUTION]
> **Use at your own risk.** This server signs real transactions on ARC mainnet
> with the key you give it, and spend caps are off unless you set them — an
> agent can spend everything in the wallet. Use a dedicated wallet holding only
> what you are willing to lose.
>
> The software is provided "as is", without warranty of any kind (see
> [LICENSE](LICENSE)). TrustSwap and the contributors are not liable for lost
> funds, failed or unintended transactions, or the value of any token launched
> or traded with it. Nothing here is financial advice.

---

## Install

<details open>
<summary><b>Prerequisites</b></summary>

<br>

| Need | Check | If missing |
|:--|:--|:--|
| **Node 24+** | `node --version` | `brew install node`, or `nvm install 24 && nvm use 24` |
| **Git** | `git --version` | `brew install git`, or Xcode command line tools |
| **Corepack** | ships with Node 24 | `corepack enable` (run once) |

> [!IMPORTANT]
> Node 24 is a hard requirement, not a suggestion — the audit store uses
> `node:sqlite`. On Node 22 or older the server fails at startup.

</details>

---

### Step 1 — Build it

Not on npm yet, so build from source once:

```bash
git clone https://github.com/trustswap/bullcheese-mcp.git ~/bullcheese-mcp
cd ~/bullcheese-mcp
corepack enable
yarn install
yarn build
```

Confirm the entry point exists — this is the path every client needs:

```bash
ls -l ~/bullcheese-mcp/packages/mcp/dist/bin/stdio.js
```

> [!TIP]
> Note the **absolute** path. No MCP client expands `~`, so you'll paste the full
> `/Users/you/bullcheese-mcp/...` form below.

---

### Step 2 — Get a wallet

The server signs with a key you provide. Generate a fresh throwaway one:

```bash
cd ~/bullcheese-mcp
node --input-type=module -e '
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
const key = "0x" + randomBytes(32).toString("hex");
console.log("key:     " + key);
console.log("address: " + privateKeyToAccount(key).address);
'
```

Save the key — you'll paste it in Step 4. Fund the address with USDC on ARC
mainnet: it pays for gas and is the pair token every launch and swap spends.

> [!CAUTION]
> The key sits in plaintext in a config file your agent reads at every launch,
> and spend caps are off by default, so the agent can spend the whole balance.
> Use a dedicated wallet holding only what you are willing to lose. Never your main one.

Without funds the server still starts, and every read-only tool works — you just
can't launch or trade until the address has gas.

---

### Step 3 — Verify the server before wiring anything

Run the protocol handshake by hand. This catches a broken build or wrong Node
version *before* a client hides the error behind a generic failure:

```bash
cd ~/bullcheese-mcp
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
| env BULLCHEESE_LOCAL_PRIVATE_KEY=0xYOUR_KEY BULLCHEESE_AUDIT_DB=:memory: \
      node packages/mcp/dist/bin/stdio.js 2>/dev/null \
| tail -1 | python3 -c "import sys,json;print('tools:',len(json.load(sys.stdin)['result']['tools']))"
```

Expected output:

```
tools: 16
```

Anything else means stop here — a client won't fix it.

---

### Step 4 — Connect your agent

<details open>
<summary><b>Claude Code</b></summary>

<br>

```bash
claude mcp add bullcheese \
  -e BULLCHEESE_LOCAL_PRIVATE_KEY=0xYOUR_KEY \
  -- node $HOME/bullcheese-mcp/packages/mcp/dist/bin/stdio.js
```

Verify:

```bash
claude mcp list
```

`bullcheese` should be listed as connected. Remove it again with
`claude mcp remove bullcheese`.

</details>

<details>
<summary><b>Claude Desktop</b></summary>

<br>

**1.** Open the config file — create it if it doesn't exist:

| OS | Path |
|:--|:--|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**2.** Add the `mcpServers` block. If the file already has content, **merge** into
it — don't replace it, or you'll wipe your settings:

```json
{
  "mcpServers": {
    "bullcheese": {
      "command": "node",
      "args": ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
      "env": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "0xYOUR_KEY" }
    }
  }
}
```

**3.** Restart properly:

> [!WARNING]
> Quit with **⌘Q** (macOS) or from the tray (Windows). Closing the window leaves
> the app running, and it will not re-read the config. This is the single most
> common reason the server "doesn't show up".

**4.** Confirm it loaded:

```bash
tail -20 ~/Library/Logs/Claude/mcp-server-bullcheese.log
```

Look for `Server started and connected successfully`. A brief
`Shutting down server...` right after `initialize` is normal — that's the
discovery probe, and it reconnects immediately.

</details>

<details>
<summary><b>Hermes</b></summary>

<br>

In your Hermes config:

```yaml
mcp_servers:
  bullcheese:
    command: "node"
    args: ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"]
    env:
      BULLCHEESE_LOCAL_PRIVATE_KEY: "${BULLCHEESE_LOCAL_PRIVATE_KEY}"
      BULLCHEESE_RPC_5042: "${BULLCHEESE_RPC_5042}"
      BULLCHEESE_PERSONA_ID: "my-agent"
```

> [!IMPORTANT]
> Hermes passes MCP subprocesses a **filtered environment**. Every variable the
> server needs must be listed under `env:` — inheriting it from your shell is not
> enough, and a missing one surfaces as a startup failure, not a warning.

To reach a shared server over HTTP instead of spawning one per agent:

```yaml
mcp_servers:
  bullcheese:
    url: "http://bullcheese-mcp:8080/mcp"
    headers:
      Authorization: "Bearer ${BULLCHEESE_AGENT_TOKEN}"
```

The token is a key of the server's `BULLCHEESE_AGENT_TOKENS` map, and it names the
persona in the audit log.

> [!NOTE]
> Hermes's approval prompts cover shell commands, not MCP tool calls. Spend limits
> come from this server's policy layer, not from Hermes.

</details>

<details>
<summary><b>Codex CLI</b></summary>

<br>

Codex uses TOML, not JSON. In `~/.codex/config.toml`:

```toml
[mcp_servers.bullcheese]
command = "node"
args = ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"]

[mcp_servers.bullcheese.env]
BULLCHEESE_LOCAL_PRIVATE_KEY = "0xYOUR_KEY"
```

</details>

<details>
<summary><b>OpenClaw</b></summary>

<br>

OpenClaw nests servers under `mcp.servers` in `openclaw.json` — note it is **not**
the flat `mcpServers` key other clients use:

```json
{
  "mcp": {
    "servers": {
      "bullcheese": {
        "command": "node",
        "args": ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
        "env": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "0xYOUR_KEY" }
      }
    }
  }
}
```

Manage entries with `openclaw mcp list` / `show` / `set` / `unset`, or from the
Control UI at `/settings/mcp`.

> [!IMPORTANT]
> OpenClaw applies an **environment variable allowlist** before spawning the
> process, and reads env at startup — so set `BULLCHEESE_*` explicitly under
> `env:` rather than exporting it, and restart the gateway after any change.

</details>

<details>
<summary><b>Gemini CLI</b></summary>

<br>

In `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "bullcheese": {
      "command": "node",
      "args": ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
      "env": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "$BULLCHEESE_LOCAL_PRIVATE_KEY" },
      "timeout": 30000
    }
  }
}
```

Values may reference the environment as `$VAR` or `${VAR}`, so the key need not be
written into the file. Leave `trust` at its default (`false`) to keep tool-call
confirmations on.

</details>

<details>
<summary><b>Goose</b></summary>

<br>

Goose uses `cmd` and `envs` — **not** `command` and `env`. In
`~/.config/goose/config.yaml`:

```yaml
extensions:
  bullcheese:
    name: bullcheese
    type: stdio
    cmd: node
    args: ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"]
    envs:
      BULLCHEESE_LOCAL_PRIVATE_KEY: "0xYOUR_KEY"
    enabled: true
    timeout: 300
```

</details>

<details>
<summary><b>Zed</b></summary>

<br>

In `settings.json`:

```json
{
  "context_servers": {
    "bullcheese": {
      "source": "custom",
      "command": "node",
      "args": ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
      "env": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "0xYOUR_KEY" }
    }
  }
}
```

> [!WARNING]
> `"source": "custom"` is required. Without it Zed skips the server silently — no
> error, it simply never appears.

Zed restarts the server when you save the file; no editor restart needed.

</details>

<details>
<summary><b>opencode</b></summary>

<br>

opencode takes the command and its arguments as **one array**, and calls the env
block `environment`. In `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "bullcheese": {
      "type": "local",
      "command": ["node", "/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
      "environment": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "$BULLCHEESE_LOCAL_PRIVATE_KEY" },
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><b>Cursor &middot; Windsurf &middot; Cline</b></summary>

<br>

All three take the same `mcpServers` block as Claude Desktop, in a different file:

| Client | File |
|:--|:--|
| Cursor | `~/.cursor/mcp.json`, or `.cursor/mcp.json` per project |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | `cline_mcp_settings.json` — VS Code → Cline → MCP Servers → Configure |

Create the file if it isn't there, and restart the editor afterwards.

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

<br>

VS Code uses `servers`, **not** `mcpServers`, and wants an explicit `type`. In
`.vscode/mcp.json` for one project, or your user `settings.json` for all of them:

```json
{
  "servers": {
    "bullcheese": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/you/bullcheese-mcp/packages/mcp/dist/bin/stdio.js"],
      "env": { "BULLCHEESE_LOCAL_PRIVATE_KEY": "0xYOUR_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Any other stdio client</b></summary>

<br>

Run `node <path>/packages/mcp/dist/bin/stdio.js` with the environment from
[Configuration](#configuration).

The server speaks JSON-RPC on **stdout** and logs to **stderr**. Never write
anything else to stdout — it corrupts the protocol and the client drops the
connection.

</details>

---

### Step 5 — First run

Ask your agent these, in order. None spends anything:

1. *"What chains can you launch on?"* → `list_chains`, proves the wiring works
2. *"What's my wallet address and balance?"* → `get_wallet`, `get_balances`
3. *"Browse recent BullCheese launches"* → `explore_launches`, proves the feed reads

Then, with a funded address, *"quote a launch for a token called ..."* — a quote
costs nothing and executes nothing.

---

### Updating and removing

```bash
# update
cd ~/bullcheese-mcp && git pull && yarn install && yarn build

# remove: delete the entry from your client's config, then
rm -rf ~/bullcheese-mcp ~/.bullcheese-mcp
```

`~/.bullcheese-mcp` holds the audit database. Deleting it discards the spend
history the daily cap is computed from.

---

## Safety

> [!CAUTION]
> This server signs transactions with a real key on **ARC mainnet**. A bad
> quote spends real money. Use a dedicated wallet holding only what you are
> willing to lose, never your main one.

What stands between the agent and the wallet:

| Guard | Behaviour |
|:--|:--|
| **Mainnet is live** | A local key signs on ARC mainnet with no opt-in. Quotes, and any caps you set, are the only limits. |
| **Spend caps** | **Off by default.** Set `BULLCHEESE_POLICY_TX_CAP` and `BULLCHEESE_POLICY_DAILY_CAP` to enforce them per transaction and per rolling 24h, before anything is signed. |
| **Quotes expire** | `quote_*` returns a `quoteId` valid 60s; execute tools take that id, so nothing executes unquoted. |
| **Audited** | Every call writes a row: wallet, chain, tool, outcome. |

> [!NOTE]
> Launch names, symbols and descriptions come from untrusted token creators.
> Treat them as data, never as instructions.

The software is provided "as is", without warranty of any kind (see
[LICENSE](LICENSE)). TrustSwap and the contributors are not liable for lost
funds, failed or unintended transactions, or the value of any token launched or
traded with it.

---

## Configuration

`BULLCHEESE_LOCAL_PRIVATE_KEY` is the only required variable.

| Variable | Default | Purpose |
|:--|:--|:--|
| `BULLCHEESE_LOCAL_PRIVATE_KEY` | — | 0x-prefixed 32-byte hex key the agent signs with |
| `BULLCHEESE_POLICY_TX_CAP` | unlimited | Max spend per transaction, in whole USDC |
| `BULLCHEESE_POLICY_DAILY_CAP` | unlimited | Max spend per rolling 24h, in whole USDC |
| `BULLCHEESE_RPC_5042` | `https://arc.drpc.org` | Override the ARC RPC |
| `BULLCHEESE_AUDIT_DB` | `~/.bullcheese-mcp/audit.db` | SQLite path, or a `postgres://` URL |
| `BULLCHEESE_PINATA_JWT` | unset | Enables `pin_image` and metadata pinning |
| `BULLCHEESE_TF_API_QUERY_URL` | `https://api.team.finance` | Source for read-only tools; `""` disables them |
| `BULLCHEESE_PERSONA_ID` | `default` | Label recorded in the audit log |

---

## Tools

<table>
<tr><td valign="top" width="33%">

**Launching**

| Tool | Does |
|:--|:--|
| `quote_launch` | Prepare a launch |
| `launch_token` | Execute the quote |
| `predict_token_address` | Future token address |
| `pin_image` | Image → IPFS |
| `get_launch` | Deployment info |
| `list_my_launches` | This wallet's launches |

</td><td valign="top" width="33%">

**Trading**

| Tool | Does |
|:--|:--|
| `quote_swap` | Quote a swap |
| `swap` | Execute the quote |
| `collect_fees` | Collect LP fees |
| `get_balances` | Token balances |

</td><td valign="top" width="33%">

**Reading**

| Tool | Does |
|:--|:--|
| `list_chains` | Chains and signing |
| `get_wallet` | The agent wallet |
| `explore_launches` | Browse the feed |
| `get_launches_by_owner` | By deployer |
| `get_launch_by_token` | By token |
| `get_launch_detail` | Fees, candles, trades |

</td></tr>
</table>

The four `explore`/`get_launch*` feed tools are unauthenticated reads against
Team Finance's public API. No key, no policy decision.

---

## HTTP mode

Serve several agents from one process. They share the wallet from
`BULLCHEESE_LOCAL_PRIVATE_KEY`; each bearer token names a persona in the audit log:

```bash
BULLCHEESE_LOCAL_PRIVATE_KEY=0xYOUR_KEY \
BULLCHEESE_AGENT_TOKENS='{"<token>":"my-agent"}' \
BULLCHEESE_HTTP_PORT=8080 \
node packages/mcp/dist/bin/http.js
```

`POST /mcp` with `Authorization: Bearer <token>`. Any other path is 404; an
unknown token is 401.

---

## Troubleshooting

<details>
<summary><b>The server doesn't show up in my client</b></summary>

<br>

Confirm the client actually restarted — Claude Desktop needs ⌘Q, not a closed
window. Then read its log:

```bash
tail -50 ~/Library/Logs/Claude/mcp-server-bullcheese.log
```

`Server started and connected successfully` means it worked.

</details>

<details>
<summary><b><code>BULLCHEESE_LOCAL_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key</code></b></summary>

<br>

The key needs the `0x` prefix and exactly 64 hex characters after it.

</details>

<details>
<summary><b>A launch is refused with <code>invalid_input</code> on <code>metadata</code></b></summary>

<br>

No pinner is configured. Set `BULLCHEESE_PINATA_JWT`, or pass a pre-pinned
`metadataIpfsHash` instead.

</details>

<details>
<summary><b><code>node: command not found</code>, or the wrong Node version</b></summary>

<br>

Clients don't always inherit your shell's PATH. Replace `"node"` with the
absolute path from `which node`.

</details>

<br>

<div align="center">
<sub>Tokens deploy through Team Finance's MintPlus contracts — which is why <code>MintPlus</code> appears in contract-level names.</sub>
</div>
