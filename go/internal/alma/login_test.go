package alma

import "testing"

func TestExtractLoginForm(t *testing.T) {
	html := `
	<html>
	  <body class="notloggedin">
	    <form id="loginForm" action="https://alma.uni-tuebingen.de:443/alma/rds?state=user&amp;type=1&amp;category=auth.login">
	      <input type="hidden" name="userInfo" value="" />
	      <input type="hidden" name="ajax-token" value="token-123" />
	      <input type="text" name="asdf" value="" />
	      <input type="password" name="fdsa" value="" />
	      <button type="submit" name="submit"></button>
	    </form>
	  </body>
	</html>
	`

	form, err := extractLoginForm(html, "https://alma.uni-tuebingen.de/alma/pages/cs/sys/portal/hisinoneStartPage.faces")
	if err != nil {
		t.Fatalf("extractLoginForm returned error: %v", err)
	}

	if got := form.ActionURL; got != "https://alma.uni-tuebingen.de:443/alma/rds?state=user&type=1&category=auth.login" {
		t.Fatalf("unexpected action URL: %s", got)
	}
	if got := form.Payload.Get("ajax-token"); got != "token-123" {
		t.Fatalf("unexpected ajax-token: %q", got)
	}
	if !looksLoggedOut(html) {
		t.Fatalf("expected login page to be detected as logged out")
	}
}
