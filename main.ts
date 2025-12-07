import { App, Notice, Plugin, PluginSettingTab, TFile, Modal, Setting } from 'obsidian';

interface BrokenLinksCleanerSettings {
	brokenLinksFile: string;
	deleteText: boolean;
}

const DEFAULT_SETTINGS: BrokenLinksCleanerSettings = {
	brokenLinksFile: 'broken links output.md',
	deleteText: false  // false = keep text, true = delete entire link
}

export default class BrokenLinksCleanerPlugin extends Plugin {
	settings: BrokenLinksCleanerSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('eraser', 'Clean Broken Links', () => {
			this.showCleanupModal();
		});

		// Add command
		this.addCommand({
			id: 'clean-broken-links',
			name: 'Clean broken links from vault',
			callback: () => {
				this.showCleanupModal();
			}
		});

		// Add command to clean current file only
		this.addCommand({
			id: 'clean-broken-links-current-file',
			name: 'Clean broken links from current file',
			editorCallback: (editor, view) => {
				this.cleanCurrentFile(view.file);
			}
		});

		// Add command to show loaded broken links
		this.addCommand({
			id: 'show-broken-links',
			name: 'Show detected broken links',
			callback: async () => {
				const brokenLinks = await this.loadBrokenLinks();
				if (brokenLinks.size === 0) {
					new Notice('No broken links detected in: ' + this.settings.brokenLinksFile);
				} else {
					const linksList = Array.from(brokenLinks).slice(0, 10).join('\n');
					new Notice(`Detected ${brokenLinks.size} broken links:\n${linksList}\n${brokenLinks.size > 10 ? '...' : ''}`, 8000);
				}
			}
		});

		// Add command to find orphan files
		this.addCommand({
			id: 'find-orphan-files',
			name: 'Find orphan files (no incoming links)',
			callback: async () => {
				await this.findOrphanFiles();
			}
		});

		// Add command to find empty files
		this.addCommand({
			id: 'find-empty-files',
			name: 'Find empty files',
			callback: async () => {
				await this.findEmptyFiles();
			}
		});

		// Add command to scan for all broken links
		this.addCommand({
			id: 'scan-broken-links',
			name: 'Scan vault and generate broken links file',
			callback: async () => {
				await this.scanAndGenerateBrokenLinks();
			}
		});

		// Add settings tab
		this.addSettingTab(new BrokenLinksCleanerSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadBrokenLinks(): Promise<Set<string>> {
		const brokenLinksSet = new Set<string>();
		const file = this.app.vault.getAbstractFileByPath(this.settings.brokenLinksFile);

		if (!file || !(file instanceof TFile)) {
			new Notice('Broken links file not found: ' + this.settings.brokenLinksFile);
			return brokenLinksSet;
		}

		const content = await this.app.vault.read(file);
		const lines = content.split('\n');

		// Extract [[Link]] from lines in multiple formats:
		// - "- [[Link]] in [[File]]" (custom format)
		// - "[[Link]]" (simple list)
		// Also extract all [[links]] from the file
		const listRegex = /^[\s-]*(\[\[[^\]]+\]\])/; // Matches "- [[Link]]" or "  - [[Link]]"
		const allLinksRegex = /\[\[([^\]]+)\]\]/g; // Matches all [[links]] in a line

		for (const line of lines) {
			// First try the list format
			const listMatch = line.match(listRegex);
			if (listMatch) {
				brokenLinksSet.add(listMatch[1]);
			} else {
				// Extract all links from the line (for lines like "[[Link1]] in [[File1]]")
				// Only take the first link (the broken one)
				const firstLink = line.match(/\[\[([^\]]+)\]\]/);
				if (firstLink && !line.includes(' in ')) {
					// Only add if it's not part of "in [[File]]" reference
					brokenLinksSet.add(`[[${firstLink[1]}]]`);
				}
			}
		}

		return brokenLinksSet;
	}

	cleanBrokenWikilinks(text: string, brokenLinks: Set<string>): string {
		// First, handle [[link|display]] format
		text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, link, display) => {
			if (brokenLinks.has(`[[${link}]]`)) {
				// Either keep display text or delete entirely based on settings
				return this.settings.deleteText ? '' : display;
			}
			return match; // Keep valid link as-is
		});

		// Then handle [[link]] format
		text = text.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
			if (brokenLinks.has(match)) {
				// Either keep text or delete entirely based on settings
				return this.settings.deleteText ? '' : linkText;
			}
			return match; // Keep valid link as-is
		});

		return text;
	}

	async cleanFile(file: TFile, brokenLinks: Set<string>): Promise<boolean> {
		try {
			const content = await this.app.vault.read(file);
			const cleanedContent = this.cleanBrokenWikilinks(content, brokenLinks);

			if (content !== cleanedContent) {
				await this.app.vault.modify(file, cleanedContent);
				return true;
			}
			return false;
		} catch (error) {
			console.error(`Error cleaning file ${file.path}:`, error);
			return false;
		}
	}

	async cleanCurrentFile(file: TFile | null) {
		if (!file) {
			new Notice('No file is currently open');
			return;
		}

		const brokenLinks = await this.loadBrokenLinks();
		console.log('Loaded broken links:', Array.from(brokenLinks));

		if (brokenLinks.size === 0) {
			new Notice('No broken links loaded. Check your broken links file.');
			return;
		}

		new Notice(`Loaded ${brokenLinks.size} broken links. Cleaning ${file.name}...`);
		const cleaned = await this.cleanFile(file, brokenLinks);

		if (cleaned) {
			new Notice(`✓ Cleaned broken links from: ${file.name}`);
		} else {
			new Notice(`No broken links found in: ${file.name}`);
		}
	}

	async cleanAllFiles() {
		const brokenLinks = await this.loadBrokenLinks();
		if (brokenLinks.size === 0) {
			new Notice('No broken links loaded. Check your broken links file.');
			return;
		}

		new Notice(`Loaded ${brokenLinks.size} broken links. Starting cleanup...`);

		const files = this.app.vault.getMarkdownFiles();
		let cleanedCount = 0;

		for (const file of files) {
			const cleaned = await this.cleanFile(file, brokenLinks);
			if (cleaned) {
				cleanedCount++;
			}
		}

		new Notice(`✓ Cleaned ${cleanedCount} files out of ${files.length} total files`);
	}

	showCleanupModal() {
		new CleanupConfirmModal(this.app, this).open();
	}

	async findOrphanFiles() {
		const files = this.app.vault.getMarkdownFiles();
		const allLinks = new Map<string, string[]>(); // file path -> files that link to it

		// Build a map of all incoming links
		for (const file of files) {
			const content = await this.app.vault.read(file);
			const links = content.match(/\[\[([^\]]+)\]\]/g);

			if (links) {
				for (const link of links) {
					const linkText = link.slice(2, -2).split('|')[0]; // Remove [[ ]] and handle aliases
					const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkText, file.path);

					if (targetFile) {
						if (!allLinks.has(targetFile.path)) {
							allLinks.set(targetFile.path, []);
						}
						allLinks.get(targetFile.path)?.push(file.path);
					}
				}
			}
		}

		// Find files with no incoming links
		const orphanFiles: TFile[] = [];
		for (const file of files) {
			if (!allLinks.has(file.path)) {
				orphanFiles.push(file);
			}
		}

		if (orphanFiles.length === 0) {
			new Notice('No orphan files found!');
		} else {
			new OrphanFilesModal(this.app, orphanFiles).open();
		}
	}

	async findEmptyFiles() {
		const files = this.app.vault.getMarkdownFiles();
		const emptyFiles: TFile[] = [];

		for (const file of files) {
			const content = await this.app.vault.read(file);
			const trimmedContent = content.trim();

			if (trimmedContent.length === 0) {
				emptyFiles.push(file);
			}
		}

		if (emptyFiles.length === 0) {
			new Notice('No empty files found!');
		} else {
			new EmptyFilesModal(this.app, emptyFiles).open();
		}
	}

	async scanAndGenerateBrokenLinks() {
		new Notice('Scanning vault for broken links...');
		const files = this.app.vault.getMarkdownFiles();
		const brokenLinksMap = new Map<string, string[]>(); // broken link -> files it appears in

		// Build a set of all existing file names (with and without extension)
		const existingFiles = new Set<string>();
		for (const file of files) {
			existingFiles.add(file.basename); // without .md
			existingFiles.add(file.path); // full path
			existingFiles.add(file.name); // with .md
		}

		console.log(`Scanning ${files.length} files...`);
		let totalLinksChecked = 0;

		// Scan all files
		for (const file of files) {
			const content = await this.app.vault.read(file);
			const links = content.match(/\[\[([^\]]+)\]\]/g);

			if (links) {
				for (const link of links) {
					totalLinksChecked++;
					const linkText = link.slice(2, -2).split('|')[0].trim(); // Remove [[ ]], handle aliases, trim

					// Check if file exists (try multiple variations)
					const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkText, file.path);
					const existsAsBasename = existingFiles.has(linkText);
					const existsAsPath = existingFiles.has(linkText + '.md');

					// If target file doesn't exist by any method, it's a broken link
					if (!targetFile && !existsAsBasename && !existsAsPath) {
						const brokenLink = `[[${linkText}]]`;
						if (!brokenLinksMap.has(brokenLink)) {
							brokenLinksMap.set(brokenLink, []);
						}
						brokenLinksMap.get(brokenLink)?.push(file.path);
					}
				}
			}
		}

		console.log(`Checked ${totalLinksChecked} links, found ${brokenLinksMap.size} broken`);

		if (brokenLinksMap.size === 0) {
			new Notice(`No broken links found! (Checked ${totalLinksChecked} links)`);
			return;
		}

		// Generate the broken links file
		let content = `# Broken Links Report\n\nGenerated: ${new Date().toLocaleString()}\nTotal broken links: ${brokenLinksMap.size}\nTotal links checked: ${totalLinksChecked}\n\n## Broken Links:\n\n`;

		for (const [link, filesPaths] of brokenLinksMap) {
			content += `- ${link} in ${filesPaths.map(p => `[[${p}]]`).join(', ')}\n`;
		}

		// Save to the configured broken links file
		const fileName = this.settings.brokenLinksFile;

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(fileName);
		if (existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, content);
			new Notice(`Updated ${fileName} with ${brokenLinksMap.size} broken links`);
		} else {
			await this.app.vault.create(fileName, content);
			new Notice(`Created ${fileName} with ${brokenLinksMap.size} broken links`);
		}
	}
}

class CleanupConfirmModal extends Modal {
	plugin: BrokenLinksCleanerPlugin;

	constructor(app: App, plugin: BrokenLinksCleanerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Clean Broken Links' });
		contentEl.createEl('p', {
			text: 'This will remove all broken links listed in your broken links file from all markdown files in your vault.'
		});
		contentEl.createEl('p', {
			text: '⚠️ This action cannot be undone. Make sure you have a backup!',
			cls: 'mod-warning'
		});

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});

		const confirmButton = buttonContainer.createEl('button', {
			text: 'Clean All Files',
			cls: 'mod-cta'
		});
		confirmButton.addEventListener('click', async () => {
			this.close();
			await this.plugin.cleanAllFiles();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class OrphanFilesModal extends Modal {
	files: TFile[];

	constructor(app: App, files: TFile[]) {
		super(app);
		this.files = files;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `Orphan Files (${this.files.length})` });
		contentEl.createEl('p', { text: 'These files have no incoming links from other notes:' });

		const listEl = contentEl.createEl('ul', { cls: 'orphan-files-list' });
		listEl.style.maxHeight = '400px';
		listEl.style.overflowY = 'auto';

		for (const file of this.files) {
			listEl.createEl('li', { text: file.path });
		}

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const saveButton = buttonContainer.createEl('button', { text: 'Save to File', cls: 'mod-cta' });
		saveButton.addEventListener('click', async () => {
			await this.saveToFile();
		});

		const closeButton = buttonContainer.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

	async saveToFile() {
		const content = `# Orphan Files Report\n\nGenerated: ${new Date().toLocaleString()}\nTotal: ${this.files.length} files\n\n## Files with no incoming links:\n\n${this.files.map(f => `- [[${f.basename}]] (${f.path})`).join('\n')}`;

		const fileName = `Orphan Files Report ${new Date().toISOString().split('T')[0]}.md`;
		await this.app.vault.create(fileName, content);
		new Notice(`Saved report to: ${fileName}`);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class EmptyFilesModal extends Modal {
	files: TFile[];

	constructor(app: App, files: TFile[]) {
		super(app);
		this.files = files;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `Empty Files (${this.files.length})` });
		contentEl.createEl('p', { text: 'These files are completely empty:' });

		const listEl = contentEl.createEl('ul', { cls: 'empty-files-list' });
		listEl.style.maxHeight = '400px';
		listEl.style.overflowY = 'auto';

		for (const file of this.files) {
			listEl.createEl('li', { text: file.path });
		}

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const saveButton = buttonContainer.createEl('button', { text: 'Save to File', cls: 'mod-cta' });
		saveButton.addEventListener('click', async () => {
			await this.saveToFile();
		});

		const closeButton = buttonContainer.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

	async saveToFile() {
		const content = `# Empty Files Report\n\nGenerated: ${new Date().toLocaleString()}\nTotal: ${this.files.length} files\n\n## Empty Files:\n\n${this.files.map(f => `- [[${f.basename}]] (${f.path})`).join('\n')}`;

		const fileName = `Empty Files Report ${new Date().toISOString().split('T')[0]}.md`;
		await this.app.vault.create(fileName, content);
		new Notice(`Saved report to: ${fileName}`);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class BrokenLinksCleanerSettingTab extends PluginSettingTab {
	plugin: BrokenLinksCleanerPlugin;

	constructor(app: App, plugin: BrokenLinksCleanerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Broken Links Cleaner Settings' });

		new Setting(containerEl)
			.setName('Broken links file')
			.setDesc('Path to the file containing the list of broken links')
			.addText(text => text
				.setPlaceholder('broken links output.md')
				.setValue(this.plugin.settings.brokenLinksFile)
				.onChange(async (value) => {
					this.plugin.settings.brokenLinksFile = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Delete text completely')
			.setDesc('When enabled, removes the entire broken link. When disabled, keeps the text and only removes the [[ ]] brackets.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.deleteText)
				.onChange(async (value) => {
					this.plugin.settings.deleteText = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'How to use' });
		containerEl.createEl('p', {
			text: '1. Create a file listing all broken links (one per line in format: - [[Link Name]])'
		});
		containerEl.createEl('p', {
			text: '2. Set the path to that file in the setting above'
		});
		containerEl.createEl('p', {
			text: '3. Use the ribbon icon or command palette to clean broken links'
		});
		containerEl.createEl('p', {
			text: '4. Use "Find orphan files" to discover files with no incoming links'
		});
		containerEl.createEl('p', {
			text: '5. Use "Find empty files" to discover completely empty files'
		});
	}
}
