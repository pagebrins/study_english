package service

import (
	"testing"

	"study_english/backend/internal/model"
)

func TestNormalizeRequirements_Valid(t *testing.T) {
	got, err := normalizeRequirements(model.StringList{"  长度大于20个汉字 ", "围绕国家政治主题"})
	if err != nil {
		t.Fatalf("normalizeRequirements should succeed, got err: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 requirements, got %d", len(got))
	}
	if got[0] != "长度大于20个汉字" {
		t.Fatalf("expected trimmed requirement, got %q", got[0])
	}
}

func TestNormalizeRequirements_RejectsEmpty(t *testing.T) {
	_, err := normalizeRequirements(model.StringList{"有效要求", "   "})
	if err == nil {
		t.Fatal("expected error when requirement is empty")
	}
}

func TestNormalizeRequirements_RejectsTooMany(t *testing.T) {
	_, err := normalizeRequirements(model.StringList{"1", "2", "3", "4"})
	if err == nil {
		t.Fatal("expected error when requirements exceed max count")
	}
}
