package response

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestJSONContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	JSON(ctx, 200, "ok", gin.H{"value": 1})

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if _, ok := body["code"]; !ok {
		t.Fatal("missing code")
	}
	if _, ok := body["msg"]; !ok {
		t.Fatal("missing msg")
	}
	if _, ok := body["result"]; !ok {
		t.Fatal("missing result")
	}
}
