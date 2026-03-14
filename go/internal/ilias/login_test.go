package ilias

import "testing"

func TestIliasLoginParsers(t *testing.T) {
	loginHTML := `
	<html><body>
	  <a href="shib_login.php?target=">&gt;&gt; Login mit zentraler Universitäts-Kennung &lt;&lt;</a>
	</body></html>
	`

	shibURL, err := extractShibLoginURL(loginHTML, "https://ovidius.uni-tuebingen.de/ilias3/login.php?cmd=force_login")
	if err != nil {
		t.Fatalf("extractShibLoginURL returned error: %v", err)
	}
	if shibURL != "https://ovidius.uni-tuebingen.de/ilias3/shib_login.php?target=" {
		t.Fatalf("unexpected shib URL: %s", shibURL)
	}

	idpHTML := `
	<html><body>
	  <form action="/idp/profile/SAML2/Redirect/SSO?execution=e1s1" method="post">
	    <input name="j_username" type="text" value="" />
	    <input name="j_password" type="password" value="" />
	    <button name="_eventId_proceed" type="submit">Login</button>
	  </form>
	</body></html>
	`

	idpForm, err := extractIDPLoginForm(idpHTML, "https://idp.uni-tuebingen.de/idp/profile/SAML2/Redirect/SSO?execution=e1s1")
	if err != nil {
		t.Fatalf("extractIDPLoginForm returned error: %v", err)
	}
	if got := idpForm.ActionURL; got != "https://idp.uni-tuebingen.de/idp/profile/SAML2/Redirect/SSO?execution=e1s1" {
		t.Fatalf("unexpected idp action URL: %s", got)
	}
	if _, ok := idpForm.Payload["j_username"]; !ok {
		t.Fatalf("missing j_username field")
	}

	samlHTML := `
	<html><body>
	  <form action="https://ovidius.uni-tuebingen.de/Shibboleth.sso/SAML2/POST" method="post">
	    <input type="hidden" name="RelayState" value="relay" />
	    <input type="hidden" name="SAMLResponse" value="assertion" />
	  </form>
	</body></html>
	`

	samlForm, err := extractHiddenForm(samlHTML, "https://idp.uni-tuebingen.de/idp/profile/SAML2/Redirect/SSO?execution=e1s2", map[string]bool{
		"RelayState":   true,
		"SAMLResponse": true,
	})
	if err != nil {
		t.Fatalf("extractHiddenForm returned error: %v", err)
	}
	if got := samlForm.Payload.Get("RelayState"); got != "relay" {
		t.Fatalf("unexpected RelayState: %s", got)
	}
}
