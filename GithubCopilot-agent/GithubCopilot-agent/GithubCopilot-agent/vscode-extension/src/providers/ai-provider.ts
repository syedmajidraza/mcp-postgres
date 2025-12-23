import * as vscode from 'vscode';

/**
 * Interface for AI providers that can be used for SQL generation
 */
export interface AIProvider {
    /** Display name of the provider */
    name: string;

    /** Vendor identifier used by VSCode Language Model API */
    vendor: string;

    /** Check if this provider is available and authenticated */
    authenticate(): Promise<boolean>;

    /** Get the language model instance for this provider */
    selectModel(): Promise<vscode.LanguageModelChat | null>;
}

/**
 * GitHub Copilot provider implementation
 */
export class CopilotProvider implements AIProvider {
    name = 'GitHub Copilot';
    vendor = 'copilot';

    async authenticate(): Promise<boolean> {
        try {
            const models = await vscode.lm.selectChatModels({ vendor: this.vendor });
            return models.length > 0;
        } catch (error) {
            console.error('Failed to authenticate with GitHub Copilot:', error);
            return false;
        }
    }

    async selectModel(): Promise<vscode.LanguageModelChat | null> {
        try {
            const models = await vscode.lm.selectChatModels({ vendor: this.vendor });
            return models[0] || null;
        } catch (error) {
            console.error('Failed to select GitHub Copilot model:', error);
            return null;
        }
    }
}

/**
 * Custom model provider for BYOK (Bring Your Own Key) models
 * Supports Azure OpenAI, Anthropic Claude, local models, etc.
 */
export class CustomModelProvider implements AIProvider {
    name = 'Custom Model (BYOK)';
    vendor = 'custom';

    async authenticate(): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('postgresMcp');
            const modelFamily = config.get('ai.modelFamily', 'gpt-4');

            // Try to find any available model matching the family
            const allModels = await vscode.lm.selectChatModels();

            // Filter to non-Copilot models (BYOK models)
            const customModels = allModels.filter(m => m.vendor !== 'copilot');

            if (customModels.length === 0) {
                return false;
            }

            // Check if preferred model family is available
            const preferredModel = customModels.find(m =>
                m.family?.toLowerCase().includes(modelFamily.toLowerCase())
            );

            return preferredModel !== undefined || customModels.length > 0;
        } catch (error) {
            console.error('Failed to authenticate with custom model provider:', error);
            return false;
        }
    }

    async selectModel(): Promise<vscode.LanguageModelChat | null> {
        try {
            const config = vscode.workspace.getConfiguration('postgresMcp');
            const modelFamily = config.get('ai.modelFamily', 'gpt-4');

            const allModels = await vscode.lm.selectChatModels();
            const customModels = allModels.filter(m => m.vendor !== 'copilot');

            if (customModels.length === 0) {
                return null;
            }

            // Try to find preferred model family
            const preferredModel = customModels.find(m =>
                m.family?.toLowerCase().includes(modelFamily.toLowerCase())
            );

            // Return preferred or first available custom model
            return preferredModel || customModels[0];
        } catch (error) {
            console.error('Failed to select custom model:', error);
            return null;
        }
    }
}

/**
 * Manager for AI providers with fallback support
 */
export class AIProviderManager {
    private providers: Map<string, AIProvider> = new Map();
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.providers.set('copilot', new CopilotProvider());
        this.providers.set('custom', new CustomModelProvider());
    }

    /**
     * Get the currently configured provider from settings
     */
    private getConfiguredProvider(): string {
        const config = vscode.workspace.getConfiguration('postgresMcp');
        return config.get('ai.provider', 'copilot');
    }

    /**
     * Check if fallback is enabled
     */
    private isFallbackEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('postgresMcp');
        return config.get('ai.fallbackEnabled', true);
    }

    /**
     * Get the active AI provider instance
     */
    async getActiveProvider(): Promise<AIProvider> {
        const selectedProviderId = this.getConfiguredProvider();
        const provider = this.providers.get(selectedProviderId);

        if (!provider) {
            this.outputChannel.appendLine(`Unknown provider: ${selectedProviderId}, falling back to GitHub Copilot`);
            return this.providers.get('copilot')!;
        }

        return provider;
    }

    /**
     * Get a language model, with fallback support if enabled
     */
    async getModel(): Promise<vscode.LanguageModelChat> {
        const primaryProvider = await this.getActiveProvider();
        const fallbackEnabled = this.isFallbackEnabled();

        this.outputChannel.appendLine(`Attempting to use ${primaryProvider.name}...`);

        // Try primary provider
        const isAuthenticated = await primaryProvider.authenticate();

        if (isAuthenticated) {
            const model = await primaryProvider.selectModel();
            if (model) {
                this.outputChannel.appendLine(`Using ${primaryProvider.name} (${model.family || 'unknown model'})`);
                return model;
            }
        }

        this.outputChannel.appendLine(`${primaryProvider.name} is not available`);

        // Try fallback if enabled and primary is not Copilot
        if (fallbackEnabled && primaryProvider.vendor !== 'copilot') {
            this.outputChannel.appendLine('Attempting to fallback to GitHub Copilot...');

            const copilotProvider = this.providers.get('copilot')!;
            const copilotAuthenticated = await copilotProvider.authenticate();

            if (copilotAuthenticated) {
                const copilotModel = await copilotProvider.selectModel();
                if (copilotModel) {
                    this.outputChannel.appendLine('Fallback successful: Using GitHub Copilot');
                    vscode.window.showWarningMessage(
                        `${primaryProvider.name} unavailable. Using GitHub Copilot as fallback.`,
                        'Configure AI Provider'
                    ).then(selection => {
                        if (selection === 'Configure AI Provider') {
                            vscode.commands.executeCommand('postgres-mcp.selectAIProvider');
                        }
                    });
                    return copilotModel;
                }
            }
        }

        // No provider available
        const errorMessage = fallbackEnabled
            ? `No AI provider is available. Please install and authenticate GitHub Copilot or configure a custom model provider.`
            : `${primaryProvider.name} is not available. Please install and authenticate, or enable fallback in settings.`;

        this.outputChannel.appendLine(`ERROR: ${errorMessage}`);

        throw new Error(errorMessage);
    }

    /**
     * Get list of available providers for UI selection
     */
    async getAvailableProviders(): Promise<Array<{ id: string; label: string; description: string; available: boolean }>> {
        const result = [];

        for (const [id, provider] of this.providers) {
            const available = await provider.authenticate();
            result.push({
                id,
                label: provider.name,
                description: available ? '✓ Available' : '✗ Not available',
                available
            });
        }

        return result;
    }

    /**
     * Check if any provider is available
     */
    async hasAvailableProvider(): Promise<boolean> {
        try {
            await this.getModel();
            return true;
        } catch {
            return false;
        }
    }
}
