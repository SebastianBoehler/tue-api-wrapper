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
}

export interface MailInboxSummary {
  account: string;
  mailbox: string;
  unread_count: number;
  messages: MailMessageSummary[];
}
