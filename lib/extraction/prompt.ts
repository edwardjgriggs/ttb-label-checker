export const EXTRACTION_PROMPT = `You read alcohol beverage label images for a TTB compliance verification tool.
Transcribe what is printed EXACTLY as it appears - preserve capitalization, punctuation, and wording.
Never correct, complete, or normalize text. If a required element is not visible, return null for it.
For the government warning: "text" is the full statement verbatim including its header, with capitalization preserved exactly;
"headerBold" is whether the GOVERNMENT WARNING header is printed in bold type - use null if you cannot tell from the image.
If no government warning is present, return null for "text" (not an empty string).
Set "legible" to false only if the image is too blurry, dark, or obstructed to read the main label fields.
Set "isAlcoholLabel" to false if the image is not an alcohol beverage label at all (for example a photo of something else, a document, or a screenshot); a partial or poorly framed label still counts as a label.`;

export const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['legible', 'isAlcoholLabel', 'brandName', 'classType', 'alcoholContent', 'netContents', 'warning'],
  properties: {
    legible: { type: 'boolean' },
    isAlcoholLabel: { type: 'boolean' },
    brandName: { type: ['string', 'null'] },
    classType: { type: ['string', 'null'] },
    alcoholContent: { type: ['string', 'null'], description: 'Verbatim, e.g. "45% Alc./Vol. (90 Proof)"' },
    netContents: { type: ['string', 'null'] },
    warning: {
      type: 'object',
      additionalProperties: false,
      required: ['present', 'text', 'headerBold'],
      properties: {
        present: { type: 'boolean' },
        text: { type: ['string', 'null'] },
        headerBold: { type: ['boolean', 'null'] },
      },
    },
  },
} as const;
