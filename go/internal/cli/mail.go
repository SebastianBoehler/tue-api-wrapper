package cli

var mailRoutes = map[string]backendRoute{
	"mailboxes": {
		Path:        "/api/mail/mailboxes",
		Description: "List available mailboxes.",
	},
	"inbox": {
		Path:        "/api/mail/inbox",
		Description: "Mailbox summary. Use --query mailbox=INBOX, --query unread_only=true, --query query=..., or --query sender=....",
	},
	"message": {
		Path:        "/api/mail/messages/{uid}",
		PathArgs:    []string{"uid"},
		Description: "Fetch a single mail message. Use --query mailbox=INBOX to select the mailbox.",
	},
}

func runMail(args []string) int {
	return runBackendGroup("mail", args, mailRoutes)
}
