# Contributing to PostgreSQL MCP

Thank you for your interest in contributing to PostgreSQL MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep discussions professional

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. **Clear title** - Describe the bug briefly
2. **Steps to reproduce** - Detailed steps to reproduce the issue
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment**:
   - OS and version
   - Python version
   - PostgreSQL version
   - VS Code version
6. **Logs** - Include relevant error messages or logs

### Suggesting Features

For feature requests, open an issue with:

1. **Use case** - Why is this feature needed?
2. **Proposed solution** - How should it work?
3. **Alternatives** - Any alternative approaches?
4. **Additional context** - Screenshots, examples, etc.

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style (see below)
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   - Test the MCP server
   - Test the VS Code extension
   - Verify database operations

5. **Commit your changes**
   ```bash
   git commit -m "Add feature: your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Include screenshots if applicable

## Development Setup

### MCP Server Development

```bash
cd mcp-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-asyncio black flake8 mypy

# Run with hot reload
uvicorn server:app --reload
```

### VS Code Extension Development

```bash
cd vscode-extension

# Install dependencies
npm install

# Compile with watch mode
npm run watch

# Open in VS Code
code .

# Press F5 to launch Extension Development Host
```

## Code Style

### Python (MCP Server)

- Follow PEP 8
- Use type hints
- Use async/await for database operations
- Add docstrings to functions

**Format code:**
```bash
black server.py
flake8 server.py
mypy server.py
```

**Example:**
```python
async def execute_query(query: str) -> Dict[str, Any]:
    """
    Execute a SELECT query and return results.

    Args:
        query: The SQL query to execute

    Returns:
        Dictionary with rows and row count
    """
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query)
        return {"rows": [dict(row) for row in rows], "row_count": len(rows)}
```

### TypeScript (VS Code Extension)

- Follow TypeScript best practices
- Use async/await
- Add JSDoc comments
- Use meaningful variable names

**Example:**
```typescript
/**
 * Execute a query request and stream results to chat
 */
async function handleQueryRequest(
    prompt: string,
    baseUrl: string,
    stream: vscode.ChatResponseStream
): Promise<void> {
    const query = extractSqlQuery(prompt);
    // Implementation...
}
```

## Testing

### Testing MCP Server

```bash
cd mcp-server

# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Testing VS Code Extension

1. Open extension in VS Code
2. Press F5 to launch Extension Development Host
3. Test all commands and features
4. Check Output panel for errors

### Manual Testing Checklist

**MCP Server:**
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Can list tables
- [ ] Can execute queries
- [ ] Can create tables
- [ ] Error handling works

**VS Code Extension:**
- [ ] Extension activates
- [ ] Server starts automatically
- [ ] Commands work from palette
- [ ] @postgres chat participant works
- [ ] Status bar updates correctly
- [ ] Configuration wizard works

## Adding New MCP Tools

To add a new tool to the MCP server:

1. **Define the tool** in `list_tools()`:
```python
Tool(
    name="your_tool_name",
    description="What it does",
    inputSchema={
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "Parameter description"}
        },
        "required": ["param"]
    }
)
```

2. **Add handler** in `call_tool()`:
```python
elif request.name == "your_tool_name":
    result = await your_tool_function(request.arguments.get("param"))
    return {"result": result}
```

3. **Implement function**:
```python
async def your_tool_function(param: str) -> Dict[str, Any]:
    async with db_pool.acquire() as conn:
        # Your implementation
        return {"status": "success", "data": result}
```

4. **Update documentation**:
   - Add to MCP server README
   - Update main README
   - Add examples

## Documentation

- Update README.md for user-facing changes
- Update code comments for implementation details
- Add JSDoc/docstrings for new functions
- Update QUICK_START.md if setup changes

## Release Process

1. Update version numbers:
   - `mcp-server/server.py`
   - `vscode-extension/package.json`

2. Update CHANGELOG (if exists)

3. Test thoroughly:
   - Run all tests
   - Test installation scripts
   - Test on different platforms

4. Create release:
   - Tag the version
   - Build VSIX file
   - Create GitHub release
   - Add release notes

## Questions?

If you have questions:
- Open an issue for discussion
- Check existing issues and PRs
- Review the documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions help make PostgreSQL MCP better for everyone!
