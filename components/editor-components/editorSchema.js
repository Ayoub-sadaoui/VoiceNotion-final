"use dom";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import PageLinkBlock from "./PageLinkBlock";

// Create custom schema with our custom blocks
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLinkBlock,
  },
});

export default schema;
