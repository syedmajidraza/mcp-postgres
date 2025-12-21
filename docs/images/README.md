# Documentation Images

This folder contains diagrams and screenshots for the PostgreSQL MCP project documentation.

## Files

### **provider-llm.png**
- **Description**: AI Provider Architecture Diagram
- **Size**: 1200x800px (255KB)
- **Format**: PNG (converted from SVG)
- **Shows**: Complete architecture showing all 3 AI provider options
  - ✅ GitHub Copilot (active, via VS Code proxy)
  - 🔒 Azure OpenAI (disabled, requires setup)
  - 🤖 ChatGPT (active, requires API key)
- **Used in**:
  - `/web-chatbot/README.md`
  - `/web-chatbot/FINAL_STATE.md`

### **provider-llm-diagram.svg**
- **Description**: Source SVG for provider-llm.png
- **Size**: 1200x800px (9KB)
- **Format**: SVG (vector graphics)
- **Purpose**: Editable source file for the architecture diagram

### **popup-chatbot-screenshot.png**
- **Description**: Web Chatbot Interface Screenshot
- **Size**: 98KB
- **Format**: PNG
- **Shows**: Main chat interface with provider selection
- **Used in**: `/web-chatbot/README.md`

---

## Updating Diagrams

### To Update provider-llm.png:

1. Edit the SVG source file:
   ```bash
   # Edit provider-llm-diagram.svg with any SVG editor
   ```

2. Convert to PNG:
   ```bash
   cd /Users/syedraza/postgres-mcp/docs/images
   qlmanage -t -s 2400 -o . provider-llm-diagram.svg
   mv provider-llm-diagram.svg.png provider-llm.png
   ```

3. Commit both files:
   ```bash
   git add provider-llm-diagram.svg provider-llm.png
   git commit -m "Update provider architecture diagram"
   ```

---

## Image Guidelines

- **PNG files**: For screenshots and rendered diagrams (used in GitHub README)
- **SVG files**: For editable vector graphics (source files)
- **Resolution**: High DPI (2400px width for PNG exports)
- **Compression**: Optimize PNGs before committing

---

**Last Updated**: December 21, 2024
