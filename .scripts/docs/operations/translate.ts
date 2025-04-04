import OpenAI from 'openai';
import { pick, toMerged } from '@es-toolkit/es-toolkit';
import { DocumentationItem } from '../types/DocumentationItem.ts';
import { Locale } from '../types/Locale.ts';

interface TranslateOptions {
  openAiApiKey: string;
}

export async function translate(
  doc: DocumentationItem,
  locale: Locale,
  { openAiApiKey }: TranslateOptions
): Promise<DocumentationItem> {
  const client = new OpenAI({
    apiKey: openAiApiKey,
  });

  const item = {
    description: doc.description,
    parameters: doc.parameters?.map(param => {
      return pick(param, ['document']);
    }),
    returns: pick(doc.returns! ?? {}, ['document']),
  };

  const prompt = `
Always answer in the JSON format as given in the input, without triple backticks.
Translate the following JSON to ${locale}.

If translating in Korean, write the sentence in 해요 style.
If translating in Japanese, finish the sentence in ます style.
Finish with a noun if it is a explanation for a parameter or a return value.

===
\`\`\`
${JSON.stringify(item, null, 2)}
\`\`\`
  `;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const translatedItem = response.choices[0].message.content;

  if (translatedItem == null) {
    throw new Error(`API Error while translating ${doc.name} to ${locale}.`);
  }

  const translatedDoc: DocumentationItem = JSON.parse(translatedItem);

  return toMerged(doc, translatedDoc);
}
