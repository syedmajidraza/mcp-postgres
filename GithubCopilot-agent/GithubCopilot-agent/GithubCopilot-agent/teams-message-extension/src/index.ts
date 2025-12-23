import * as restify from 'restify';
import {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    TurnContext,
    ActivityTypes,
    MessagingExtensionQuery,
    MessagingExtensionResponse,
    MessagingExtensionAction,
    CardFactory
} from 'botbuilder';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL MCP Server configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

// Bot Framework configuration
const botId = process.env.BOT_ID || '';
const botPassword = process.env.BOT_PASSWORD || '';

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: botId,
    MicrosoftAppPassword: botPassword,
    MicrosoftAppType: 'MultiTenant'
});

const adapter = new CloudAdapter(credentialsFactory);

// Error handling
adapter.onTurnError = async (context: TurnContext, error: Error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log(`MCP Server URL: ${MCP_SERVER_URL}`);
});

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, async (context) => {
        if (context.activity.type === ActivityTypes.Invoke) {
            const invokeActivity = context.activity;

            // Handle messaging extension queries
            if (invokeActivity.name === 'composeExtension/query') {
                const query = invokeActivity.value as MessagingExtensionQuery;
                const response = await handleMessagingExtensionQuery(query);

                await context.sendActivity({
                    type: 'invokeResponse',
                    value: {
                        status: 200,
                        body: response
                    }
                });
            }
            // Handle messaging extension actions
            else if (invokeActivity.name === 'composeExtension/fetchTask') {
                const action = invokeActivity.value as MessagingExtensionAction;
                const response = await handleMessagingExtensionAction(action);

                await context.sendActivity({
                    type: 'invokeResponse',
                    value: {
                        status: 200,
                        body: response
                    }
                });
            }
        }
    });
});

/**
 * Handle messaging extension queries
 */
async function handleMessagingExtensionQuery(query: MessagingExtensionQuery): Promise<MessagingExtensionResponse> {
    const commandId = query.commandId;
    const parameters = query.parameters || [];

    try {
        switch (commandId) {
            case 'queryDatabase':
                return await handleQueryDatabase(parameters);

            case 'describeTable':
                return await handleDescribeTable(parameters);

            default:
                return {
                    composeExtension: {
                        type: 'result',
                        attachmentLayout: 'list',
                        attachments: [createErrorCard('Unknown command')]
                    }
                };
        }
    } catch (error) {
        console.error('Error handling query:', error);
        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [createErrorCard(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)]
            }
        };
    }
}

/**
 * Handle messaging extension actions
 */
async function handleMessagingExtensionAction(action: MessagingExtensionAction): Promise<any> {
    const commandId = action.commandId;

    try {
        switch (commandId) {
            case 'listTables':
                return await handleListTables();

            default:
                return {
                    task: {
                        type: 'message',
                        value: 'Unknown command'
                    }
                };
        }
    } catch (error) {
        console.error('Error handling action:', error);
        return {
            task: {
                type: 'message',
                value: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        };
    }
}

/**
 * Handle database queries
 */
async function handleQueryDatabase(parameters: any[]): Promise<MessagingExtensionResponse> {
    const queryParam = parameters.find(p => p.name === 'query');
    const userQuery = queryParam?.value || '';

    if (!userQuery) {
        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [createErrorCard('Please provide a query')]
            }
        };
    }

    try {
        // Call MCP server to execute query
        const response = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
            name: 'query_database',
            arguments: { query: userQuery }
        });

        const results = response.data;

        // Format results as Adaptive Card
        const card = createResultsCard(userQuery, results);

        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [card]
            }
        };
    } catch (error) {
        console.error('Database query error:', error);
        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [createErrorCard(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)]
            }
        };
    }
}

/**
 * Handle table description
 */
async function handleDescribeTable(parameters: any[]): Promise<MessagingExtensionResponse> {
    const tableParam = parameters.find(p => p.name === 'tableName');
    const tableName = tableParam?.value || '';

    if (!tableName) {
        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [createErrorCard('Please provide a table name')]
            }
        };
    }

    try {
        // Call MCP server to describe table
        const response = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
            name: 'describe_table',
            arguments: { table_name: tableName }
        });

        const schema = response.data;

        // Format schema as Adaptive Card
        const card = createSchemaCard(tableName, schema);

        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [card]
            }
        };
    } catch (error) {
        console.error('Describe table error:', error);
        return {
            composeExtension: {
                type: 'result',
                attachmentLayout: 'list',
                attachments: [createErrorCard(`Failed to describe table: ${error instanceof Error ? error.message : 'Unknown error'}`)]
            }
        };
    }
}

/**
 * Handle list tables action
 */
async function handleListTables(): Promise<any> {
    try {
        // Call MCP server to list tables
        const response = await axios.post(`${MCP_SERVER_URL}/mcp/v1/tools/call`, {
            name: 'list_tables',
            arguments: {}
        });

        const tables = response.data;

        // Format tables as Adaptive Card
        const card = createTablesCard(tables);

        return {
            task: {
                type: 'continue',
                value: {
                    card: card.content,
                    title: 'Database Tables'
                }
            }
        };
    } catch (error) {
        console.error('List tables error:', error);
        return {
            task: {
                type: 'message',
                value: `Failed to list tables: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        };
    }
}

/**
 * Create an error card
 */
function createErrorCard(errorMessage: string): any {
    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
            {
                type: 'TextBlock',
                text: 'Error',
                weight: 'bolder',
                size: 'large',
                color: 'attention'
            },
            {
                type: 'TextBlock',
                text: errorMessage,
                wrap: true
            }
        ]
    });
}

/**
 * Create a results card
 */
function createResultsCard(query: string, results: any): any {
    const rows = Array.isArray(results) ? results : [results];

    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
            {
                type: 'TextBlock',
                text: 'Query Results',
                weight: 'bolder',
                size: 'large'
            },
            {
                type: 'TextBlock',
                text: `Query: ${query}`,
                wrap: true,
                isSubtle: true
            },
            {
                type: 'TextBlock',
                text: `${rows.length} row(s) returned`,
                spacing: 'medium'
            },
            {
                type: 'Container',
                items: rows.slice(0, 10).map((row: any) => ({
                    type: 'FactSet',
                    facts: Object.keys(row).map(key => ({
                        title: key,
                        value: String(row[key])
                    }))
                }))
            }
        ]
    });
}

/**
 * Create a schema card
 */
function createSchemaCard(tableName: string, schema: any): any {
    const columns = Array.isArray(schema) ? schema : [];

    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
            {
                type: 'TextBlock',
                text: `Table: ${tableName}`,
                weight: 'bolder',
                size: 'large'
            },
            {
                type: 'TextBlock',
                text: `${columns.length} column(s)`,
                spacing: 'medium'
            },
            {
                type: 'Container',
                items: columns.map((col: any) => ({
                    type: 'FactSet',
                    facts: [
                        { title: 'Column', value: col.column_name || col.name },
                        { title: 'Type', value: col.data_type || col.type },
                        { title: 'Nullable', value: col.is_nullable || 'N/A' }
                    ]
                }))
            }
        ]
    });
}

/**
 * Create a tables list card
 */
function createTablesCard(tables: any): any {
    const tableList = Array.isArray(tables) ? tables : [];

    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
            {
                type: 'TextBlock',
                text: 'Database Tables',
                weight: 'bolder',
                size: 'large'
            },
            {
                type: 'TextBlock',
                text: `${tableList.length} table(s) found`,
                spacing: 'medium'
            },
            {
                type: 'Container',
                items: tableList.map((table: any) => ({
                    type: 'TextBlock',
                    text: `- ${typeof table === 'string' ? table : table.name}`,
                    wrap: true
                }))
            }
        ]
    });
}
