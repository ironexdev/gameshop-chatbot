export type ChatbotOptions = {
  endpoint: string;
  storeName?: string;
  avatarUrl?: string;
  primaryColor?: string;
  greeting?: string;
  quickActions?: string[];
};

export type UiMessage = {
  role: "user" | "bot";
  text: string;
};
