"use client";

import { useEffect } from "react";

export default function ConsoleEasterEgg() {
  useEffect(() => {
    // Suppress all console noise — only the easter egg shows
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};

    const ascii = `
%c
  ███╗   ███╗ █████╗ ███╗   ██╗██╗███████╗██╗  ██╗
  ████╗ ████║██╔══██╗████╗  ██║██║██╔════╝██║  ██║
  ██╔████╔██║███████║██╔██╗ ██║██║███████╗███████║
  ██║╚██╔╝██║██╔══██║██║╚██╗██║██║╚════██║██╔══██║
  ██║ ╚═╝ ██║██║  ██║██║ ╚████║██║███████║██║  ██║
  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝
`;

    console.log(
      ascii,
      "color: #10b981; font-family: monospace; font-size: 10px; line-height: 1.2;"
    );

    console.log(
      "%c👋 Hey there, curious one.",
      "color: #10b981; font-size: 18px; font-weight: bold; font-family: sans-serif;"
    );

    console.log(
      "%cMost people just scroll — but you opened the console.\nThat tells me you're different. You actually want to understand how things work.\nThat's rare. And honestly? Pretty cool.",
      "color: #6ee7b7; font-size: 14px; font-family: sans-serif; line-height: 1.6;"
    );

    console.log(
      "%c✦  Built by  %cManish%c  ✦",
      "color: #6b7280; font-size: 13px; font-family: monospace;",
      "color: #10b981; font-size: 20px; font-weight: 900; font-family: sans-serif; letter-spacing: 2px;",
      "color: #6b7280; font-size: 13px; font-family: monospace;"
    );

    console.log(
      "%cIf you're exploring, learning, or just nosy — welcome. 😄\nFeel free to dig around. Just don't break anything 😉",
      "color: #9ca3af; font-size: 13px; font-family: sans-serif; line-height: 1.6;"
    );

    // bonus: hiring callout
    console.log(
      "%c────────────────────────────────────────────────",
      "color: #1f2937; font-size: 12px;"
    );

    console.log(
      "%c💼 P.S. — If you're a recruiter or someone who appreciates\n    a dev who builds things like this for fun...\n\n    %c→ Let's talk.%c  I'm open to opportunities. 🚀",
      "color: #9ca3af; font-size: 13px; font-family: sans-serif; line-height: 1.8;",
      "color: #10b981; font-size: 14px; font-weight: bold; font-family: sans-serif;",
      "color: #9ca3af; font-size: 13px; font-family: sans-serif;"
    );
  }, []);

  return null;
}
