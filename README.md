# Broken Links Cleaner for Obsidian

A powerful Obsidian plugin to find, analyze, and clean broken wikilinks in your vault. Keep your knowledge base tidy and well-connected!

## ✨ Features

### 🔍 **Smart Detection**
- **Auto-scan vault** - Automatically finds ALL broken links in your entire vault
- **Triple-check system** - Uses 3 methods to ensure accurate detection
- **Real-time stats** - Shows total links checked and broken links found

### 🧹 **Flexible Cleaning**
- **Clean all files** - Remove broken links from entire vault at once
- **Clean current file** - Target specific files for cleaning
- **Configurable behavior** - Keep link text or remove completely
- **Safe operation** - Only removes links you specify

### 📊 **Vault Analysis**
- **Find orphan files** - Discover files with no incoming links
- **Find empty files** - Locate completely empty markdown files
- **Export reports** - Save results to markdown files for review

### ⚙️ **Customizable**
- Toggle between keeping text vs complete removal
- Configurable broken links file path
- Visual feedback with progress notifications

## 🚀 Quick Start

### Installation

#### From Obsidian Community Plugins (Recommended)
1. Open Settings → Community Plugins
2. Disable Restricted Mode
3. Browse and search for "Broken Links Cleaner"
4. Click Install, then Enable

#### Manual Installation
1. Download `main.js` and `manifest.json` from [latest release](https://github.com/sarwarkaiser/obsidian-broken-links-cleaner/releases)
2. Create folder: `<vault>/.obsidian/plugins/broken-links-cleaner/`
3. Copy files to the folder
4. Reload Obsidian
5. Enable plugin in Settings → Community Plugins

## 📖 Usage Guide

### Method 1: Auto-Scan (Recommended)

1. **Scan your vault**
   - Open Command Palette (`Cmd/Ctrl + P`)
   - Run: `Scan vault and generate broken links file`
   - Wait for scanning to complete

2. **Review the results**
   - Open the generated `broken links output.md` file
   - Review which links will be removed

3. **Clean the links**
   - Run: `Clean broken links from vault`
   - Confirm the action
   - Done! ✅

### Method 2: Manual List

1. **Create a broken links file** (`broken links output.md`):
   ```markdown
   - [[Broken Link 1]]
   - [[Old Page]]
   - [[Deleted Note]]
   ```

2. **Configure the plugin**
   - Settings → Broken Links Cleaner
   - Set file path (default: `broken links output.md`)
   - Choose delete behavior

3. **Run the cleaner**
   - Command: `Clean broken links from vault`

## 🎯 Available Commands

| Command | Description |
|---------|-------------|
| `Scan vault and generate broken links file` | Auto-detect all broken links |
| `Clean broken links from vault` | Remove broken links from all files |
| `Clean broken links from current file` | Clean only the active file |
| `Show detected broken links` | Preview what will be removed |
| `Find orphan files` | Find files with no incoming links |
| `Find empty files` | Find completely empty files |

## ⚙️ Settings

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| **Broken links file** | Path to broken links list | `broken links output.md` | Any path |
| **Delete text completely** | Remove entire link vs keep text | OFF | ON/OFF |

### Delete Behavior Examples

**OFF (default)** - Keep text, remove brackets:
- `[[broken link]]` → `broken link`
- `[[broken|display]]` → `display`

**ON** - Remove completely:
- `[[broken link]]` → *(removed)*
- `[[broken|display]]` → *(removed)*

## 📸 Screenshots

### Scan Results
Shows total links checked and broken links found with detailed file locations.

### Orphan Files Report
Lists all files that have no incoming links from other notes.

### Clean Progress
Real-time feedback showing how many files were cleaned.

## 🛡️ Safety Features

- ✅ **Backup reminder** - Always warns before making changes
- ✅ **Selective removal** - Only removes specified broken links
- ✅ **Preview mode** - Show what will be removed before cleaning
- ✅ **Valid links protected** - Never touches working links
- ✅ **Export reports** - Save analysis results for review

## 🔧 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/sarwarkaiser/obsidian-broken-links-cleaner
cd obsidian-broken-links-cleaner

# Install dependencies
npm install

# Build
npm run build

# Development mode (auto-rebuild)
npm run dev
```

### Project Structure

```
obsidian-broken-links-cleaner/
├── main.ts              # Main plugin code
├── manifest.json        # Plugin manifest
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── esbuild.config.mjs   # Build config
├── .gitignore          # Git ignore rules
├── LICENSE             # MIT License
└── README.md           # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the need to maintain clean, well-connected vaults

## 📧 Support

- 🐛 [Report a bug](https://github.com/sarwarkaiser/obsidian-broken-links-cleaner/issues/new?labels=bug)
- 💡 [Request a feature](https://github.com/sarwarkaiser/obsidian-broken-links-cleaner/issues/new?labels=enhancement)
- 💬 [Ask a question](https://github.com/sarwarkaiser/obsidian-broken-links-cleaner/discussions)

## ⭐ Show Your Support

If you find this plugin helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📝 Contributing code

---

**Made with ❤️ for the Obsidian community**
