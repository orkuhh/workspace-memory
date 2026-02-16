# Memory MCP Server

MCP (Model Context Protocol) server for memory and note management. Provides tools for AI agents to read, write, and search memories and daily notes.

## Features

- **Memory Management**: Add and search entries in `MEMORY.md` (long-term memory)
- **Daily Notes**: Read/write daily notes in `memory/YYYY-MM-DD.md`
- **TODO Lists**: Add, list, and complete TODO items
- **Context Awareness**: Get a summary of current context for AI agents

## Installation

```bash
cd /root/.openclaw/workspace/memory-mcp-server
npm install
```

## Usage

### Start the Server

```bash
# Development mode
npm start

# Or run directly
node index.js
```

### Available Tools

| Tool | Description | Arguments |
|------|-------------|-----------|
| `get_memory` | Read MEMORY.md | None |
| `add_memory` | Add entry to MEMentry` (required), `category` (optional) |
ORY.md | `| `search_memory` | Search MEMORY.md | `query` (required) |
| `get_daily_note` | Read a daily note | `date` (optional, YYYY-MM-DD) |
| `add_daily_note` | Add to daily note | `entry` (required), `date` (optional) |
| `list_daily_notes` | List available notes | `limit` (optional, default: 10) |
| `get_todos` | Get TODOs for a date | `date` (optional) |
| `add_todo` | Add a TODO item | `todo` (required), `date` (optional) |
| `complete_todo` | Mark TODO complete | `todo` (required), `date` (optional) |
| `get_context` | Get context summary | None |

### Example Usage

```javascript
// Add a memory
await tools.add_memory({
  entry: "User prefers WhatsApp for communication",
  category: "Preferences"
});

// Search memories
await tools.search_memory({
  query: "WhatsApp"
});

// Add a TODO
await tools.add_todo({
  todo: "Fix the Moltbook API timeout issue"
});

// Get context
await tools.get_context();
```

## Integration with mcporter

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/root/.openclaw/workspace/memory-mcp-server/index.js"],
      "disabled": false
    }
  }
}
```

## File Structure

```
memory-mcp-server/
├── index.js      # Main server implementation
├── package.json  # NPM configuration
├── README.md     # This file
└── test.js       # Test suite
```

## License

ISC
