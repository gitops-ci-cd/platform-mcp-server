import { z } from "zod";
import { ToolDefinition } from "./registry.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  return {
    result: {
      greeting: `Hello, ${args.name}!`,
      message: "Here's a fun story about Earth's origins:",
    },
    content: [
      {
        type: "text",
        text: `Once upon a cosmic time, about 4.5 billion years ago, a cloud of gas and dust swirled in the vastness of space.

This wasn't just any cloud - it was the remnant of an ancient supernova, containing the scattered atoms of long-dead stars. As gravity pulled this cosmic dust together, our sun ignited at the center, and the remaining material began to clump.

One such clump, third from the sun, was special. Neither too hot nor too cold, this "Goldilocks" planet had just the right conditions. Comets and asteroids bombarded the young Earth, delivering water and complex molecules.

In the primordial seas, under lightning-filled skies, simple molecules combined into more complex ones. These eventually formed the first primitive cells - the great-great-grandparents of all life on Earth.

From those humble beginnings arose an incredible diversity of life, from dinosaurs to daisies, from mammoths to mankind. And here we are now, made of stardust, telling stories about our cosmic origins.

So when you say "Hello World," remember you're actually greeting a remarkable planet with a 4.5-billion-year history, formed from the remnants of ancient stars!`,
      },
    ],
  };
};

export const helloWorldTool: ToolDefinition = {
  name: "Hello World",
  description: "A simple greeting tool that tells the story of Earth's origins",
  inputSchema: z.object({
    name: z.string().optional().describe("The name to greet").default("World"),
  }),
  callback,
  // No permissions required - everyone can say hello!
};
