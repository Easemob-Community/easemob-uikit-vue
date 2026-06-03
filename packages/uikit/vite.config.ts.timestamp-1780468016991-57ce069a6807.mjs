// vite.config.ts
import { defineConfig } from "file:///Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-vue/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.39/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-vue/node_modules/.pnpm/@vitejs+plugin-vue@4.6.2_vite@5.4.21_@types+node@20.19.39__vue@3.5.34_typescript@5.9.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import dts from "file:///Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-vue/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.19.39_rollup@4.60.3_typescript@5.9.3_vite@5.4.21_@types+node@20.19.39_/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";
var __vite_injected_original_dirname = "/Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-vue/packages/uikit";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      outDir: "dist"
    })
  ],
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "EasemobUIKit",
      formats: ["es", "umd"],
      fileName: (format) => `easemob-uikit.${format === "es" ? "js" : "umd.cjs"}`
    },
    rollupOptions: {
      external: ["vue", "pinia", "im-sdk-web"],
      output: {
        // 同时存在命名导出与 default 导出时，显式声明使用命名导出策略，
        // 避免 Rollup 警告 "Consumers will have to use `EasemobUIKit.default`"。
        // 由于 install 也是命名导出，UMD 用户可直接 `app.use(EasemobUIKit)`。
        exports: "named",
        globals: {
          vue: "Vue",
          pinia: "Pinia",
          "im-sdk-web": "Easemob"
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "theme/index.css";
          return assetInfo.name || "assets/[name][extname]";
        }
      }
    },
    outDir: "dist",
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbmVvaHVhbmcvRGVza3RvcC9Xb3JrQ29tbW9uVXNlL1VJS0lUL2Vhc2Vtb2ItdWlraXQtdnVlL3BhY2thZ2VzL3Vpa2l0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbmVvaHVhbmcvRGVza3RvcC9Xb3JrQ29tbW9uVXNlL1VJS0lUL2Vhc2Vtb2ItdWlraXQtdnVlL3BhY2thZ2VzL3Vpa2l0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9uZW9odWFuZy9EZXNrdG9wL1dvcmtDb21tb25Vc2UvVUlLSVQvZWFzZW1vYi11aWtpdC12dWUvcGFja2FnZXMvdWlraXQvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHZ1ZSgpLFxuICAgIGR0cyh7XG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgfSksXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgIG5hbWU6ICdFYXNlbW9iVUlLaXQnLFxuICAgICAgZm9ybWF0czogWydlcycsICd1bWQnXSxcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0OiBzdHJpbmcpID0+IGBlYXNlbW9iLXVpa2l0LiR7Zm9ybWF0ID09PSAnZXMnID8gJ2pzJyA6ICd1bWQuY2pzJ31gLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsndnVlJywgJ3BpbmlhJywgJ2ltLXNkay13ZWInXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICAvLyBcdTU0MENcdTY1RjZcdTVCNThcdTU3MjhcdTU0N0RcdTU0MERcdTVCRkNcdTUxRkFcdTRFMEUgZGVmYXVsdCBcdTVCRkNcdTUxRkFcdTY1RjZcdUZGMENcdTY2M0VcdTVGMEZcdTU4RjBcdTY2MEVcdTRGN0ZcdTc1MjhcdTU0N0RcdTU0MERcdTVCRkNcdTUxRkFcdTdCNTZcdTc1NjVcdUZGMENcbiAgICAgICAgLy8gXHU5MDdGXHU1MTREIFJvbGx1cCBcdThCNjZcdTU0NEEgXCJDb25zdW1lcnMgd2lsbCBoYXZlIHRvIHVzZSBgRWFzZW1vYlVJS2l0LmRlZmF1bHRgXCJcdTMwMDJcbiAgICAgICAgLy8gXHU3NTMxXHU0RThFIGluc3RhbGwgXHU0RTVGXHU2NjJGXHU1NDdEXHU1NDBEXHU1QkZDXHU1MUZBXHVGRjBDVU1EIFx1NzUyOFx1NjIzN1x1NTNFRlx1NzZGNFx1NjNBNSBgYXBwLnVzZShFYXNlbW9iVUlLaXQpYFx1MzAwMlxuICAgICAgICBleHBvcnRzOiAnbmFtZWQnLFxuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgdnVlOiAnVnVlJyxcbiAgICAgICAgICBwaW5pYTogJ1BpbmlhJyxcbiAgICAgICAgICAnaW0tc2RrLXdlYic6ICdFYXNlbW9iJyxcbiAgICAgICAgfSxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm86IHsgbmFtZT86IHN0cmluZyB9KSA9PiB7XG4gICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lID09PSAnc3R5bGUuY3NzJykgcmV0dXJuICd0aGVtZS9pbmRleC5jc3MnXG4gICAgICAgICAgcmV0dXJuIGFzc2V0SW5mby5uYW1lIHx8ICdhc3NldHMvW25hbWVdW2V4dG5hbWVdJ1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGNzc0NvZGVTcGxpdDogZmFsc2UsXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgIH0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixPQUFPLFNBQVM7QUFDaEIsU0FBUyxlQUFlO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLElBQUk7QUFBQSxNQUNGLGtCQUFrQjtBQUFBLE1BQ2xCLFFBQVE7QUFBQSxJQUNWLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxLQUFLO0FBQUEsTUFDSCxPQUFPLFFBQVEsa0NBQVcsY0FBYztBQUFBLE1BQ3hDLE1BQU07QUFBQSxNQUNOLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUNyQixVQUFVLENBQUMsV0FBbUIsaUJBQWlCLFdBQVcsT0FBTyxPQUFPLFNBQVM7QUFBQSxJQUNuRjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVSxDQUFDLE9BQU8sU0FBUyxZQUFZO0FBQUEsTUFDdkMsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSU4sU0FBUztBQUFBLFFBQ1QsU0FBUztBQUFBLFVBQ1AsS0FBSztBQUFBLFVBQ0wsT0FBTztBQUFBLFVBQ1AsY0FBYztBQUFBLFFBQ2hCO0FBQUEsUUFDQSxnQkFBZ0IsQ0FBQyxjQUFpQztBQUNoRCxjQUFJLFVBQVUsU0FBUyxZQUFhLFFBQU87QUFDM0MsaUJBQU8sVUFBVSxRQUFRO0FBQUEsUUFDM0I7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLElBQ1IsY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
