
// Interface defining the supported actions for the SDUI system.
export interface Action {
  type: 'NAVIGATE' | 'OPEN_URL' | 'SHOW_TOAST' | 'LOGOUT' | 'SHARE' | 'SHOW_INTERSTITIAL' | 'SHOW_REWARDED';
  payload: any;
}

export interface WidgetConfig {
  id: string;
  type: string; // e.g., "HERO", "BUTTON_GROUP", "LIST_ITEM"
  props: Record<string, any>;
  action?: Action;
}

export interface PageConfig {
  title: string;
  layout: WidgetConfig[];
  style?: Record<string, any>;
}

export interface AppMetadata {
  min_version: string;
  force_update: boolean;
  update_url: string;
  theme: Record<string, string>;
}
