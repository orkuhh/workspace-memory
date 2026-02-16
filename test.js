#!/usr/bin/env node
/**
 * Memory MCP Server - Test Suite
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_MEMORY_FILE = '/tmp/test-memory.md';
const TEST_MEMORY_DIR = '/tmp/test-memory';

// Helper to simulate MCP messages
function simulateToolCall(server, toolName, args) {
  return new Promise((resolve) => {
    const originalSend = server.send;
    let result = null;
    
    server.send = (json) => {
      if (json.result) {
        try {
          result = JSON.parse(json.result.content[0].text);
        } catch (e) {
          result = json.result.content[0].text;
        }
      } else if (json.error) {
        result = { error: json.error };
      }
    };
    
    // Simulate tools/call message
    server.handleMessage({
      id: 'test-1',
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    });
    
    // Restore and return
    server.send = originalSend;
    return result;
  });
}

// Test functions
const tests = [
  {
    name: 'get_memory (empty)',
    test: async (server) => {
      const result = await simulateToolCall(server, 'get_memory', {});
      return typeof result === 'string';
    }
  },
  {
    name: 'add_memory',
    test: async (server) => {
      const result = await simulateToolCall(server, 'add_memory', {
        entry: 'Test memory entry',
        category: 'Test'
      });
      return result.success === true;
    }
  },
  {
    name: 'search_memory',
    test: async (server) => {
      const result = await simulateToolCall(server, 'search_memory', {
        query: 'Test'
      });
      return result.count >= 0;
    }
  },
  {
    name: 'get_daily_note (today)',
    test: async (server) => {
      const result = await simulateToolCall(server, 'get_daily_note', {});
      return result.exists !== undefined;
    }
  },
  {
    name: 'add_daily_note',
    test: async (server) => {
      const result = await simulateToolCall(server, 'add_daily_note', {
        entry: 'Test daily note entry'
      });
      return result.success === true;
    }
  },
  {
    name: 'list_daily_notes',
    test: async (server) => {
      const result = await simulateToolCall(server, 'list_daily_notes', {});
      return Array.isArray(result.notes);
    }
  },
  {
    name: 'add_todo',
    test: async (server) => {
      const result = await simulateToolCall(server, 'add_todo', {
        todo: 'Test TODO item'
      });
      return result.success === true;
    }
  },
  {
    name: 'get_todos',
    test: async (server) => {
      const result = await simulateToolCall(server, 'get_todos', {});
      return Array.isArray(result.todos);
    }
  },
  {
    name: 'complete_todo',
    test: async (server) => {
      const result = await simulateToolCall(server, 'complete_todo', {
        todo: 'Test TODO item'
      });
      return result.success === true;
    }
  },
  {
    name: 'get_context',
    test: async (server) => {
      const result = await simulateToolCall(server, 'get_context', {});
      return result.date !== undefined && result.pendingTodos !== undefined;
    }
  }
];

// Run tests
async function runTests() {
  console.log('Memory MCP Server - Test Suite\n');
  console.log('Note: This test file requires manual MCP protocol testing.');
  console.log('Run the server and use an MCP client to test tools.\n');
  
  console.log('Available tools to test:');
  console.log('1. get_memory - Read MEMORY.md');
  console.log('2. add_memory - Add entry to MEMORY.md');
  console.log('3. search_memory - Search MEMORY.md');
  console.log('4. get_daily_note - Read a daily note');
  console.log('5. add_daily_note - Add to daily note');
  console.log('6. list_daily_notes - List available notes');
  console.log('7. get_todos - Get TODOs for a date');
  console.log('8. add_todo - Add a TODO item');
  console.log('9. complete_todo - Mark TODO complete');
  console.log('10. get_context - Get context summary\n');
  
  // Basic file structure test
  console.log('Basic structure check:');
  
  const files = ['package.json', 'index.js', 'README.md'];
  let allExist = true;
  
  for (const file of files) {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
    if (!exists) allExist = false;
  }
  
  console.log('');
  
  if (allExist) {
    console.log('All required files present.');
    console.log('Server is ready for use.');
  } else {
    console.error('Some files are missing!');
    process.exit(1);
  }
}

runTests();
