#!/usr/bin/env node
/**
 * Memory MCP Server
 * 
 * Provides memory and note management capabilities via MCP:
 * - Add/search memories in MEMORY.md
 * - Daily notes (memory/YYYY-MM-DD.md)
 * - TODO list management
 * - Context awareness for AI agents
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  workspace: '/root/.openclaw/workspace',
  memoryFile: '/root/.openclaw/workspace/MEMORY.md',
  memoryDir: '/root/.openclaw/workspace/memory',
  dailyNotePattern: /^\d{4}-\d{2}-\d{2}\.md$/,
  todoMarker: '[ ]',
  doneMarker: '[x]'
};

// Get today's date string
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date string
function yesterdayStr() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Read file safely, return null if doesn't exist
 */
function readFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Write file safely
 */
function writeFile(filePath, content) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Read MEMORY.md (long-term memory)
 */
function getMemory() {
  return readFile(CONFIG.memoryFile) || '';
}

/**
 * Add entry to MEMORY.md
 */
function addMemory(entry, category = 'General') {
  const content = getMemory();
  const timestamp = new Date().toISOString();
  const newEntry = `\n## ${category}\n- **${timestamp}**: ${entry}`;
  
  // Find insertion point (after last category header or at top)
  const newContent = content + newEntry;
  const result = writeFile(CONFIG.memoryFile, newContent);
  
  return {
    success: result.success,
    entry: entry,
    category: category,
    timestamp: timestamp
  };
}

/**
 * Search memory content
 */
function searchMemory(query) {
  const content = getMemory().toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (!query) {
    return { results: [], message: 'No query provided' };
  }

  // Simple search - find lines containing query
  const lines = getMemory().split('\n');
  const matches = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.toLowerCase().includes(queryLower))
    .map(({ line }) => line.trim())
    .filter(line => line.length > 0);

  return {
    query: query,
    count: matches.length,
    results: matches.slice(0, 20) // Limit to 20 results
  };
}

/**
 * Get daily note for specific date
 */
function getDailyNote(dateStr = todayStr()) {
  const filePath = path.join(CONFIG.memoryDir, `${dateStr}.md`);
  const content = readFile(filePath);
  
  if (!content) {
    return { exists: false, date: dateStr, content: null };
  }
  
  return { exists: true, date: dateStr, content: content };
}

/**
 * Add entry to daily note
 */
function addDailyNote(entry, dateStr = todayStr()) {
  const filePath = path.join(CONFIG.memoryDir, `${dateStr}.md`);
  let content = readFile(filePath) || '';
  
  // Add timestamped entry
  const timestamp = new Date().toISOString();
  const newEntry = `- **${timestamp}**: ${entry}\n`;
  content += newEntry;
  
  const result = writeFile(filePath, content);
  
  return {
    success: result.success,
    date: dateStr,
    entry: entry,
    timestamp: timestamp
  };
}

/**
 * List available daily notes
 */
function listDailyNotes(limit = 10) {
  try {
    const files = fs.readdirSync(CONFIG.memoryDir);
    const notes = files
      .filter(f => CONFIG.dailyNotePattern.test(f))
      .sort((a, b) => b.localeCompare(a)) // Newest first
      .slice(0, limit)
      .map(f => f.replace('.md', ''));
    
    return { notes, count: notes.length };
  } catch (e) {
    return { notes: [], count: 0, error: e.message };
  }
}

/**
 * Get TODO items from today's note
 */
function getTODOs(dateStr = todayStr()) {
  const note = getDailyNote(dateStr);
  if (!note.exists) {
    return { todos: [], date: dateStr };
  }

  const lines = note.content.split('\n');
  const todos = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.trim().startsWith(CONFIG.todoMarker) || line.trim().startsWith(CONFIG.doneMarker))
    .map(({ line, idx }) => ({
      text: line.trim().substring(4).trim(),
      done: line.trim().startsWith(CONFIG.doneMarker),
      line: idx
    }));

  return { todos, date: dateStr, count: todos.length };
}

/**
 * Add TODO item
 */
function addTODO(todo, dateStr = todayStr()) {
  const filePath = path.join(CONFIG.memoryDir, `${dateStr}.md`);
  let content = readFile(filePath) || '';
  
  // Ensure TODO section exists
  if (!content.includes('## TODOs')) {
    content += '\n## TODOs\n';
  }
  
  const newEntry = `- ${CONFIG.todoMarker} ${todo}\n`;
  content += newEntry;
  
  const result = writeFile(filePath, content);
  
  return {
    success: result.success,
    date: dateStr,
    todo: todo
  };
}

/**
 * Mark TODO as complete
 */
function completeTODO(todoText, dateStr = todayStr()) {
  const filePath = path.join(CONFIG.memoryDir, `${dateStr}.md`);
  let content = readFile(filePath);
  
  if (!content) {
    return { success: false, error: 'Daily note not found' };
  }

  // Find and replace the TODO
  const lines = content.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(CONFIG.todoMarker) && line.includes(todoText)) {
      lines[i] = line.replace(CONFIG.todoMarker, CONFIG.doneMarker);
      found = true;
      break;
    }
  }

  if (!found) {
    return { success: false, error: 'TODO not found', todo: todoText };
  }

  const result = writeFile(filePath, lines.join('\n'));
  return {
    success: result.success,
    todo: todoText,
    completed: true
  };
}

/**
 * Get context summary for AI agents
 */
function getContext() {
  const today = getDailyNote(todayStr());
  const yesterday = getDailyNote(yesterdayStr());
  const todos = getTODOs();
  const recentNotes = listDailyNotes(5);
  
  return {
    date: todayStr(),
    todayExists: today.exists,
    yesterdayExists: yesterday.exists,
    pendingTodos: todos.todos.filter(t => !t.done).length,
    recentNotes: recentNotes.notes,
    workspace: CONFIG.workspace
  };
}

// ============== MCP Protocol ==============

const PROTOCOL_VERSION = '2024-11-05';

function send(json) {
  console.log(JSON.stringify(json));
}

function readStdin() {
  let buffer = '';
  const rl = require('readline').createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    if (line.trim() === '') {
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer);
          handleMessage(msg);
        } catch (e) {
          send({ error: 'Invalid JSON: ' + e.message });
        }
        buffer = '';
      }
    } else {
      buffer += line + '\n';
    }
  });
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {
              // Memory tools
              get_memory: {
                description: 'Read the long-term memory file (MEMORY.md)',
                inputSchema: { type: 'object', properties: {} }
              },
              add_memory: {
                description: 'Add an entry to long-term memory',
                inputSchema: {
                  type: 'object',
                  properties: {
                    entry: { type: 'string', description: 'Memory entry to add' },
                    category: { type: 'string', description: 'Category (default: General)' }
                  },
                  required: ['entry']
                }
              },
              search_memory: {
                description: 'Search long-term memory for a query',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' }
                  },
                  required: ['query']
                }
              },
              
              // Daily note tools
              get_daily_note: {
                description: 'Read a daily note (defaults to today)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                  }
                }
              },
              add_daily_note: {
                description: 'Add an entry to the daily note',
                inputSchema: {
                  type: 'object',
                  properties: {
                    entry: { type: 'string', description: 'Note entry to add' },
                    date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                  },
                  required: ['entry']
                }
              },
              list_daily_notes: {
                description: 'List available daily notes',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number', description: 'Max notes to return (default: 10)' }
                  }
                }
              },
              
              // TODO tools
              get_todos: {
                description: 'Get TODO items from today\'s note',
                inputSchema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                  }
                }
              },
              add_todo: {
                description: 'Add a new TODO item',
                inputSchema: {
                  type: 'object',
                  properties: {
                    todo: { type: 'string', description: 'TODO text' },
                    date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                  },
                  required: ['todo']
                }
              },
              complete_todo: {
                description: 'Mark a TODO as complete',
                inputSchema: {
                  type: 'object',
                  properties: {
                    todo: { type: 'string', description: 'TODO text to complete' },
                    date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                  },
                  required: ['todo']
                }
              },
              
              // Context tools
              get_context: {
                description: 'Get context summary for AI agents (today\'s note, todos, recent notes)',
                inputSchema: { type: 'object', properties: {} }
              }
            }
          },
          serverInfo: {
            name: 'memory-mcp-server',
            version: '1.0.0'
          }
        }
      });
      break;

    case 'notifications/initialized':
      // Client ready - no response needed
      break;

    case 'tools/call':
      const toolName = params.name;
      const args = params.arguments || {};
      let result;

      switch (toolName) {
        case 'get_memory':
          result = getMemory();
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: result || '(No memory file found)' }] }
          });
          break;

        case 'add_memory':
          result = addMemory(args.entry, args.category);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'search_memory':
          result = searchMemory(args.query);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'get_daily_note':
          result = getDailyNote(args.date);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'add_daily_note':
          result = addDailyNote(args.entry, args.date);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'list_daily_notes':
          result = listDailyNotes(args.limit);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'get_todos':
          result = getTODOs(args.date);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'add_todo':
          result = addTODO(args.todo, args.date);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'complete_todo':
          result = completeTODO(args.todo, args.date);
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        case 'get_context':
          result = getContext();
          send({
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          });
          break;

        default:
          send({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` }
          });
      }
      break;

    default:
      send({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Unknown method' } });
  }
}

// Start server
console.error('Memory MCP Server starting...');
readStdin();
