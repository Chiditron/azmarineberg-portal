export interface ServiceStatusDefinition {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  requires_approval_effective_date: boolean;
  is_terminal: boolean;
  is_active: boolean;
}

export interface ServiceStatusMeta {
  label: string;
  requires_approval_effective_date: boolean;
  is_terminal: boolean;
}
