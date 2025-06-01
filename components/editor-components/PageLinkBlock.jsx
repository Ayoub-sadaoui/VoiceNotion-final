"use dom";

import React from "react";
import { createReactBlockSpec } from "@blocknote/react";

// Create a custom block for page links using the createReactBlockSpec API
const PageLinkBlock = createReactBlockSpec(
  {
    type: "pageLink",
    propSchema: {
      pageId: { default: "" },
      pageTitle: { default: "Untitled Page" },
      pageIcon: { default: "📄" },
    },
    content: "none", // This block doesn't allow content inside it
  },
  {
    render: (props) => {
      const { block, editor } = props;
      console.log("Rendering PageLinkBlock:", block);

      const handleClick = () => {
        // Get the onNavigateToPage from the block's meta
        const onNavigateToPage =
          editor._tiptapEditor.storage.pageLink?.onNavigateToPage;

        // Call the navigation callback
        if (onNavigateToPage && block.props.pageId) {
          console.log("Navigating to page:", block.props.pageId);
          onNavigateToPage(block.props.pageId);
        } else {
          console.warn(
            "Cannot navigate: missing pageId or navigation callback"
          );
        }
      };

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 12px",
            margin: "4px 0",
            borderRadius: "8px",
            background: "rgba(0, 120, 212, 0.1)",
            cursor: "pointer",
            border: "1px solid rgba(0, 120, 212, 0.3)",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            width: "100%",
          }}
          onClick={handleClick}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(0, 120, 212, 0.15)";
            e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.15)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(0, 120, 212, 0.1)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <div style={{ marginRight: "12px", fontSize: "18px" }}>
            {block.props.pageIcon || "📄"}
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "16px",
              fontWeight: "500",
              color: "rgba(0, 120, 212, 1)",
            }}
          >
            {block.props.pageTitle || "Untitled Page"}
          </div>
          <div
            style={{
              fontSize: "14px",
              opacity: 0.6,
              marginLeft: "8px",
              background: "rgba(0, 120, 212, 0.1)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            Open Page ↗
          </div>
        </div>
      );
    },
  }
);

export default PageLinkBlock;
