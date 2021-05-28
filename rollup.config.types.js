import dts        from 'rollup-plugin-dts';

// Rollup the TS definitions generated in ./lib and add separate typedef.d.ts and interfaces as a banner.

export default [
   {
      input: "./lib/index.d.ts",
      output: [{ file: "types/index.d.ts", format: "es" }],
      plugins: [dts()]
   },
];
