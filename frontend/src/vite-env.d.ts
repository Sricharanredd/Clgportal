/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_OPEN_PARENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
