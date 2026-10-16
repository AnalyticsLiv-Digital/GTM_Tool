export type SchemaField = {
  fieldName: string;
  fieldType?: string;
  required?: boolean;
  description?: string;
  selector?: string;
  selectorType?: "id" | "class";
};

export type EventSchema = {
  eventName: string;
  eventCategory: string;
  eventAction: string;
  event?: string;
  fields: SchemaField[];
};

export type ParsedSchema = {
  events: EventSchema[];
};

export type WebsiteSelector = {
  fieldName: string;
  selector: string;
  selectorType: "id" | "class";
  matched: boolean;
  elementText?: string;
  elementTag?: string;
};

export type GeneratedVariable = {
  name: string;
  type: "dataLayer";
  dataLayerVariableName: string;
};

export type GeneratedTrigger = {
  name: string;
  type: "customEvent";
  customEventName: string;
};

export type GeneratedTag = {
  name: string;
  type: "ga4";
  eventName: string;
  eventParameters: {
    name: string;
    value: string;
  }[];
  triggerName: string;
};

export type GeneratedDataLayer = {
  event: "custom";
  eventName: string;
  eventCategory: string;
  eventAction: string;
  [key: string]: unknown;
};

export type AutomationResult = {
  events: EventSchema[];
  dataLayerPushes: GeneratedDataLayer[];
  variables: GeneratedVariable[];
  triggers: GeneratedTrigger[];
  tags: GeneratedTag[];
  selectors: WebsiteSelector[];
};