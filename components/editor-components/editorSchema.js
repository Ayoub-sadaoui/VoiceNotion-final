"use dom";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import PageLinkBlock from "./PageLinkBlock";
import ImageGeneratorBlock from "./ImageGeneratorBlock";

// Create custom schema with our custom blocks
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLinkBlock,
    imageGenerator: ImageGeneratorBlock,
  },
});

export default schema;
