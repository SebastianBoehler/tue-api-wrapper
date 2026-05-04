export interface MailboxSummary {
  name: string;
  label: string;
  special_use?: string | null;
  message_count?: number | null;
  unread_count?: number | null;
}

export interface MailMessageSummary {
  uid: string;
  subject: string;
  from_name?: string | null;
  from_address?: string | null;
  received_at?: string | null;
  preview?: string | null;
  is_unread: boolean;
  is_approved_broadcast?: boolean;
}

export interface MailInboxSummary {
  account: string;
  mailbox: string;
  unread_count: number;
  messages: MailMessageSummary[];
}

export interface MailMessageDetail {
  uid: string;
  mailbox: string;
  subject: string;
  from_name?: string | null;
  from_address?: string | null;
  to_recipients: string[];
  cc_recipients: string[];
  received_at?: string | null;
  preview?: string | null;
  body_text?: string | null;
  attachment_names: string[];
  is_unread: boolean;
  is_approved_broadcast?: boolean;
}
