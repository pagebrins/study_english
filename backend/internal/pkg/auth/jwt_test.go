package auth

import "testing"

func TestTokenLifecycle(t *testing.T) {
	token, err := GenerateToken(9, "secret")
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}
	claims, err := ParseToken(token, "secret")
	if err != nil {
		t.Fatalf("parse token failed: %v", err)
	}
	if claims.UserID != 9 {
		t.Fatalf("unexpected user id: %d", claims.UserID)
	}
}
