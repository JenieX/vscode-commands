/* eslint-disable max-classes-per-file */
import { EventEmitter, MarkdownString, ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, type Command, type Event, type TreeDataProvider } from 'vscode';
import { CommandId } from './commands';
import { $config, $state } from './extension';
import { createFolderHoverText } from './folderHoverText';
import { type CommandFolder, type Runnable, type TopLevelCommands } from './types';
import { extUtils } from './utils/extUtils';
import { utils } from './utils/utils';

interface RunCommandTreeItemInit {
	label: string;
	runnable: Runnable;
	icon?: string;
	iconColor?: string;
}

/**
 * Ordinary tree item. Can have icon (with or without color).
 * Shows markdown tooltip on hover with json version of it's contents.
 */
export class RunCommandTreeItem extends TreeItem {
	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public contextValue = 'command';
	public description = '';
	public command: Command | undefined;
	public runnable: Runnable;

	constructor({
		label,
		runnable,
		icon,
		iconColor,
	}: RunCommandTreeItemInit) {
		super(label);

		this.command = {
			command: CommandId.Run,
			title: 'Run Command',
			arguments: [runnable],
		};
		this.runnable = runnable;
		if (icon) {
			this.iconPath = new ThemeIcon(icon, new ThemeColor(iconColor ?? ''));
		}
		if (typeof runnable === 'string') {
			this.contextValue = 'stringCommand';// Can't add to status bar
		}
		if (typeof runnable !== 'string' && !Array.isArray(runnable) && runnable.workspace) {
			this.description = $config.treeViewWorkspaceCommandSymbol;
		}
		if (typeof runnable !== 'string' && !Array.isArray(runnable) && runnable.statusBar && !runnable.statusBar.hidden) {
			this.description += $config.treeViewStatusBarVisibleSymbol;
		}
		if (typeof runnable !== 'string' && !Array.isArray(runnable) && runnable.statusBar && runnable.statusBar.hidden) {
			this.description += $config.treeViewStatusBarInvisibleSymbol;
		}
		const keybinding = $state.keybindings.find(keyItem => keyItem.command === label);
		if (keybinding) {
			this.description += ` ⌨${keybinding.key}⌨`;
		}
	}

	public getLabelName(): string {
		return typeof this.label === 'string' ? this.label : '';
	}
}
/**
 * Folder uses icons from active file icon theme.
 */
export class FolderTreeItem extends TreeItem {
	public collapsibleState = $config.treeViewCollapseFolders ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.Expanded;
	public contextValue = 'folder';
	public description = '';
	public iconPath = ThemeIcon.Folder;
	public folder: CommandFolder;

	constructor(
		label: string,
		folder: CommandFolder,
	) {
		super(label);
		this.folder = folder;

		if (folder.workspace) {
			this.description = $config.treeViewWorkspaceCommandSymbol;
		}
		if (folder.statusBar && !folder.statusBar.hidden) {
			this.description += $config.treeViewStatusBarVisibleSymbol;
		}
		if (folder?.statusBar?.hidden) {
			this.description += $config.treeViewStatusBarInvisibleSymbol;
		}
	}

	public getLabelName(): string {
		return typeof this.label === 'string' ? this.label : '';
	}
}

export class CommandsTreeViewProvider implements TreeDataProvider<FolderTreeItem | RunCommandTreeItem> {
	private readonly _onDidChangeTreeData: EventEmitter<FolderTreeItem | RunCommandTreeItem | undefined> = new EventEmitter<FolderTreeItem | RunCommandTreeItem | undefined>();
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public readonly onDidChangeTreeData: Event<FolderTreeItem | RunCommandTreeItem | undefined> = this._onDidChangeTreeData.event;

	private commands: TopLevelCommands;

	constructor(
		commands: TopLevelCommands,
	) {
		this.commands = commands;
	}

	public refresh(e?: FolderTreeItem | RunCommandTreeItem): void {
		this._onDidChangeTreeData.fire(e);
	}

	/**
	 * Resolve `tooltip` only on hover
	 */
	public resolveTreeItem(_: FolderTreeItem | RunCommandTreeItem, item: FolderTreeItem | RunCommandTreeItem): FolderTreeItem | RunCommandTreeItem | undefined {
		let markdown = new MarkdownString(undefined, true);
		markdown.isTrusted = true;
		if (item instanceof FolderTreeItem) {
			markdown = createFolderHoverText(item.folder);
		} else {
			if (utils.isSimpleObject(item.runnable) && item.runnable.disableTooltip) {
				return item;
			}
			if (utils.isSimpleObject(item.runnable) && item.runnable.markdownTooltip) {
				markdown.appendMarkdown(item.runnable.markdownTooltip as string);
				markdown.appendMarkdown('\n\n---\n\n');
			}
			markdown.appendCodeblock(JSON.stringify(item.runnable, null, '  '), 'json');
		}
		item.tooltip = markdown;
		return item;
	}

	public updateCommands(commands: TopLevelCommands): void {
		this.commands = commands;
	}

	public getTreeItem(element: RunCommandTreeItem): TreeItem {
		return element;
	}

	public getChildren(element?: FolderTreeItem | RunCommandTreeItem): (FolderTreeItem | RunCommandTreeItem)[] {
		if (element instanceof FolderTreeItem) {
			return this.commandsToTreeItems(element.folder.nestedItems ?? {});
		} else {
			const allCommands = this.commands;
			return this.commandsToTreeItems(allCommands);
		}
	}

	/**
	 * Convert extension commands to `TreeItem` (`FolderTreeItem` or `RunCommandTreeItem`)
	 */
	private commandsToTreeItems(items: TopLevelCommands): (FolderTreeItem | RunCommandTreeItem)[] {
		const treeItems: (FolderTreeItem | RunCommandTreeItem)[] = [];
		for (const key in items) {
			const item = items[key];
			if (typeof item !== 'string' && item.hidden) {
				continue;
			}

			if (extUtils.isCommandFolder(item)) {
				treeItems.push(new FolderTreeItem(
					key,
					item,
				));
			} else {
				treeItems.push(new RunCommandTreeItem(
					{
						label: key,
						runnable: item,
						icon: typeof item === 'string' ? undefined : item.icon,
						iconColor: typeof item === 'string' ? undefined : item.iconColor,
					},
				));
			}
		}
		return treeItems;
	}
}
