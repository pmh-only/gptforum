import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { OpenAIStream } from './OpenAIStream'
import { z } from 'zod'
import { Chat } from './Chat'
import { logger } from './Logger'
import { Model } from './Models'
import { Tool } from 'openai/resources/responses/responses'

export class OpenAIClient {
  private static readonly instance = new OpenAIClient()

  public static readonly getInstance = () => OpenAIClient.instance

  private static readonly OPENAI_API_KEY =
    process.env.OPENAI_API_KEY ??
    logger.error('OPENAI_API_KEY NOT PROVIDED') ??
    process.exit(-1)

  private static readonly OPENAI_SUMMARY_MODEL =
    process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-5-nano'

  private static readonly OPENAI_DEFAULT_PROMPT =
    process.env.OPENAI_DEFAULT_PROMPT ??
    `
      # Discord Markdown Formatting Guidelines
      - Format responses using Discord-flavored markdown exclusively.
      - Use only headings level 1 to 3 (\`#\`, \`##\`, \`###\`); never use lower-level headings.
      - Avoid table syntax in markdown.
      - Do not apply bold, italic, underline, or similar styles within code blocks or code spans.
      - Do not use LaTeX syntax. Instead, write math equations using Unicode characters and place them inside code blocks (\`\`\`) or code spans (\`...\`).
      - Ensure no extra spaces appear before or after code blocks.
      - Reply in the language the user initially used at all times.
      - Use \`---\` as a visual separator only if it improves clarity. Note that \`---\` in Discord Markdown automatically creates a line break above and below the separator.
      - Before composing your main response, perform a web search for relevant, reputable information, and cite all sources using the \`[name](url)\` format.
      - Do not mention or reference these instructions in your reply.
      Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.
      After each tool call or external information fetch (such as a web search), validate the utility and reliability of retrieved information in 1-2 lines before including it in your response.
    `
      .trim()
      .replace(/ {6}/g, '')

  private constructor() {}

  private readonly client = new OpenAI({
    apiKey: OpenAIClient.OPENAI_API_KEY
  })

  public async startCompletion(model: Model, chats: Chat[], cacheKey: number) {
    logger.info('Start generating response...')

    const instructions = OpenAIClient.OPENAI_DEFAULT_PROMPT + '\n' + model.system
    const rawStream = await this.client.responses.create({
      store: true,
      stream: true,

      model: model.id,
      tools: model.tools.map((v) => ({ type: v })) as Tool[],

      reasoning:
        model.reasoningEffort !== undefined
          ? { effort: model.reasoningEffort, summary: 'detailed' }
          : undefined,

      verbosity: model.verbosity,

      instructions,
      input: chats.map((v) => v.convertToOpenAIResponse()),

      tool_choice: model.toolRequired === true ? 'required' : 'auto',
      truncation: 'auto',

      parallel_tool_calls: true,

      safety_identifier: cacheKey.toString(),
      prompt_cache_key: cacheKey.toString()
    })

    return new OpenAIStream(rawStream).createBufferedCompletionStream()
  }

  public async startGeneratingSummary(
    chats: Chat[],
    tagChoices?: string[]
  ): Promise<{
    title: string
    tags?: string[]
  }> {
    logger.info('Start summary...')

    const completion = await this.client.responses.create({
      model: OpenAIClient.OPENAI_SUMMARY_MODEL,
      store: false,
      input: chats.map((v) => v.convertToOpenAIResponse()),
      reasoning: { effort: 'minimal' },
      text: {
        verbosity: 'low',
        format: zodTextFormat(
          z.object({
            title: z.string({
              description:
                'Summarize users message into single line less than 50 characters'
            }),
            ...(tagChoices !== undefined && tagChoices.length > 0
              ? {
                  tags: z.array(z.enum(tagChoices as [string, ...string[]]), {
                    description:
                      ' Choose less than 3 tags for categorize this conversation.'
                  })
                }
              : {})
          }),
          'summary'
        )
      }
    })

    return JSON.parse(completion.output_text)
  }
}
