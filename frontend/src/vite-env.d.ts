/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GIT_BRANCH?: string;
  readonly VITE_GIT_COMMIT?: string;
  readonly VITE_GIT_COMMIT_DATE?: string;
  readonly VITE_BUILD_TIME?: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
